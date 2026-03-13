#!/usr/bin/env python3

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
import subprocess


ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "App"
ICONSET_DIR = APP_DIR / "QuickSketch.iconset"
ICON_PATH = APP_DIR / "QuickSketch.icns"
BASE_SIZE = 1024


def rounded_rectangle_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def make_base_icon() -> Image.Image:
    image = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((96, 110, 928, 942), radius=210, fill=(26, 34, 56, 54))
    shadow = shadow.filter(ImageFilter.GaussianBlur(36))
    image.alpha_composite(shadow)

    card = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card)
    card_draw.rounded_rectangle((72, 72, 952, 952), radius=220, fill=(241, 246, 253, 255))
    card_draw.rounded_rectangle((72, 72, 952, 952), radius=220, outline=(255, 255, 255, 240), width=10)

    accent = Image.new("RGBA", (BASE_SIZE, BASE_SIZE), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    accent_draw.pieslice((340, 170, 980, 810), start=280, end=70, fill=(118, 163, 255, 110))
    accent = accent.filter(ImageFilter.GaussianBlur(12))
    card.alpha_composite(accent)

    grid_draw = ImageDraw.Draw(card)
    grid_color = (214, 224, 239, 160)
    for offset in range(180, 900, 120):
        grid_draw.line((offset, 150, offset, 874), fill=grid_color, width=4)
        grid_draw.line((150, offset, 874, offset), fill=grid_color, width=4)

    card_mask = rounded_rectangle_mask(BASE_SIZE, 220)
    image.paste(card, (0, 0), card_mask)

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((150, 150, 874, 874), radius=176, outline=(225, 233, 244, 255), width=10)

    # Main sketch strokes
    stroke_color = (20, 24, 34, 255)
    blue_color = (59, 110, 224, 255)

    draw.line(
        [(254, 246), (346, 560), (468, 364), (616, 666), (786, 400)],
        fill=blue_color,
        width=80,
        joint="curve",
    )
    draw.line(
        [(248, 252), (336, 544), (458, 350), (612, 656), (780, 394)],
        fill=stroke_color,
        width=46,
        joint="curve",
    )
    draw.line(
        [(352, 690), (434, 770), (572, 692)],
        fill=stroke_color,
        width=38,
        joint="curve",
    )
    draw.ellipse((300, 708, 368, 776), fill=stroke_color)
    draw.ellipse((558, 670, 626, 738), fill=stroke_color)

    return image


def export_iconset(base: Image.Image) -> None:
    ICONSET_DIR.mkdir(parents=True, exist_ok=True)

    sizes = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }

    for name, size in sizes.items():
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(ICONSET_DIR / name)


def build_icns() -> None:
    subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(ICON_PATH)],
        check=True,
    )


def main() -> None:
    base = make_base_icon()
    export_iconset(base)
    build_icns()


if __name__ == "__main__":
    main()
