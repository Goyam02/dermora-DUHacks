from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timedelta
from uuid import UUID
from PIL import Image
import io
import uuid as uuid_lib

from app.core.database import get_db
from app.entities.skin_image import SkinImage
from app.entities.skin_diagnosis import SkinDiagnosis
from app.schemas.skin import (
    SkinImageUploadResponse,
    SkinAnalysisResult,
    SkinComparisonResult,
    SkinProgressSummary
)
from app.services.storage import StorageService
from app.services.azure_vision import AzureVisionService
from app.models.inference import run_skin_inference  # Your existing DINOv2 function

router = APIRouter(prefix="/skin", tags=["Skin Analysis"])
storage = StorageService()
vision_service = AzureVisionService()


# ============================================================================
# ENDPOINT 1: /infer endpoint (for skin disease detection)
# ============================================================================
@router.post("/infer")
async def diagnose_skin(file: UploadFile = File(...)):
    """
    Legacy endpoint: POST an image → {prediction, confidence}
    This is your existing endpoint - keeping it for backward compatibility.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        img_bytes = await file.read()
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")

    result = run_skin_inference(pil_img)

    return {
        "inference_id": str(uuid_lib.uuid4()),
        "prediction": result["prediction"],
        "confidence": result["confidence"]
    }


# ============================================================================
# ENDPOINT 2: NEW - Upload with database storage + Azure Vision
# ============================================================================
@router.post("/upload", response_model=SkinImageUploadResponse)
async def upload_and_analyze(
    file: UploadFile = File(...),
    user_id: str = "test-user",  # TODO: Replace with Clerk auth
    image_type: str = "weekly",
    db: AsyncSession = Depends(get_db)
):
    """
    Upload skin image, run ML inference, store in DB, and analyze with Azure Vision.
    
    - **file**: Image file (jpg, png)
    - **user_id**: User ID (from Clerk auth later)
    - **image_type**: 'before', 'progress', or 'after'
    """
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Save image file to disk
    file_path = await storage.save_image(file, user_id)
    
    # Run DINOv2 inference (your existing model)
    try:
        # Reset file pointer for inference
        await file.seek(0)
        img_bytes = await file.read()
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        inference_result = run_skin_inference(pil_img)
        prediction = inference_result["prediction"]
        confidence = inference_result["confidence"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML inference failed: {str(e)}")
    
    # Run Azure Vision analysis (optional - fallback if fails)
    azure_analysis = None
    try:
        azure_analysis = await vision_service.analyze_single_image(file_path)
    except Exception as e:
        print(f"Azure Vision analysis failed (non-critical): {e}")
    
    # Store image record
    skin_image = SkinImage(
        user_id=UUID(user_id) if user_id != "test-user" else UUID("00000000-0000-0000-0000-000000000000"),
        image_url=file_path,
        image_type=image_type,
        captured_at=datetime.utcnow()
    )
    db.add(skin_image)
    await db.flush()
    
    # Store diagnosis
    diagnosis = SkinDiagnosis(
        skin_image_id=skin_image.id,
        prediction=prediction,
        confidence=confidence,
        model_version="v1"
    )
    db.add(diagnosis)
    await db.commit()
    await db.refresh(skin_image)
    
    message = "Image uploaded and analyzed successfully"
    if azure_analysis:
        message += f". Severity: {azure_analysis['severity_score']}/100"
    
    return SkinImageUploadResponse(
        image_id=skin_image.id,
        image_url=file_path,
        prediction=prediction,
        confidence=confidence,
        captured_at=skin_image.captured_at,
        message=message
    )


# ============================================================================
# ENDPOINT 3: Analyze existing image with Azure Vision
# ============================================================================
@router.post("/analyze/{image_id}", response_model=SkinAnalysisResult)
async def analyze_existing_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-analyze an existing stored image with Azure Vision.
    """
    
    result = await db.execute(
        select(SkinImage).where(SkinImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        analysis = await vision_service.analyze_single_image(image.image_url)
        return SkinAnalysisResult(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Azure Vision analysis failed: {str(e)}")


# ============================================================================
# ENDPOINT 4: Compare two images
# ============================================================================
@router.post("/compare", response_model=SkinComparisonResult)
async def compare_two_images(
    before_image_id: UUID,
    after_image_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Compare two skin images using Azure Vision.
    
    - **before_image_id**: Earlier image UUID
    - **after_image_id**: Recent image UUID
    """
    
    # Fetch both images
    result = await db.execute(
        select(SkinImage).where(
            SkinImage.id.in_([before_image_id, after_image_id])
        )
    )
    images = {img.id: img for img in result.scalars().all()}
    
    if len(images) != 2:
        raise HTTPException(status_code=404, detail="One or both images not found")
    
    before_img = images[before_image_id]
    after_img = images[after_image_id]
    
    # Ensure chronological order
    if before_img.captured_at > after_img.captured_at:
        raise HTTPException(
            status_code=400,
            detail="Before image must be captured earlier than after image"
        )
    
    # Run Azure Vision comparison
    try:
        comparison = await vision_service.compare_images(
            before_img.image_url,
            after_img.image_url
        )
        
        return SkinComparisonResult(
            **comparison,
            before_image_id=str(before_image_id),
            after_image_id=str(after_image_id),
            comparison_date=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


# ============================================================================
# ENDPOINT 5: Get weekly progress with automatic comparisons
# ============================================================================
@router.get("/progress/{user_id}/comparison")
async def get_weekly_comparison(
    user_id: UUID,
    weeks: int = 4,
    db: AsyncSession = Depends(get_db)
):
    """
    Get week-by-week comparison for a user.
    Automatically compares consecutive images.
    """
    
    # Get all images for user in time range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(weeks=weeks)
    
    result = await db.execute(
        select(SkinImage)
        .where(
            and_(
                SkinImage.user_id == user_id,
                SkinImage.captured_at >= start_date,
                SkinImage.captured_at <= end_date
            )
        )
        .order_by(SkinImage.captured_at.asc())
    )
    images = result.scalars().all()
    
    if len(images) < 2:
        return {
            "message": "Need at least 2 images for comparison",
            "images_found": len(images),
            "comparisons": []
        }
    
    # Compare consecutive images
    comparisons = []
    for i in range(len(images) - 1):
        try:
            comparison = await vision_service.compare_images(
                images[i].image_url,
                images[i + 1].image_url
            )
            comparisons.append({
                "week": i + 1,
                "from_date": images[i].captured_at.isoformat(),
                "to_date": images[i + 1].captured_at.isoformat(),
                "improvement": comparison["improvement_percentage"],
                "severity_change": comparison["severity_change"],
                "summary": comparison["detailed_analysis"]
            })
        except Exception as e:
            print(f"Comparison {i} failed: {e}")
            continue
    
    # Calculate overall trend
    if comparisons:
        avg_improvement = sum(c["improvement"] for c in comparisons) / len(comparisons)
        trend = "improving" if avg_improvement > 0 else "stable" if avg_improvement > -5 else "worsening"
    else:
        avg_improvement = 0
        trend = "unknown"
    
    return {
        "user_id": str(user_id),
        "period": f"{weeks} weeks",
        "total_images": len(images),
        "comparisons_made": len(comparisons),
        "average_improvement": round(avg_improvement, 2),
        "overall_trend": trend,
        "weekly_comparisons": comparisons
    }


# ============================================================================
# ENDPOINT 6: Delete a skin image
# ============================================================================
@router.delete("/image/{image_id}")
async def delete_skin_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a skin image and its diagnosis."""
    
    result = await db.execute(
        select(SkinImage).where(SkinImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete file from storage
    storage.delete_image(image.image_url)
    
    # Delete DB record (cascade will handle diagnosis)
    await db.delete(image)
    await db.commit()
    
    return {
        "message": "Image deleted successfully",
        "image_id": str(image_id)
    }
