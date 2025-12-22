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

Place your trained PyTorch models in the `models/` directory:
- `stage1_model.pth` - Binary classification (Healthy vs Anomalous)
- `stage2_model.pth` - Group classification (4 groups)
- `stage3_model.pth` - Fine-grained classification (11 classes)

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
