from __future__ import annotations

import os
import subprocess
import tempfile
import uuid
from pathlib import Path
from urllib.request import urlretrieve

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / 'models' / 'piper'
AUDIO_DIR = BASE_DIR / 'audio'
MODEL_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = os.getenv('PIPER_MODEL', 'en_US-lessac-medium')
MODEL_FILE = MODEL_DIR / f'{MODEL_NAME}.onnx'
CONFIG_FILE = MODEL_DIR / f'{MODEL_NAME}.onnx.json'


def ensure_model() -> None:
    if MODEL_FILE.exists() and CONFIG_FILE.exists():
        return

    model_url = (
        'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/'
        'en/en_US/lessac/medium/en_US-lessac-medium.onnx?download=1'
    )
    config_url = (
        'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/'
        'en/en_US/lessac/medium/en_US-lessac-medium.onnx.json?download=1'
    )

    urlretrieve(model_url, str(MODEL_FILE))
    urlretrieve(config_url, str(CONFIG_FILE))


app = FastAPI(title='Viz2Speech Piper')


@app.on_event('startup')
def startup() -> None:
    ensure_model()


@app.get('/health')
def health() -> dict:
    return {'status': 'ok', 'service': 'piper', 'model': MODEL_NAME}


@app.get('/audio/{filename}')
def get_audio(filename: str) -> FileResponse:
    file_path = AUDIO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail='Audio file not found.')
    return FileResponse(file_path, media_type='audio/wav')


@app.post('/tts')
async def synthesize_tts(payload: dict) -> dict:
    text = str(payload.get('text', '')).strip()
    if not text:
        raise HTTPException(status_code=400, detail='Text is required.')

    language = str(payload.get('language', 'id-ID'))
    output_name = f'{uuid.uuid4().hex}.wav'
    output_path = AUDIO_DIR / output_name
    input_path = AUDIO_DIR / f'{uuid.uuid4().hex}.txt'
    input_path.write_text(text, encoding='utf-8')

    try:
        subprocess.run(
            [
                'piper',
                '--model',
                str(MODEL_FILE),
                '--config',
                str(CONFIG_FILE),
                '--input-file',
                str(input_path),
                '--output-file',
                str(output_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=500,
            detail=f'Piper synthesis failed: {exc.stderr or exc.stdout or str(exc)}',
        ) from exc
    finally:
        if input_path.exists():
            input_path.unlink()

    return {
        'status': 'completed',
        'language': language,
        'audioUrl': f'/audio/{output_name}',
        'provider': 'piper',
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=10200)
