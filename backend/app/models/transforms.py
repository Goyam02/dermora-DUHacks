from torchvision import transforms

# ImageNet normalization (used by ViT / DINO models)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

TEST_TRANSFORM = transforms.Compose([
    transforms.Resize((518, 518)),   
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

