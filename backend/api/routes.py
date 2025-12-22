"""
API Routes for PV Fault Detection.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import os
from pathlib import Path
from core.config import settings

from services.model_service import (
    run_stage1_prediction,
    run_stage2_prediction,
    run_stage3_prediction,
    models_ready,
    models_loading,
    model_load_error,
    ensure_models_loaded,
)
from schemas.prediction import (
    PredictionResponse,
    Stage1Result,
    Stage2Result,
    Stage3Result,
    HealthResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns the status of the API and model availability.
    """
    if models_ready():
        return HealthResponse(
            status="ok",
            message="PV Fault Detection API is running",
        )
    if models_loading():
        return HealthResponse(
            status="loading",
            message="Models are loading",
        )
    error = model_load_error()
    return HealthResponse(
        status="error",
        message=(
            f"Model load failed: {error}"
            if error
            else "Models not loaded. Set STAGE*_MODEL_URL or mount MODEL_DIR."
        ),
    )


@router.get("/ping", response_model=HealthResponse)
async def ping():
    """
    Lightweight ping endpoint for connectivity checks.
    Mirrors /health to keep frontend probes simple.
    """
    if models_ready():
        return HealthResponse(status="ok", message="pong")
    if models_loading():
        return HealthResponse(status="loading", message="models loading")
    error = model_load_error()
    return HealthResponse(
        status="error",
        message=f"model load failed: {error}" if error else "models not loaded",
    )


@router.get("/model-status")
async def model_status():
    """
    Report model file presence and whether models are loaded.
    """
    models_dir = settings.MODELS_DIR
    files = [
        settings.STAGE1_MODEL,
        settings.STAGE2_MODEL,
        settings.STAGE3_MODEL,
    ]

    def file_info(name: str) -> dict:
        path = models_dir / Path(name)
        exists = path.exists()
        size_bytes = path.stat().st_size if path.is_file() else None
        lfs_pointer = False
        if path.is_file():
            try:
                with open(path, "rb") as handle:
                    head = handle.read(200)
                lfs_pointer = head.startswith(b"version https://git-lfs.github.com/spec/v1")
            except OSError:
                lfs_pointer = False
        return {
            "exists": exists,
            "size_bytes": size_bytes,
            "lfs_pointer": lfs_pointer,
        }

    file_status = {name: file_info(name) for name in files}
    return {
        "models_dir": str(models_dir),
        "models_loaded": models_ready(),
        "models_loading": models_loading(),
        "model_load_error": model_load_error(),
        "model_url_base_configured": bool(os.getenv("MODEL_URL_BASE")),
        "stage_urls_configured": {
            "STAGE1_MODEL_URL": bool(os.getenv("STAGE1_MODEL_URL")),
            "STAGE2_MODEL_URL": bool(os.getenv("STAGE2_MODEL_URL")),
            "STAGE3_MODEL_URL": bool(os.getenv("STAGE3_MODEL_URL")),
        },
        "files": file_status,
    }


@router.post("/predict", response_model=PredictionResponse)
async def predict_single(file: UploadFile = File(...)):
    """
    Run the 3-stage prediction pipeline on a single image.
    
    - Stage 1: Binary classification (Healthy vs Anomalous)
    - Stage 2: Group classification (4 groups) - only if Anomalous
    - Stage 3: Fine-grained classification (11 classes) - only if Anomalous
    
    Args:
        file: The uploaded image file
        
    Returns:
        PredictionResponse with results from all applicable stages
    """
    if not ensure_models_loaded():
        detail = "Models are loading. Please try again shortly."
        error = model_load_error()
        if error:
            detail = f"Model load failed: {error}"
        raise HTTPException(
            status_code=503,
            detail=detail,
        )
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Stage 1: Binary classification
    stage1_result = run_stage1_prediction(image_bytes)

    # If confidence is too low, stop and report
    if stage1_result.confidence < settings.STAGE1_CONFIDENCE_THRESHOLD:
        return PredictionResponse(
            stage1=stage1_result,
            stage2=None,
            stage3=None,
            error=f"Low stage1 confidence (<{settings.STAGE1_CONFIDENCE_THRESHOLD})",
        )

    # If Healthy, return early (no need for stages 2 and 3)
    if stage1_result.label == settings.STAGE1_LABELS[0]:
        result = PredictionResponse(
            stage1=stage1_result,
            stage2=None,
            stage3=None,
        )
        print(f"[PREDICT] stage1={stage1_result}")
        return result
    
    # Stage 2: Group classification (only if Anomalous)
    stage2_result = run_stage2_prediction(image_bytes)
    
    # Stage 3: Fine-grained classification
    stage3_result = run_stage3_prediction(image_bytes, stage2_result.group_label)
    
    result = PredictionResponse(
        stage1=stage1_result,
        stage2=stage2_result,
        stage3=stage3_result,
    )
    print(f"[PREDICT] stage1={stage1_result} stage2={stage2_result} stage3={stage3_result}")
    return result


@router.post("/predict-batch", response_model=List[PredictionResponse])
async def predict_batch(files: List[UploadFile] = File(...)):
    """
    Run the 3-stage prediction pipeline on multiple images.
    
    Args:
        files: List of uploaded image files
        
    Returns:
        List of PredictionResponse objects, one per image
    """
    if not ensure_models_loaded():
        detail = "Models are loading. Please try again shortly."
        error = model_load_error()
        if error:
            detail = f"Model load failed: {error}"
        raise HTTPException(
            status_code=503,
            detail=detail,
        )
    results = []

    for file in files:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            results.append(
                PredictionResponse(
                    stage1=Stage1Result(label="Error", confidence=0.0),
                    stage2=None,
                    stage3=None,
                    error=f"Invalid file type for {file.filename}",
                )
            )
            continue
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Stage 1
        stage1_result = run_stage1_prediction(image_bytes)

        if stage1_result.confidence < settings.STAGE1_CONFIDENCE_THRESHOLD:
            results.append(
                PredictionResponse(
                    stage1=stage1_result,
                    stage2=None,
                    stage3=None,
                    error=f"Low stage1 confidence (<{settings.STAGE1_CONFIDENCE_THRESHOLD})",
                )
            )
            print(f"[PREDICT-BATCH] file={file.filename} stage1={stage1_result} error=low_confidence")
            continue

        if stage1_result.label == settings.STAGE1_LABELS[0]:
            results.append(
                PredictionResponse(
                    stage1=stage1_result,
                    stage2=None,
                    stage3=None,
                )
            )
            print(f"[PREDICT-BATCH] file={file.filename} stage1={stage1_result}")
            continue

        # Stage 2 & 3
        stage2_result = run_stage2_prediction(image_bytes)
        stage3_result = run_stage3_prediction(image_bytes, stage2_result.group_label)
        
        results.append(
            PredictionResponse(
                stage1=stage1_result,
                stage2=stage2_result,
                stage3=stage3_result,
            )
        )
        print(f"[PREDICT-BATCH] file={file.filename} stage1={stage1_result} stage2={stage2_result} stage3={stage3_result}")

    return results
