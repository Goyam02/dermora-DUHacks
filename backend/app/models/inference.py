import torch
import torch.nn.functional as F
from PIL import Image

from app.models.model import load_model, IDX2LABEL
from app.models.transforms import TEST_TRANSFORM

_MODEL = load_model()


def run_skin_inference(image: Image.Image) -> dict:
    """
    Runs skin disease inference.
    Returns label + confidence (0–1 float).
    """
    tensor = TEST_TRANSFORM(image).unsqueeze(0)

    with torch.inference_mode():
        logits = _MODEL(tensor)
        probs = F.softmax(logits, dim=1)[0]
        conf, idx = probs.max(dim=0)

    return {
        "prediction": IDX2LABEL[idx.item()],
        "confidence": conf.item()
    }
