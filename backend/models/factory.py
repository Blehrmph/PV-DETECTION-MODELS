"""
Model factory for rebuilding architectures when loading checkpoints.
Supports torchvision CNNs and Swin Transformer backbones via timm.
"""

import torch
import torch.nn as nn
from torchvision import models

try:
    import timm
except ImportError as exc:  # pragma: no cover - surfaced at runtime
    raise ImportError("timm is required for Swin/ViT backbones. Install with `pip install timm`.") from exc


class MultiHeadSwin(nn.Module):
    """
    Swin Transformer backbone with separate classification heads per anomaly group.
    Heads are concatenated in the group order for a flat logits vector.
    """

    def __init__(self, arch: str, group_mapping: dict[str, list[str]]):
        super().__init__()
        # Build backbone without a classification head; global_pool gives [B, C]
        self.backbone = timm.create_model(
            arch,
            pretrained=False,
            num_classes=0,
            global_pool="avg",
        )
        feature_dim = self.backbone.num_features
        self.group_order = list(group_mapping.keys())
        self.heads = nn.ModuleDict(
            {
                group: nn.Linear(feature_dim, len(faults))
                for group, faults in group_mapping.items()
            }
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feats = self.backbone(x)  # [B, C]
        logits = [self.heads[group](feats) for group in self.group_order]
        return torch.cat(logits, dim=1)


def build_model(
    arch: str,
    num_classes: int,
    *,
    multihead: bool = False,
    group_mapping: dict[str, list[str]] | None = None,
) -> nn.Module:
    if arch == "resnet50":
        model = models.resnet50(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    elif arch == "mobilenet_v3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[3] = nn.Linear(
            model.classifier[3].in_features, num_classes
        )

    elif arch.startswith("swin_tiny_patch4_window7_224"):
        if multihead:
            if group_mapping is None:
                raise ValueError("group_mapping is required for multihead Swin models.")
            model = MultiHeadSwin(arch=arch.replace("_multihead", ""), group_mapping=group_mapping)
        else:
            model = timm.create_model(
                arch.replace("_multihead", ""),
                pretrained=False,
                num_classes=num_classes,
            )

    else:
        raise ValueError(f"Unknown architecture: {arch}")

    return model
