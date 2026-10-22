#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p "$ROOT/local-ai/audio" "$ROOT/local-ai/models/piper"

source "$ROOT/.venv/bin/activate"

nohup python "$ROOT/local-ai/whisper_server.py" > "$ROOT/local-ai/whisper.log" 2>&1 &
WHISPER_PID=$!
nohup python "$ROOT/local-ai/piper_server.py" > "$ROOT/local-ai/piper.log" 2>&1 &
PIPER_PID=$!

printf '%s\n' "$WHISPER_PID" > "$ROOT/local-ai/whisper.pid"
printf '%s\n' "$PIPER_PID" > "$ROOT/local-ai/piper.pid"

echo "Whisper on http://localhost:8001"
echo "Piper on http://localhost:10200"
echo "Logs: $ROOT/local-ai/whisper.log and $ROOT/local-ai/piper.log"
