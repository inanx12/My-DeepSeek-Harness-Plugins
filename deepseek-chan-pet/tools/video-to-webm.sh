#!/usr/bin/env bash
# Convert a green-screen (or plain-background) clip into a small transparent
# VP9 WebM that the pet can play.  Needs ffmpeg with libvpx-vp9.
#
#   tools/video-to-webm.sh input.mp4 happy            -> assets/videos/happy.webm
#   KEY=0xFFFFFF SIMILARITY=0.12 tools/video-to-webm.sh white-bg.mp4 love
#
# Env knobs: KEY (background colour, default pure green 0x00FF00),
# SIMILARITY / BLEND (chromakey tolerance), HEIGHT (px, default 360),
# FPS (default 24), DURATION (max seconds, default 4), CRF (quality, default 36).
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "usage: $0 <input-video> <pose-name>   e.g. $0 clip.mp4 happy" >&2
  exit 1
fi
in="$1"; pose="$2"
here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/assets/videos/$pose.webm"
mkdir -p "$(dirname "$out")"
ffmpeg -hide_banner -loglevel error -y -i "$in" -t "${DURATION:-4}" \
  -vf "chromakey=${KEY:-0x00FF00}:${SIMILARITY:-0.15}:${BLEND:-0.06},scale=-2:${HEIGHT:-360}:flags=lanczos,fps=${FPS:-24},format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf "${CRF:-36}" -row-mt 1 -deadline good -an \
  -metadata:s:v:0 alpha_mode=1 "$out"
echo "wrote $out ($(( $(stat -c %s "$out") / 1024 )) KB). Run: node tools/build.mjs"
