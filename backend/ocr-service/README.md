# PaddleOCR service

This service runs PaddleOCR 3.7 / PP-OCRv6 locally and exposes a small HTTP API
for the NestJS backend. It is used automatically when the app captures an
image in **DOCUMENT** mode.

## Run with Docker (CPU)

From the repository root:

```bash
docker build -t viz2speech-paddleocr ./backend/ocr-service
docker run --name viz2speech-paddleocr --rm -p 8002:8002 \\
  -v paddleocr-cache:/root/.paddlex viz2speech-paddleocr
```

On Apple Silicon Macs, build the Linux x86_64 image explicitly if the local
PaddlePaddle wheel is not available for your host architecture:

```bash
docker build --platform linux/amd64 -t viz2speech-paddleocr ./backend/ocr-service
docker run --platform linux/amd64 --name viz2speech-paddleocr --rm -p 8002:8002 \\
  -v paddleocr-cache:/root/.paddlex viz2speech-paddleocr
```

The first OCR request downloads the model weights, so the service needs network
access and enough disk space for the model cache. Keep the service running while
using DOCUMENT mode.

## Run locally (Linux)

Use Python 3.10 or 3.11. Install PaddlePaddle first, then the service:

```bash
cd backend/ocr-service
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PADDLEOCR_MODEL` | `PP-OCRv6` | PaddleOCR model family |
| `PADDLEOCR_LANG` | `id` | Indonesian OCR language code |
| `PADDLEOCR_MAX_IMAGE_BYTES` | `10485760` | Maximum uploaded image size |

## API

- `GET /health` — service and model status. The model is loaded lazily.
- `POST /ocr` — multipart form upload using field name `file`.

Example:

```bash
curl -X POST http://localhost:8002/ocr \
  -F "file=@document.jpg"
```

Response:

```json
{
  "text": "INFORMASI DOKUMEN\\nBaris berikutnya",
  "lines": [
    { "text": "INFORMASI DOKUMEN", "confidence": 0.99 },
    { "text": "Baris berikutnya", "confidence": 0.98 }
  ],
  "model": "PP-OCRv6",
  "language": "id"
}
```

Recognized line order and line breaks are preserved. Confidence scores are
included for diagnostics but are not used to silently discard text.
