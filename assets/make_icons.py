#!/usr/bin/env python3
"""生成「热点追踪」PWA 图标：暖白底 + 低饱和蓝雷达波纹 + 琥珀热点。
用法：python3 assets/make_icons.py
输出全部写到项目根目录，路径与 manifest.json 保持一致。
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = 4  # 超采样倍数

BG = (248, 247, 244)      # 暖白
BLUE = (91, 124, 153)     # 低饱和品牌蓝
BLUE_SOFT = (176, 192, 206)
AMBER = (198, 152, 86)    # 琥珀
AMBER_SOFT = (222, 195, 150)


def make(size):
    n = size * S
    im = Image.new("RGB", (n, n), BG)
    d = ImageDraw.Draw(im)
    c = n / 2

    # 三圈同心雷达波纹，越外越淡、越细
    rings = [
        (0.365, BLUE_SOFT, max(2, int(0.010 * n))),
        (0.265, BLUE_SOFT, max(2, int(0.013 * n))),
        (0.165, BLUE, max(2, int(0.018 * n))),
    ]
    for r, color, w in rings:
        rad = r * n
        d.ellipse([c - rad, c - rad, c + rad, c + rad], outline=color, width=w)

    # 中心的琥珀热点（带一圈浅色光晕）
    hr = 0.088 * n
    glow = hr * 1.75
    d.ellipse([c - glow, c - glow, c + glow, c + glow], fill=AMBER_SOFT)
    d.ellipse([c - hr, c - hr, c + hr, c + hr], fill=AMBER)

    # 右上角一个小标记点，暗示「多条热点」
    px, py = c + 0.255 * n, c - 0.255 * n
    pr = 0.032 * n
    d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=BLUE)
    # 连接线，从中心指向标记点
    d.line([(c + hr * 0.7, c - hr * 0.7), (px - pr * 0.8, py + pr * 0.8)],
           fill=BLUE_SOFT, width=max(2, int(0.008 * n)))

    return im.resize((size, size), Image.LANCZOS)


def main():
    make(192).save(ROOT / "icon-192.png")
    make(512).save(ROOT / "icon-512.png")
    make(180).save(ROOT / "apple-touch-icon.png")
    ico = make(64)
    ico.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    for f in ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon.ico"]:
        p = ROOT / f
        print(f"{f}: {p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
