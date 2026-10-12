#!/usr/bin/env python3
"""Make green-screen start frames for image-to-video tools (Kling, Runway, Hailuo, Veo, ...).

Usage:  python3 tools/make-video-inputs.py          (from the plugin folder)
Writes  art/video-inputs/<pose>.png  on pure green (#00FF00), ready to upload.

The video tool animates the frame on the same green, then
`tools/video-to-webm.sh clip.mp4 <pose>` keys the green out again.
A white background would not work: keying white also deletes her white apron.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "video-inputs"
GREEN = (0, 255, 0, 255)

spec = importlib.util.spec_from_file_location("process_art", ROOT / "tools" / "process-art.py")
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)


def place(im: Image.Image, canvas: tuple[int, int], height: int, bottom: int) -> Image.Image:
    """Scale the cut-out to `height` px and stand it `bottom` px above the canvas floor, centred."""
    w = round(im.width * height / im.height)
    im = im.resize((w, height), Image.LANCZOS)
    frame = Image.new("RGBA", canvas, GREEN)
    frame.alpha_composite(im, ((canvas[0] - w) // 2, canvas[1] - height - bottom))
    return frame.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        # Full body, 9:16, with room around her so the tool can move hair and tail.
        "idle": lambda: place(art.cut_fullbody(1600), (1080, 1920), 1500, 180),
        # Busts are cut flat at the bottom: keep that edge on the frame's floor.
        "yawn": lambda: place(art.cut_new_sticker(art.NEW_DIR / "Anime_girl_yawning_20261011022207.jpg", 1024), (1080, 1080), 900, 0),
        "thinking": lambda: place(art.cut_new_sticker(art.NEW_DIR / "Anime_girl_thinking_20261011022207.jpg", 1024), (1080, 1080), 900, 0),
    }
    for pose, make in jobs.items():
        path = OUT / f"{pose}.png"
        make().save(path, optimize=True)
        print(f"  {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
