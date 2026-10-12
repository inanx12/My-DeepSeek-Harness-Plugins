#!/usr/bin/env bash
# Convert a green-screen (or plain-background) clip into a small transparent
# VP9 WebM that the pet can play.  Needs ffmpeg with libvpx-vp9.
#
#   tools/video-to-webm.sh input.mp4 idle             -> assets/videos/idle.webm
#   PINGPONG=1 tools/video-to-webm.sh input.mp4 idle  -> plays forward then backward: a seamless loop
#   START=0.5 DURATION=2.5 tools/video-to-webm.sh input.mp4 yawn
#   KEY=0xFFFFFF SIMILARITY=0.12 DESPILL=0 tools/video-to-webm.sh white-bg.mp4 love
#
# Env knobs: KEY (background colour, default pure green 0x00FF00),
# SIMILARITY / BLEND (chromakey tolerance), DESPILL (1 = remove the green fringe, default 1),
# START (seconds to skip, default 0), DURATION (max seconds, default 4),
# PINGPONG (1 = append the clip reversed so the loop has no jump, default 0),
# CROP (ffmpeg crop "w:h:x:y" in source pixels, to frame her tightly; default none),
# HEIGHT (px, default 360), FPS (default 24), CRF (quality, default 36; higher = smaller).
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "usage: $0 <input-video> <pose-name>   e.g. $0 clip.mp4 idle" >&2
  exit 1
fi
in="$1"; pose="$2"
here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/assets/videos/$pose.webm"
mkdir -p "$(dirname "$out")"

key="chromakey=${KEY:-0x00FF00}:${SIMILARITY:-0.15}:${BLEND:-0.06}"
# After keying, despill pulls the leftover green out of semi-transparent hair edges.
# (Before keying it would turn the green screen black and nothing would be keyed.)
if [[ "${DESPILL:-1}" == "1" ]]; then key="$key,format=rgba,despill=type=green"; fi
cut="trim=start=${START:-0}:duration=${DURATION:-4},setpts=PTS-STARTPTS,fps=${FPS:-24}"
finish="scale=-2:${HEIGHT:-360}:flags=lanczos,format=yuva420p"
# The emoji badge sits on the frame's top-right corner, so empty margins push it away from her head.
if [[ -n "${CROP:-}" ]]; then finish="crop=$CROP,$finish"; fi
if [[ "${PINGPONG:-0}" == "1" ]]; then
  # Forward then reversed; the reversed copy drops its first/last frame so no frame shows twice.
  graph="[0:v]$cut,split[f][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r0];[r0]reverse,trim=start_frame=1,reverse,setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1,$key,$finish[v]"
else
  graph="[0:v]$cut,$key,$finish[v]"
fi
ffmpeg -hide_banner -loglevel error -y -i "$in" -filter_complex "$graph" -map "[v]" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf "${CRF:-36}" -row-mt 1 -deadline good -an \
  -metadata:s:v:0 alpha_mode=1 "$out"
echo "wrote $out ($(( $(stat -c %s "$out") / 1024 )) KB). Run: node tools/build.mjs"
