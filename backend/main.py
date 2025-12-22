"""
PV Fault Detection - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from core.config import settings
from services.model_service import load_all_models, start_background_model_load

app = FastAPI(
    title="PV Fault Detection API",
    description="3-Stage Deep Learning Pipeline for Photovoltaic Panel Fault Detection",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# CORS (for React frontend)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# API prefix (e.g. "/api") and router
# -----------------------------------------------------------------------------
raw_prefix = settings.API_PREFIX.strip()
if raw_prefix:
    api_prefix = raw_prefix if raw_prefix.startswith("/") else f"/{raw_prefix}"
else:
    api_prefix = ""
app.include_router(router, prefix=api_prefix)
# Also expose the same routes under "/api" when no prefix is configured.
if not raw_prefix:
    app.include_router(router, prefix="/api")


# -----------------------------------------------------------------------------
# Startup event: load all models once when the app starts
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """
    Load all PyTorch models at application startup.
    This ensures /predict can use them immediately.
    """
    if settings.MODEL_LOAD_STRICT:
        load_all_models()
        return
    start_background_model_load()


# -----------------------------------------------------------------------------
# Root endpoint
# -----------------------------------------------------------------------------
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "PV Fault Detection API",
        "version": "1.0.0",
        "docs": "/docs",
        # Health endpoint location depends on whether we use an API prefix
        "health": f"{api_prefix}/health" if api_prefix else "/health",
    }


# # -----------------------------------------------------------------------------
# # Local development entry point (optional)
# # -----------------------------------------------------------------------------
# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
