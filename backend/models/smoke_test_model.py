"""
Smoke test for verifying saved model checkpoints match expected architectures
and class counts for each stage of the pipeline.
"""

from pathlib import Path
import sys
import torch

# Ensure backend package is importable when running from this file
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from core.config import settings
from models.factory import build_model


def load_model(
    model_path: Path,
    arch: str,
    num_classes: int,
    device: str = "cpu",
    multihead: bool = False,
    group_mapping: dict | None = None,
) -> torch.nn.Module:
    """
    Load a model saved either as a full torch.nn.Module or state_dict using a known architecture.
    """
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    checkpoint = torch.load(model_path, map_location=device)

    if isinstance(checkpoint, torch.nn.Module):
        model = checkpoint.to(device)
    elif isinstance(checkpoint, dict):
        state_dict = checkpoint.get("model_state_dict") or checkpoint.get("state_dict") or checkpoint
        if any(k.startswith("model.") for k in state_dict.keys()):
            state_dict = {k.replace("model.", "", 1): v for k, v in state_dict.items()}

        model = build_model(
            arch=arch,
            num_classes=num_classes,
            multihead=multihead,
            group_mapping=group_mapping,
        )
        model.load_state_dict(state_dict, strict=True)
        model.to(device)
    else:
        raise RuntimeError(f"Unknown checkpoint format at {model_path}: {type(checkpoint)}")

    model.eval()

    return model


@torch.no_grad()
def validate_model(name: str, filename: str, arch: str, expected_classes: int, device: str = "cpu") -> dict:
    """Load model, run a dummy forward pass, and verify output shape matches expected classes."""
    model_path = settings.MODELS_DIR / filename
    result = {"name": name, "path": model_path, "ok": False, "message": ""}

    if not model_path.exists():
        result["message"] = "Missing file"
        return result

    try:
        model = load_model(
            model_path=model_path,
            arch=arch,
            num_classes=expected_classes,
            device=device,
            multihead=(name == "Stage 3" and getattr(settings, "STAGE3_MULTIHEAD", False)),
            group_mapping=settings.GROUP_FAULT_MAPPING if name == "Stage 3" else None,
        )
        dummy_input = torch.randn(1, 3, 224, 224, device=device)
        output = model(dummy_input)

        if not isinstance(output, torch.Tensor):
            result["message"] = f"Unexpected output type {type(output)}"
            return result

        shape = tuple(output.shape)
        expected_shape = (1, expected_classes)
        if shape != expected_shape:
            result["message"] = f"Unexpected output shape {shape}, expected {expected_shape}"
            return result

        if torch.isnan(output).any() or torch.isinf(output).any():
            result["message"] = "Output contains NaN or Inf values"
            return result

        result["ok"] = True
        result["message"] = f"OK - output shape {shape}"
        return result

    except Exception as exc:  # noqa: BLE001
        result["message"] = f"Error: {exc}"
        return result


def main():
    device = "cpu"
    stages = [
        ("Stage 1", settings.STAGE1_MODEL, settings.STAGE1_ARCH, len(settings.STAGE1_LABELS)),
        ("Stage 2", settings.STAGE2_MODEL, settings.STAGE2_ARCH, len(settings.STAGE2_GROUPS)),
        ("Stage 3", settings.STAGE3_MODEL, settings.STAGE3_ARCH, len(settings.STAGE3_FAULTS)),
    ]

    results = [
        validate_model(name, filename, arch, expected, device=device)
        for name, filename, arch, expected in stages
    ]

    for res in results:
        status = "PASS" if res["ok"] else "FAIL"
        print(f"{status} | {res['name']} | {res['path'].name}: {res['message']}")

    if all(res["ok"] for res in results):
        print("All models loaded and output shapes match expected class counts.")
    else:
        print("One or more models failed validation.")


if __name__ == "__main__":
    main()
