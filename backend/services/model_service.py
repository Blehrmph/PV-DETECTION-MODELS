"""
Model Service - Handles loading and running PyTorch models for PV fault detection.

This version removes placeholders and implements:
- Model loading for Stage 1, 2, and 3 (.pth files)
- Image preprocessing
- Real PyTorch inference with softmax + confidence scores

Assumptions:
- Models were saved with `torch.save(model, path)` so they can be loaded directly.
- Each model outputs a 2D tensor of shape [batch, num_classes].
"""

from typing import Optional
import random
import io
import os
import shutil
import threading
import urllib.request
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
import torchvision.transforms as transforms

from core.config import settings
from models.factory import build_model
from schemas.prediction import Stage1Result, Stage2Result, Stage3Result


# =============================================================================
# GLOBALS
# =============================================================================

# Reproducibility settings
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
try:
    torch.use_deterministic_algorithms(True)
except Exception:
    # Some ops may not support deterministic mode; ignore if not available
    pass

# Global model instances (loaded once at startup)
_stage1_model: Optional[torch.nn.Module] = None
_stage2_model: Optional[torch.nn.Module] = None
_stage3_model: Optional[torch.nn.Module] = None
_models_loaded: bool = False
_models_loading: bool = False
_models_load_error: str | None = None
_models_lock = threading.Lock()

# Device (CPU by default; change to "cuda" if you know you have a GPU)
DEVICE = torch.device("cpu")

# Preprocessing transform (adjust to match your training)
_PREPROCESS_TRANSFORM = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        # Change these if you used different normalization in training
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


DEFAULT_MODEL_URL_BASE = "https://huggingface.co/Blehrmph/models-pv-project/resolve/main"

# =============================================================================
# MODEL LOADING
# =============================================================================

def _download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest.with_suffix(dest.suffix + ".tmp")
    with urllib.request.urlopen(url) as response, open(tmp_path, "wb") as out:
        shutil.copyfileobj(response, out)
    tmp_path.replace(dest)


def _is_lfs_pointer(path: Path) -> bool:
    if not path.is_file():
        return False
    try:
        with open(path, "rb") as handle:
            head = handle.read(200)
        return head.startswith(b"version https://git-lfs.github.com/spec/v1")
    except OSError:
        return False


def _resolve_model_url(model_path: Path, url_env: str) -> str | None:
    url = os.getenv(url_env)
    if url:
        return url
    base_url = os.getenv("MODEL_URL_BASE")
    if base_url:
        return f"{base_url.rstrip('/')}/{model_path.name}"
    return f"{DEFAULT_MODEL_URL_BASE.rstrip('/')}/{model_path.name}"



def _ensure_model_file(model_path: Path, url_env: str) -> None:
    is_pointer = _is_lfs_pointer(model_path)
    if model_path.exists() and not is_pointer:
        return
    if is_pointer:
        print(
            f"[WARN] Model file at {model_path} looks like a Git LFS pointer."
        )

    url = _resolve_model_url(model_path, url_env)
    if not url:
        raise FileNotFoundError(
            f"Model file missing or invalid: {model_path}. "
            f"Set {url_env}, MODEL_URL_BASE, or mount MODEL_DIR."
        )

    print(f"[INFO] Downloading model from {url} -> {model_path}")
    _download_file(url, model_path)


def _extract_state_dict(checkpoint):
    """
    Normalize various checkpoint formats to a state_dict (dict of tensors).
    """
    if isinstance(checkpoint, dict):
        for key in ("state_dict", "model_state_dict"):
            if key in checkpoint:
                return checkpoint[key]
        return checkpoint
    return None


def _load_model(
    model_path: Path,
    arch: str,
    num_classes: int,
    *,
    multihead: bool = False,
    group_mapping: dict | None = None,
) -> torch.nn.Module:
    """
    Load a model saved either as a full torch.nn.Module or as a state_dict.

    Prefers rebuilding the architecture via build_model to guarantee the correct
    classifier head, then loads weights from the checkpoint.
    """
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    checkpoint = torch.load(model_path, map_location=DEVICE)

    # If the checkpoint is already a module, just use it
    if isinstance(checkpoint, torch.nn.Module):
        model = checkpoint.to(DEVICE)
        model.eval()
        return model

    state_dict = _extract_state_dict(checkpoint)
    if state_dict is None:
        raise RuntimeError(f"Unknown checkpoint format at {model_path}: {type(checkpoint)}")

    # Strip a common prefix if present
    if any(k.startswith("model.") for k in state_dict.keys()):
        state_dict = {k.replace("model.", "", 1): v for k, v in state_dict.items()}

    model = build_model(
        arch=arch,
        num_classes=num_classes,
        multihead=multihead,
        group_mapping=group_mapping,
    )
    model.load_state_dict(state_dict, strict=True)
    model.to(DEVICE)

    model.eval()
    return model


