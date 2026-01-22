import torch
import timm
from torch import nn

WEIGHTS_PATH = "app/models/skin_classifier.pth"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

IDX2LABEL = {
    0: "eczema",
    1: "psoriasis",
    2: "vitiligo"
}

_MODEL = None


class SkinClassifier(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        self.backbone = timm.create_model(
            "vit_base_patch14_dinov2",
            pretrained=False,
            num_classes=0
        )
        self.classifier = nn.Linear(self.backbone.num_features, num_classes)

    def forward(self, x):
        features = self.backbone(x)
        return self.classifier(features)


def load_model():
    global _MODEL

    if _MODEL is None:
        model = SkinClassifier()
        state_dict = torch.load(WEIGHTS_PATH, map_location=DEVICE)
        model.load_state_dict(state_dict)
        model.to(DEVICE)
        model.eval()
        _MODEL = model

    return _MODEL
