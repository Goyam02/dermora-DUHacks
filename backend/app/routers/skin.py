from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import io
import uuid

from app.models.inference import run_skin_inference

router = APIRouter()


@router.post("/infer")
async def diagnose_skin(file: UploadFile = File(...)):
    """
    POST an image → {prediction, confidence}
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
        "inference_id": str(uuid.uuid4()),
        "prediction": result["prediction"],
        "confidence": result["confidence"]
    }
