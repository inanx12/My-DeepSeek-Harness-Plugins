#!/usr/bin/env python3
"""Cut DeepSeek-chan's source art into transparent sprites.

Usage:  python3 tools/process-art.py [fullbody|turnaround|hd|new ...]   (from the plugin folder)

Reads   art/source/fullbody.jpg     full-body standing pose (flat grey background)
        art/source/turnaround.webp  front / side / back sheet (flat grey background)
        ../Emojiler/eskilerin yüksek çözünürlüklüleri/*.jpg
                                    HD versions of the 16 original stickers (caption underneath)
        ../Emojiler/yeni eklenecek emojiler/*.jpg
                                    16 newer die-cut stickers (white border + grey outline)
Writes  assets/sprites/<name>.webp  transparent sprites consumed by tools/build.mjs

Only Pillow and numpy are needed. Background removal is a tolerance flood fill
from the image border, so white clothing that is enclosed by line art survives.
Re-run it whenever the source art changes; the outputs are committed.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "source"
OUT = ROOT / "assets" / "sprites"
MAGENTA = (255, 0, 255)

EMOJI = ROOT.parent / "Emojiler"
HD_DIR = EMOJI / "eskilerin yüksek çözünürlüklüleri"
NEW_DIR = EMOJI / "yeni eklenecek emojiler"
STICKER_HEIGHT = 440      # final sprite height: crisp at 180% size on a 2x screen

# File stem (timestamp suffix removed) -> pose name used by src/dialogue.js.
HD_STICKERS = {
    "Anime_girl_acting_cute_with_hearts": "pleading",
    "Anime_girl_angry_arms_crossed": "angry",
    "Anime_girl_blushing_embarrassed": "shy",
    "Anime_girl_charging_fist_forward": "go",
    "Anime_girl_cheering_with_hearts": "happy",
    "Anime_girl_crying_tears": "crying",
    "Anime_girl_holding_heart_love": "love",
    "Anime_girl_panicked_trembling": "panic",
    "Anime_girl_proud_boasting": "proud",
    "Anime_girl_shocked_surprised": "surprised",
    "Anime_girl_sinister_smile_scheming": "scheming",
    "Anime_girl_speechless_deadpan": "speechless",
    "Anime_girl_sticking_tongue_out_teasing": "smug",
    "Anime_girl_sulking_arms_crossed": "sulk",
    "Anime_girl_thanking_hands_together": "thanks",
    "Anime_girl_yawning_sleepy": "sleepy",
}
NEW_STICKERS = {
    "Angry_anime_girl_shouting_portrait": "furious",
    "Anime_girl_cheering_enthusiastic": "excited",
    "Anime_girl_laughing_portrait": "laugh",
    "Anime_girl_looking_panicked": "dizzy",
    "Anime_girl_looking_shocked": "shocked",
    "Anime_girl_pouting_with_arms": "pout",
    "Anime_girl_smiling": "smile",
    "Anime_girl_smiling_nervously": "nervous",
    "Anime_girl_smiling_shyly": "bashful",
    "Anime_girl_smirking": "smirk",
    "Anime_girl_thinking": "thinking",
    "Anime_girl_tilting_head": "confused",
    "Anime_girl_winking_and_smiling": "wink",
    "Anime_girl_with_heart_eyes": "adoring",
    "Anime_girl_yawning": "yawn",
    "Sad_anime_girl_crying": "sad",
}


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


def cutout(rgb: Image.Image, tolerance: int, seeds: str = "tlrb", fill_source: Image.Image | None = None) -> Image.Image:
    """Background -> transparent, with a soft, colour-decontaminated edge.

    fill_source, when given, is the image the flood fill runs on (same size);
    colours still come from rgb. Used to paint over a sticker's outline first."""
    arr = np.asarray(rgb).astype(np.float32)
    bg_mask = flood_background(fill_source or rgb, tolerance, seeds)
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


