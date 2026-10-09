#!/usr/bin/env python3
"""Cut DeepSeek-chan's source art into transparent sprites.

Usage:  python3 tools/process-art.py            (from the plugin folder)

Reads   art/source/fullbody.jpg     full-body standing pose (flat grey background)
        art/source/turnaround.webp  front / side / back sheet (flat grey background)
        art/source/stickers.jpg     4x4 expression sheet with captions (white background)
Writes  assets/sprites/<name>.webp  transparent sprites consumed by tools/build.mjs

Only Pillow and numpy are needed. Background removal is a tolerance flood fill
from the image border, so white clothing that is enclosed by line art survives.
Re-run it whenever the source art changes; the outputs are committed.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "source"
OUT = ROOT / "assets" / "sprites"
MAGENTA = (255, 0, 255)

# Sticker sheet, row-major. Names are the emotion ids used by src/dialogue.js.
STICKERS = [
    "happy", "pleading", "angry", "smug",
    "crying", "surprised", "sleepy", "love",
    "shy", "sulk", "proud", "speechless",
    "scheming", "go", "panic", "thanks",
]


def flood_background(rgb: Image.Image, tolerance: int, seeds: str = "tlrb") -> np.ndarray:
    """Return a boolean mask of background pixels connected to the chosen borders."""
    work = rgb.copy()
    w, h = work.size
    px = work.load()
    border = []
    if "t" in seeds: border += [(x, 0) for x in range(w)]
    if "b" in seeds: border += [(x, h - 1) for x in range(w)]
    if "l" in seeds: border += [(0, y) for y in range(h)]
    if "r" in seeds: border += [(w - 1, y) for y in range(h)]
    for x, y in border:
        if px[x, y] != MAGENTA and min(px[x, y]) > 160:  # only start on light background pixels
            ImageDraw.floodfill(work, (x, y), MAGENTA, thresh=tolerance)
    arr = np.asarray(work)
    return (arr[..., 0] == 255) & (arr[..., 1] == 0) & (arr[..., 2] == 255)


def components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """4-connected labelling without scipy (two-pass union-find)."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    parent = [0]

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    nxt = 1
    for y in range(h):
        row = mask[y]
        for x in np.flatnonzero(row):
            up = labels[y - 1, x] if y else 0
            left = labels[y, x - 1] if x else 0
            if up and left:
                a, b = find(up), find(left)
                labels[y, x] = min(a, b)
                if a != b: parent[max(a, b)] = min(a, b)
            elif up or left:
                labels[y, x] = up or left
            else:
                parent.append(nxt); labels[y, x] = nxt; nxt += 1
    lut = np.array([find(i) for i in range(nxt)], dtype=np.int32)
    return lut[labels], nxt


def keep_components(alpha: np.ndarray, min_area: int, relative: float = 0.0, side_bleed: float = 0.0) -> np.ndarray:
    """Drop specks (JPEG noise, watermark glyphs) from an alpha mask.

    side_bleed > 0 also drops pieces touching the left/right edge that are smaller
    than that fraction of the largest piece: a neighbouring sticker's tail."""
    solid = alpha > 24
    labels, _ = components(solid)
    ids, counts = np.unique(labels[solid], return_counts=True)
    if not len(ids): return alpha
    floor = max(min_area, int(counts.max() * relative))
    good = ids[counts >= floor]
    if side_bleed > 0:
        edge = set(np.unique(labels[:, 0])) | set(np.unique(labels[:, -1]))
        small = set(ids[counts < counts.max() * side_bleed])
        good = np.array([i for i in good if not (i in edge and i in small)], dtype=np.int32)
    keep = np.isin(labels, good)
    return np.where(keep, alpha, 0).astype(np.uint8)


