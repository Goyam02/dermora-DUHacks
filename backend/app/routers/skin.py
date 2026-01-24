from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, delete
from datetime import datetime, timedelta
from uuid import UUID
from PIL import Image
import io, os
import uuid as uuid_lib

from app.core.database import get_db
from app.entities.skin_image import SkinImage
from app.entities.skin_diagnosis import SkinDiagnosis
from app.entities.improvement_record import ImprovementRecord
from app.entities.user import User

from app.schemas.skin import (
    SkinImageUploadResponse,
    SkinAnalysisResult,
    SkinComparisonResult,
    ImprovementTrackerResponse,
)

from app.services.storage import StorageService
from app.services.azure_vision import AzureVisionService
from app.models.inference import run_skin_inference
from app.services.improvement_analyzer import ImprovementAnalyzer


router = APIRouter(prefix="/skin", tags=["Skin Analysis"])
storage = StorageService()
vision_service = AzureVisionService()
improvement_analyzer = ImprovementAnalyzer()

# ============================================================================
# 🔐 UUID USER DEPENDENCY (CORE FIX)
# ============================================================================

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> User:
    """
    Extract UUID from header and fetch user.
    """
    try:
        user_uuid = UUID(x_user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user UUID")

    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "User does not exist")

    return user


# ============================================================================
# ENDPOINT 1: /infer (legacy, no auth)
# ============================================================================

@router.post("/infer")
async def diagnose_skin(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid image file")

    img_bytes = await file.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    result = run_skin_inference(pil_img)

    return {
        "inference_id": str(uuid_lib.uuid4()),
        "prediction": result["prediction"],
        "confidence": result["confidence"],
    }


# ============================================================================
# ENDPOINT 2: UPLOAD + ANALYZE (FIXED)
# ============================================================================

@router.post("/upload", response_model=SkinImageUploadResponse)
async def upload_and_analyze(
    file: UploadFile = File(...),
    image_type: str = "weekly",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid image file")

    # Save file
    file_path = await storage.save_image(file, str(user.id))

    # ML inference
    await file.seek(0)
    img_bytes = await file.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    inference = run_skin_inference(pil_img)

    # Azure Vision (optional)
    try:
        azure = await vision_service.analyze_single_image(file_path)
    except Exception:
        azure = None

    # DB insert (UUID SAFE)
    skin_image = SkinImage(
        user_id=user.id,
        image_url=file_path,
        image_type=image_type,
        captured_at=datetime.utcnow(),
    )
    db.add(skin_image)
    await db.flush()

    diagnosis = SkinDiagnosis(
        skin_image_id=skin_image.id,
        prediction=inference["prediction"],
        confidence=inference["confidence"],
        model_version="v1",
    )
    db.add(diagnosis)

    await db.commit()
    await db.refresh(skin_image)

    msg = "Image uploaded successfully"
    if azure:
        msg += f" | Severity: {azure['severity_score']}/100"

    return SkinImageUploadResponse(
        image_id=skin_image.id,
        image_url=file_path,
        prediction=inference["prediction"],
        confidence=inference["confidence"],
        captured_at=skin_image.captured_at,
        message=msg,
    )


# ============================================================================
# ENDPOINT 3: MY IMAGES
# ============================================================================

@router.get("/my-images")
async def get_my_images(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SkinImage)
        .where(SkinImage.user_id == user.id)
        .order_by(desc(SkinImage.captured_at))
    )
    images = result.scalars().all()

    return [
        {
            "image_id": str(img.id),
            "image_url": img.image_url,
            "captured_at": img.captured_at.isoformat(),
            "image_type": img.image_type,
        }
        for img in images
    ]


# ============================================================================
# ENDPOINT 4: ANALYZE EXISTING IMAGE
# ============================================================================

@router.post("/analyze/{image_id}", response_model=SkinAnalysisResult)
async def analyze_existing_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SkinImage).where(
            SkinImage.id == image_id,
            SkinImage.user_id == user.id,
        )
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(404, "Image not found")

    analysis = await vision_service.analyze_single_image(image.image_url)
    return SkinAnalysisResult(**analysis)


# ============================================================================
# ENDPOINT 5: WEEKLY COMPARISON
# ============================================================================

@router.get("/progress/comparison")
async def get_weekly_comparison(
    weeks: int = 4,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    end = datetime.utcnow()
    start = end - timedelta(weeks=weeks)

    result = await db.execute(
        select(SkinImage)
        .where(
            SkinImage.user_id == user.id,
            SkinImage.captured_at.between(start, end),
        )
        .order_by(SkinImage.captured_at)
    )
    images = result.scalars().all()

    if len(images) < 2:
        return {"message": "Not enough images"}

    comparisons = []
    for i in range(len(images) - 1):
        comp = await vision_service.compare_images(
            images[i].image_url,
            images[i + 1].image_url,
        )
        comparisons.append(comp)

    return {
        "user_id": str(user.id),
        "weeks": weeks,
        "comparisons": comparisons,
    }


# ============================================================================
# ENDPOINT 6: DELETE IMAGE
# ============================================================================

@router.delete("/image/{image_id}")
async def delete_skin_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SkinImage).where(
            SkinImage.id == image_id,
            SkinImage.user_id == user.id,
        )
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(404, "Image not found")

    storage.delete_image(image.image_url)
    await db.delete(image)
    await db.commit()

    return {"message": "Deleted", "image_id": str(image_id)}
