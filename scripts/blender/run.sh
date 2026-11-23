#!/usr/bin/env bash
# Jalankan skrip Blender (bpy) secara headless. Membuat venv sendiri bila belum ada.
#   ./run.sh stickman_scene.py --out render.png
#   ./run.sh stickman_scene.py --animate --out frames/ && ffmpeg -framerate 24 -i frames/frame_%04d.png -pix_fmt yuv420p out.mp4
set -euo pipefail
VENV="${BPY_VENV:-$HOME/.cache/bpy-venv}"
if [ ! -x "$VENV/bin/python" ]; then
  echo "Memasang Blender (paket bpy) ke $VENV ..." >&2
  uv venv -q -p 3.13 "$VENV"
  VIRTUAL_ENV="$VENV" uv pip install -q bpy
fi
cd "$(dirname "$0")"
exec "$VENV/bin/python" "$@"