def load_stage1_model() -> torch.nn.Module:
    global _stage1_model

    model_path = settings.MODELS_DIR / settings.STAGE1_MODEL
    _ensure_model_file(model_path, "STAGE1_MODEL_URL")
    _stage1_model = _load_model(
        model_path=model_path,
        arch=settings.STAGE1_ARCH,
        num_classes=len(settings.STAGE1_LABELS),
    )
    print(f"[INFO] Stage 1 model loaded from: {model_path}")
    return _stage1_model


def load_stage2_model() -> torch.nn.Module:
    global _stage2_model

    model_path = settings.MODELS_DIR / settings.STAGE2_MODEL
    _ensure_model_file(model_path, "STAGE2_MODEL_URL")
    _stage2_model = _load_model(
        model_path=model_path,
        arch=settings.STAGE2_ARCH,
        num_classes=len(settings.STAGE2_GROUPS),
    )
    print(f"[INFO] Stage 2 model loaded from: {model_path}")
    return _stage2_model


def load_stage3_model() -> torch.nn.Module:
    global _stage3_model

    model_path = settings.MODELS_DIR / settings.STAGE3_MODEL
    _ensure_model_file(model_path, "STAGE3_MODEL_URL")
    _stage3_model = _load_model(
        model_path=model_path,
        arch=settings.STAGE3_ARCH,
        num_classes=len(settings.STAGE3_FAULTS),
        multihead=settings.STAGE3_MULTIHEAD,
        group_mapping=settings.GROUP_FAULT_MAPPING if settings.STAGE3_MULTIHEAD else None,
    )
    print(f"[INFO] Stage 3 model loaded from: {model_path}")
    return _stage3_model


def load_all_models() -> None:
    """
    Load all models at application startup.

    Call this from your FastAPI startup event so models are ready when
    /predict is called.
    """
    global _models_loaded, _models_loading, _models_load_error
    if _models_loaded:
        return
    _models_loading = True
    _models_load_error = None
    print(f"[INFO] MODELS_DIR set to: {settings.MODELS_DIR}")
    print(
        "[INFO] Model files: "
        f"{settings.STAGE1_MODEL}, {settings.STAGE2_MODEL}, {settings.STAGE3_MODEL}"
    )
    try:
        load_stage1_model()
        load_stage2_model()
        load_stage3_model()
        _models_loaded = True
        print("[INFO] All PV fault detection models loaded successfully.")
    except Exception as exc:
        _models_loaded = False
        _models_load_error = str(exc)
        print(f"[ERROR] Model loading failed: {exc}")
        raise
    finally:
        _models_loading = False


def start_background_model_load() -> None:
    """
    Kick off model loading in a background thread so startup is non-blocking.
    """
    global _models_loading
    with _models_lock:
        if _models_loaded or _models_loading:
            return
        _models_loading = True

    def _load_worker() -> None:
        try:
            load_all_models()
        except Exception:
            # Error is captured in _models_load_error by load_all_models.
            pass

    thread = threading.Thread(target=_load_worker, name="model-loader", daemon=True)
    thread.start()


def models_ready() -> bool:
    return _models_loaded


def models_loading() -> bool:
    return _models_loading


def model_load_error() -> str | None:
    return _models_load_error


def ensure_models_loaded() -> bool:
    if _models_loaded:
        return True
    if not _models_loading:
        start_background_model_load()
    return False