def cut_fullbody(height: int = 900) -> Image.Image:
    src = Image.open(SRC / "fullbody.jpg").convert("RGB")
    # Work at a sane size first; the flood fill is the slow part.
    src = src.resize((src.width * height // src.height, height), Image.LANCZOS)
    im = cutout(src, tolerance=14)
    im.putalpha(Image.fromarray(keep_components(np.asarray(im.getchannel("A")), 400, 0.02)))
    return trim(im)


def process_fullbody() -> None:
    save(fit(cut_fullbody(), 520), "idle")


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


def stem_of(path: Path) -> str:
    """'Anime_girl_smiling_20261011022207.jpg' -> 'Anime_girl_smiling' (also drops a trailing '…')."""
    return re.sub(r"_\d{14}$", "", path.stem).rstrip("…").rstrip("_")


def load_scaled(path: Path, width: int) -> Image.Image:
    im = Image.open(path).convert("RGB")
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def dark_rows(rgb: Image.Image, level: int) -> np.ndarray:
    """Per row, how many pixels are darker than `level` in every channel."""
    return (np.asarray(rgb).max(axis=2) < level).sum(axis=1)


def seal_bottom(art: Image.Image, fill: Image.Image, level: int = 90) -> Image.Image:
    """Draw a dark line along the art's flat-cut bottom row in the fill image.

    The bust is cut flat, so the white apron touches the bottom edge. Without a
    barrier the background fill would run along that edge and into the apron."""
    row = np.asarray(art)[-1].max(axis=1) < level
    xs = np.flatnonzero(row)
    if len(xs):
        sealed = fill.copy()
        ImageDraw.Draw(sealed).line([(int(xs[0]), art.height - 1), (int(xs[-1]), art.height - 1)], fill=(0, 0, 0), width=1)
        return sealed
    return fill


def flat_cut(rgb: Image.Image, limit: int | None = None) -> int:
    """Row just below the last line that is mostly real line art (the bust's flat bottom)."""
    rows = dark_rows(rgb, 90)[:limit]
    return int(np.flatnonzero(rows > rgb.width * 0.04).max()) + 1


def cut_hd_sticker(path: Path, width: int = 720) -> Image.Image:
    """Old stickers in HD: art, a blank gap, then a Chinese caption. Keep only the art."""
    src = load_scaled(path, width)
    ink = (np.asarray(src.convert("L")) < 235).sum(axis=1)
    y = len(ink) - 1
    while y > 0 and ink[y] <= 1: y -= 1      # bottom margin
    while y > 0 and ink[y] > 1: y -= 1       # caption text
    while y > 0 and ink[y] <= 1: y -= 1      # gap above the caption
    art = src.crop((0, 0, src.width, flat_cut(src, y + 1)))
    # Seed from top/left/right only and seal the flat bottom, or the apron leaks.
    im = cutout(art, tolerance=22, seeds="tlr", fill_source=seal_bottom(art, art))
    im.putalpha(Image.fromarray(keep_components(np.asarray(im.getchannel("A")), 60, side_bleed=0.12)))
    return trim(im, pad=3)


def process_hd_sticker(path: Path, name: str) -> None:
    save(fit(cut_hd_sticker(path), STICKER_HEIGHT), name)


def cut_new_sticker(path: Path, width: int = 720) -> Image.Image:
    """Die-cut stickers: grey outline, white border, then the art with a flat-cut bottom."""
    src = load_scaled(path, width)
    # 1) The page background outside the sticker outline.
    outside = flood_background(src, tolerance=10)
    # 2) Paint the outline (a few px past the outside) white, so the next fill
    #    runs straight through the white border and stops at the line art.
    grown = Image.fromarray(outside.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(13 * width // 720 | 1))
    fill = src.copy()
    fill.paste((255, 255, 255), mask=grown)
    # 3) Cut at the art's flat bottom so the apron never meets the border below it.
    cut = flat_cut(src)
    art, fill = src.crop((0, 0, src.width, cut)), fill.crop((0, 0, src.width, cut))
    # Low tolerance: the white headband frills have faint grey outlines.
    im = cutout(art, tolerance=12, seeds="tlr", fill_source=seal_bottom(art, fill))
    im.putalpha(Image.fromarray(keep_components(np.asarray(im.getchannel("A")), 60, relative=0.01)))
    return trim(im, pad=3)


def process_new_sticker(path: Path, name: str) -> None:
    save(fit(cut_new_sticker(path), STICKER_HEIGHT), name)


def process_stickers(directory: Path, table: dict[str, str], worker) -> None:
    if not directory.is_dir():
        print(f"  {directory} not found; keeping existing sprites", file=sys.stderr)
        return
    found = {stem_of(p): p for p in sorted(directory.glob("*.jpg"))}
    for stem, name in table.items():
        if stem in found: worker(found[stem], name)
        else: print(f"  ! missing {stem}.jpg in {directory.name}", file=sys.stderr)
    for stem in sorted(set(found) - set(table)):
        print(f"  ! {stem}.jpg has no pose mapping; add it to process-art.py", file=sys.stderr)


def main() -> None:
    """Optional args pick steps: fullbody, turnaround, hd, new (default: all)."""
    steps = set(sys.argv[1:]) or {"fullbody", "turnaround", "hd", "new"}
    OUT.mkdir(parents=True, exist_ok=True)
    if "fullbody" in steps: print("full body:"); process_fullbody()
    if "turnaround" in steps: print("turnaround:"); process_turnaround()
    if "hd" in steps: print("HD stickers:"); process_stickers(HD_DIR, HD_STICKERS, process_hd_sticker)
    if "new" in steps: print("new stickers:"); process_stickers(NEW_DIR, NEW_STICKERS, process_new_sticker)


if __name__ == "__main__":
    main()