def cutout(rgb: Image.Image, tolerance: int, seeds: str = "tlrb") -> Image.Image:
    """Background -> transparent, with a soft, colour-decontaminated edge."""
    arr = np.asarray(rgb).astype(np.float32)
    bg_mask = flood_background(rgb, tolerance, seeds)
    bg = np.median(arr[bg_mask], axis=0) if bg_mask.any() else np.array([255, 255, 255], np.float32)
    # Distance from the background colour drives a soft alpha only on the rim.
    dist = np.abs(arr - bg).max(axis=2)
    rim = np.asarray(Image.fromarray(bg_mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    soft = np.clip((dist - tolerance * 0.35) / (tolerance * 2.2), 0, 1)
    alpha = np.where(bg_mask, 0.0, np.where(rim, soft, 1.0))
    # Un-mix the background from semi-transparent rim pixels so no grey halo remains.
    a = np.clip(alpha, 1e-3, 1)[..., None]
    color = np.clip((arr - bg * (1 - a)) / a, 0, 255)
    out = np.dstack([color, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box: return im
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def fit(im: Image.Image, max_h: int) -> Image.Image:
    if im.height <= max_h: return im
    w = round(im.width * max_h / im.height)
    return im.resize((w, max_h), Image.LANCZOS)


def save(im: Image.Image, name: str) -> None:
    path = OUT / f"{name}.webp"
    im.save(path, "WEBP", quality=90, method=6, exact=False)
    print(f"  {path.relative_to(ROOT)}  {im.width}x{im.height}  {path.stat().st_size // 1024} KB")


def band_split(alpha: np.ndarray, axis: int, min_gap: int) -> list[tuple[int, int]]:
    """Split along an axis at runs of empty lines at least min_gap long."""
    filled = (alpha > 24).sum(axis=axis) > 0
    spans, start, gap = [], None, 0
    for i, f in enumerate(filled):
        if f:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, i - gap + 1)); start, gap = None, 0
    if start is not None: spans.append((start, len(filled)))
    return spans


def process_fullbody() -> None:
    src = Image.open(SRC / "fullbody.jpg").convert("RGB")
    # Work at a sane size first; the flood fill is the slow part.
    src = src.resize((src.width * 900 // src.height, 900), Image.LANCZOS)
    im = cutout(src, tolerance=14)
    im.putalpha(Image.fromarray(keep_components(np.asarray(im.getchannel("A")), 400, 0.02)))
    save(fit(trim(im), 520), "idle")


def process_turnaround() -> None:
    src = Image.open(SRC / "turnaround.webp").convert("RGB")
    im = cutout(src, tolerance=12)
    alpha = keep_components(np.asarray(im.getchannel("A")), 80, 0.05)
    im.putalpha(Image.fromarray(alpha))
    spans = [s for s in band_split(alpha, axis=0, min_gap=8) if s[1] - s[0] > 40]
    names = ["cheer", "side", "back"]
    if len(spans) != 3:
        print(f"  turnaround: expected 3 figures, found {len(spans)}; skipping", file=sys.stderr)
        return
    for name, (x0, x1) in zip(names, spans):
        part = im.crop((x0, 0, x1, im.height))
        a = keep_components(np.asarray(part.getchannel("A")), 80, 0.08)
        part.putalpha(Image.fromarray(a))
        save(trim(part), name)


# The sheet's rows are not evenly spaced. Each row's art is bounded by the
# quietest line inside these windows (fractions of the sheet height): above it
# is the previous caption, below it this row's caption.
ROW_WINDOWS = [((0.000, 0.000), (0.234, 0.253)),
               ((0.272, 0.288), (0.478, 0.497)),
               ((0.509, 0.525), (0.711, 0.727)),
               ((0.738, 0.753), (0.934, 0.953))]


def quietest(ink: np.ndarray, window: tuple[float, float], height: int) -> int:
    lo, hi = int(window[0] * height), int(window[1] * height)
    if hi <= lo: return lo
    return lo + int(np.argmin(ink[lo:hi + 1]))


def process_stickers() -> None:
    sheet = Image.open(SRC / "stickers.jpg").convert("RGB")
    gray_sheet = np.asarray(sheet.convert("L"))
    cw = sheet.width // 4
    for index, name in enumerate(STICKERS):
        col, row = index % 4, index // 4
        ink = (gray_sheet[:, col * cw:(col + 1) * cw] < 235).sum(axis=1)
        top_window, bottom_window = ROW_WINDOWS[row]
        top = quietest(ink, top_window, sheet.height)
        bottom = quietest(ink, bottom_window, sheet.height)
        art = sheet.crop((col * cw, top, (col + 1) * cw, bottom))
        # The bust is cut flat at the bottom: never seed the fill from that edge,
        # or the white apron would leak into the background.
        im = cutout(art, tolerance=22, seeds="tlr")
        im.putalpha(Image.fromarray(keep_components(np.asarray(im.getchannel("A")), 18, side_bleed=0.12)))
        save(trim(im, pad=2), name)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("full body:"); process_fullbody()
    print("turnaround:"); process_turnaround()
    print("stickers:"); process_stickers()


if __name__ == "__main__":
    main()
