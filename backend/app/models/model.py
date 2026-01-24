import torch
import timm
from torch import nn

WEIGHTS_PATH = "app/models/dermora-dinov2-vit-b-skin.pth"

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

        in_features = self.backbone.num_features  # 768 for vit_base

        self.head = nn.Sequential(
            nn.Linear(in_features, 512),        # head.0
            nn.BatchNorm1d(512),                # head.1
            nn.ReLU(inplace=True),              # head.2
            nn.Dropout(0.3),                    # head.3
            nn.Linear(512, 256),                # head.4
            nn.ReLU(inplace=True),              # head.5
            nn.Dropout(0.3),                    # head.6
            nn.Linear(256, num_classes),        # head.7
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)



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
