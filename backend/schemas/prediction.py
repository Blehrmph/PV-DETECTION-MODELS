"""
Pydantic schemas for API request/response models.
"""

from pydantic import BaseModel
from typing import Optional


class Stage1Result(BaseModel):
    """Result from Stage 1: Binary Classification."""
    label: str  # "Healthy" or "Anomalous"
    confidence: float


class Stage2Result(BaseModel):
    """Result from Stage 2: Group Classification."""
    group_label: str  # One of the anomaly groups (Hotspot, Obstruction, Cell-Defect, Electrical-Fault)
    confidence: float


class Stage3Result(BaseModel):
    """Result from Stage 3: Fine-grained Classification."""
    fine_label: str  # One of the defined fine-grained faults (11 classes)
    confidence: float


class PredictionResponse(BaseModel):
    """Complete prediction response from the pipeline."""
    stage1: Stage1Result
    stage2: Optional[Stage2Result] = None
    stage3: Optional[Stage3Result] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    message: str
