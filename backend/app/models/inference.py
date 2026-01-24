import torch
import torch.nn.functional as F
from PIL import Image

from app.models.model import load_model, IDX2LABEL
from app.models.transforms import TEST_TRANSFORM

_MODEL = load_model()


def run_skin_inference(image: Image.Image) -> dict:
    model = _MODEL
    device = next(model.parameters()).device  # safest way

    tensor = TEST_TRANSFORM(image).unsqueeze(0).to(device)

    with torch.inference_mode():
        logits = model(tensor)
        probs = F.softmax(logits, dim=1)[0]
        conf, idx = probs.max(dim=0)

    return {
        "prediction": IDX2LABEL[idx.item()],
        "confidence": conf.item()
    }

