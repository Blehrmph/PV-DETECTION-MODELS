# PV Fault Detection - FastAPI Backend

This folder contains the FastAPI backend for the PV Fault Detection system.

## Setup Instructions

### Prerequisites
- Python 3.9+
- PyTorch (for model inference)

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Running the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single image prediction |
| `/predict-batch` | POST | Batch image prediction |

### Model Files

Models are downloaded from Hugging Face by default and cached in a runtime directory
(system temp or `MODEL_CACHE_DIR`). No `.pth` files are stored in the repo.

Reference checkpoints:
- `stage1_model.pth`: https://huggingface.co/Blehrmph/models-pv-project/resolve/main/stage1_model.pth
- `stage2_model.pth`: https://huggingface.co/Blehrmph/models-pv-project/resolve/main/stage2_model.pth
- `stage3_model.pth`: https://huggingface.co/Blehrmph/models-pv-project/resolve/main/stage3_model.pth

Override sources (optional):
- `MODEL_URL_BASE` or `STAGE*_MODEL_URL` to point at different URLs.
- `MODEL_CACHE_DIR` to change the cache location.
- `MODEL_DIR` to use a local folder (not recommended for deploys).

Update the expected architectures in `backend/core/config.py` if you trained with different backbones. Defaults match the provided checkpoints (Swin Tiny):

```python
STAGE1_ARCH = "swin_tiny_patch4_window7_224"
STAGE2_ARCH = "swin_tiny_patch4_window7_224"
STAGE3_ARCH = "swin_tiny_patch4_window7_224"
STAGE3_MULTIHEAD = True  # keep True for the provided multi-head fault classifier
```

### Validate your saved models

Run a quick smoke test to ensure checkpoints load and output the expected class counts:

```bash
python backend/models/smoke_test_model.py
```

All stages should report `PASS` with shapes `(1, 2)`, `(1, 4)`, and `(1, 11)` (or your configured class counts).

### Connecting to Frontend

Update the frontend's API service to point to this backend:
```typescript
const API_BASE = "http://localhost:8000";
```
