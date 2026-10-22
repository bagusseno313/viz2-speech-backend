from __future__ import annotations

import os
import tempfile
from pathlib import Path

import whisper
from fastapi import FastAPI, File, Form, UploadFile

MODEL_NAME = os.getenv('WHISPER_MODEL', 'base')
app = FastAPI(title='Viz2Speech Whisper')
model = whisper.load_model(MODEL_NAME)


def transcribe_bytes(audio_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower() or '.wav'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        temp_path = tmp.name

    try:
        result = model.transcribe(temp_path, fp16=False, language='id')
        return str(result.get('text', '')).strip()
    finally:
        os.unlink(temp_path)


@app.get('/health')
def health() -> dict:
    return {'status': 'ok', 'service': 'whisper', 'model': MODEL_NAME}


@app.post('/v1/audio/transcriptions')
@app.post('/asr')
@app.post('/transcribe')
async def transcribe_endpoint(
    file: UploadFile = File(...),
    model_name: str | None = Form(default=None),
) -> dict:
    audio_bytes = await file.read()
    text = transcribe_bytes(audio_bytes, file.filename or 'audio.wav')
    return {'text': text, 'model': model_name or MODEL_NAME}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8001)
