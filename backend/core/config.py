"""
Configuration settings for the PV Fault Detection API.
"""

from pathlib import Path
from typing import List
import os
import tempfile


class Settings:
    """Application settings."""
    
    # API Settings
    API_PREFIX: str = os.getenv("API_PREFIX", "")
    DEBUG: bool = True
    MODEL_LOAD_STRICT: bool = os.getenv("MODEL_LOAD_STRICT", "0") == "1"
    
    # CORS Settings - Add your frontend URL here
    _cors_env = os.getenv("CORS_ORIGINS")
    CORS_ORIGINS: List[str] = (
        [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
        if _cors_env
        else [
            "http://localhost:5173",  # Vite dev server
            "http://localhost:8080",  # Alternative port
            "http://localhost:3000",  # Common React port
        ]
    )
    
    # Model paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MODEL_DIR: str | None = os.getenv("MODEL_DIR")
    MODEL_CACHE_DIR: str | None = os.getenv("MODEL_CACHE_DIR")
    MODELS_DIR: Path = (
        Path(MODEL_DIR)
        if MODEL_DIR
        else Path(MODEL_CACHE_DIR)
        if MODEL_CACHE_DIR
        else Path(tempfile.gettempdir()) / "pv-models"
    )
    
    # Model file names
    STAGE1_MODEL: str = "stage1_model.pth"
    STAGE2_MODEL: str = "stage2_model.pth"
    STAGE3_MODEL: str = "stage3_model.pth"

    # Model architectures for state_dict loading
    STAGE1_ARCH: str = "swin_tiny_patch4_window7_224"
    STAGE2_ARCH: str = "swin_tiny_patch4_window7_224"
    STAGE3_ARCH: str = "swin_tiny_patch4_window7_224"
    STAGE3_MULTIHEAD: bool = True
    STAGE1_CONFIDENCE_THRESHOLD: float = 0.7
    
    # Classification labels
    STAGE1_LABELS: List[str] = ["Healthy", "Anomalous"]
    
    STAGE2_GROUPS: List[str] = [
        "Hotspot",
        "Obstruction",
        "Cell-Defect",
        "Electrical-Fault",
    ]
    
    # Fine-grained fault labels (11 classes)
    STAGE3_FAULTS: List[str] = [
        "Hot-Spot-Multi",
        "Hot-Spot",
        "Soiling",
        "Vegetation",
        "Shadowing",
        "Cracking",
        "Cell",
        "Cell-Multi",
        "Diode",
        "Diode-Multi",
        "Offline-Module",
    ]
    
    # Group to Fault mapping (which faults belong to which group)
    GROUP_FAULT_MAPPING: dict = {
        "Hotspot": ["Hot-Spot-Multi", "Hot-Spot"],
        "Obstruction": ["Soiling", "Vegetation", "Shadowing"],
        "Cell-Defect": ["Cracking", "Cell", "Cell-Multi"],
        "Electrical-Fault": ["Diode", "Diode-Multi", "Offline-Module"],
    }


settings = Settings()
