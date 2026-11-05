from __future__ import annotations

import logging
import os
import threading
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("viz2speech.paddleocr")

APP_NAME = "viz2speech-paddleocr"
MODEL_NAME = os.getenv("PADDLEOCR_MODEL", "PP-OCRv6")
LANGUAGE = os.getenv("PADDLEOCR_LANG", "id")
MAX_IMAGE_BYTES = int(os.getenv("PADDLEOCR_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))

app = FastAPI(title=APP_NAME, version="1.0.0")

# Load the large model only on the first OCR request and serialize inference.
# This keeps health checks fast and avoids concurrent access to one CPU model.
_ocr_engine: Any | None = None
_engine_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_ocr_engine() -> Any:
    global _ocr_engine

    if _ocr_engine is None:
        with _engine_lock:
            if _ocr_engine is None:
                from paddleocr import PaddleOCR

                logger.info(
                    "Loading PaddleOCR model=%s language=%s",
                    MODEL_NAME,
                    LANGUAGE,
                )
                _ocr_engine = PaddleOCR(
                    lang=LANGUAGE,
                    ocr_version=MODEL_NAME,
                    use_doc_orientation_classify=True,
                    use_doc_unwarping=True,
                    use_textline_orientation=True,
                )
                logger.info("PaddleOCR model loaded")

    return _ocr_engine


def _result_payload(prediction: Any) -> dict[str, Any]:
    if isinstance(prediction, dict):
        payload: Any = prediction
    else:
        payload = getattr(prediction, "json", None)
        if callable(payload):
            payload = payload()

    if isinstance(payload, str):
        import json

        payload = json.loads(payload)

    if not isinstance(payload, dict):
        return {}

    nested = payload.get("res")
    return nested if isinstance(nested, dict) else payload


def extract_ocr_lines(predictions: Any) -> list[dict[str, float | str]]:
    """Extract recognized lines in PaddleOCR's reading order."""
    if predictions is None:
        return []

    if not isinstance(predictions, (list, tuple)):
        predictions = [predictions]

    lines: list[dict[str, float | str]] = []
    for prediction in predictions:
        payload = _result_payload(prediction)
        texts = payload.get("rec_texts") or []
        scores = payload.get("rec_scores") or []

        for index, raw_text in enumerate(texts):
            text = " ".join(str(raw_text).split()).strip()
            if not text:
                continue

            line: dict[str, float | str] = {"text": text}
            if index < len(scores):
                try:
                    line["confidence"] = float(scores[index])
                except (TypeError, ValueError):
                    pass
            lines.append(line)

    return lines


def _run_ocr(image: np.ndarray) -> list[dict[str, float | str]]:
    with _inference_lock:
        engine = get_ocr_engine()
        predictions = engine.predict(image)
        return extract_ocr_lines(predictions)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": APP_NAME,
        "model": MODEL_NAME,
        "language": LANGUAGE,
        "modelLoaded": _ocr_engine is not None,
    }


@app.post("/ocr")
async def recognize_document(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload must be an image.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {MAX_IMAGE_BYTES}-byte upload limit.",
        )

    image_buffer = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(image_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to decode the uploaded image.",
        )

    try:
        lines = await run_in_threadpool(_run_ocr, image)
    except Exception as error:  # model/runtime errors must be visible to callers
        logger.exception("PaddleOCR inference failed")
        raise HTTPException(
            status_code=503,
            detail="PaddleOCR model is unavailable or failed to process the image.",
        ) from error

    return {
        "text": "\n".join(str(line["text"]) for line in lines),
        "lines": lines,
        "model": MODEL_NAME,
        "language": LANGUAGE,
    }