# =============================================================================
# IMAGE PREPROCESSING
# =============================================================================

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """
    Preprocess image bytes for model inference.

    Returns:
        A tensor of shape [1, C, H, W] on DEVICE.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _PREPROCESS_TRANSFORM(image).unsqueeze(0)  # [1, C, H, W]
    return tensor.to(DEVICE)


# =============================================================================
# INFERENCE FUNCTIONS
# =============================================================================

def run_stage1_prediction(image_bytes: bytes) -> Stage1Result:
    """
    Run Stage 1 binary classification (Healthy vs Anomalous).
    """
    if _stage1_model is None:
        raise RuntimeError("Stage 1 model is not loaded. Call load_all_models() at startup.")

    # Preprocess
    input_tensor = preprocess_image(image_bytes)

    # Inference
    with torch.no_grad():
        outputs = _stage1_model(input_tensor)          # [1, num_classes]
        probabilities = F.softmax(outputs, dim=1)      # [1, num_classes]
        confidence, predicted = torch.max(probabilities, dim=1)

    pred_idx = predicted.item()
    label = settings.STAGE1_LABELS[pred_idx]
    conf_value = float(confidence.item())

    return Stage1Result(label=label, confidence=round(conf_value, 4))


def run_stage2_prediction(image_bytes: bytes) -> Stage2Result:
    """
    Run Stage 2 group classification (4 anomaly groups).
    """
    if _stage2_model is None:
        raise RuntimeError("Stage 2 model is not loaded. Call load_all_models() at startup.")

    # Preprocess
    input_tensor = preprocess_image(image_bytes)

    # Inference
    with torch.no_grad():
        outputs = _stage2_model(input_tensor)          # [1, num_classes]
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, dim=1)

    pred_idx = predicted.item()
    group_label = settings.STAGE2_GROUPS[pred_idx]
    conf_value = float(confidence.item())

    return Stage2Result(group_label=group_label, confidence=round(conf_value, 4))


def run_stage3_prediction(image_bytes: bytes, group_label: str) -> Stage3Result:
    """
    Run Stage 3 fine-grained classification (11 fault classes).

    Uses GROUP_FAULT_MAPPING to constrain predictions to faults belonging
    to the predicted group when possible. Supports multi-head Swin checkpoints
    by slicing the concatenated logits per group.
    """
    if _stage3_model is None:
        raise RuntimeError("Stage 3 model is not loaded. Call load_all_models() at startup.")

    # Preprocess
    input_tensor = preprocess_image(image_bytes)

    with torch.no_grad():
        outputs = _stage3_model(input_tensor)          # [1, num_classes]

    # Multi-head Swin: outputs are concatenated per group head in GROUP_FAULT_MAPPING order
    if getattr(settings, "STAGE3_MULTIHEAD", False):
        group_order = list(settings.GROUP_FAULT_MAPPING.keys())
        # Build offsets for each group chunk
        offsets = []
        start = 0
        for grp in group_order:
            faults = settings.GROUP_FAULT_MAPPING[grp]
            end = start + len(faults)
            offsets.append((grp, start, end, faults))
            start = end

        # Find the chunk for the requested group; fallback to first if missing
        chunk = next((c for c in offsets if c[0] == group_label), offsets[0])
        _, start, end, faults = chunk

        chunk_logits = outputs[:, start:end]           # [1, len(faults)]
        probabilities = F.softmax(chunk_logits, dim=1)
        confidence, predicted = torch.max(probabilities, dim=1)

        pred_idx = predicted.item()
        fine_label = faults[pred_idx]
        conf_value = float(confidence.item())

        return Stage3Result(fine_label=fine_label, confidence=round(conf_value, 4))

    # Constrain to faults that belong to the given group (if mapping exists)
    valid_faults = settings.GROUP_FAULT_MAPPING.get(group_label, settings.STAGE3_FAULTS)

    probabilities = F.softmax(outputs, dim=1)

    # Map fault labels to indices
    valid_indices = [settings.STAGE3_FAULTS.index(lbl) for lbl in valid_faults]

    # Mask probabilities outside the valid indices
    mask = torch.full_like(probabilities, float("-inf"))
    mask[:, valid_indices] = probabilities[:, valid_indices]

    confidence, predicted = torch.max(mask, dim=1)
    pred_idx = predicted.item()
    fine_label = settings.STAGE3_FAULTS[pred_idx]
    conf_value = float(confidence.item())

    return Stage3Result(fine_label=fine_label, confidence=round(conf_value, 4))
