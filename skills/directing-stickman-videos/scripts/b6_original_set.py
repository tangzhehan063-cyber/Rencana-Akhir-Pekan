#!/usr/bin/env python3
"""Paint an ORIGINAL B6 set for a portrait pilot: office wall/floor, table, letter. Deterministic, no bundled pixels.

Lighting is baked as soft gradients from one window source (no particles, glow or per-frame effects).
Usage: b6_original_set.py OUT_DIR
"""
from pathlib import Path
import math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b6_original_cast import Pen, mottle, blob, INK  # noqa: E402


def grad(size, top, bottom):
    a = np.linspace(0, 1, size[1], dtype=np.float32)[:, None, None]
    return Image.fromarray((np.array(top, np.float32) * (1 - a) + np.array(bottom, np.float32) * a).repeat(size[0], axis=1).astype(np.uint8))


def room(path):
    W, H = 720, 1280
    img = grad((W, H), (244, 208, 176), (226, 176, 144)).convert('RGBA')
    p = Pen((W, H), 2); p.im = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); p.d = ImageDraw.Draw(p.im)
    # wall panel moulding
    for x0, x1 in ((40, 250), (270, 460)):
        p.line([(x0, 330), (x1, 330), (x1, 760), (x0, 760), (x0, 330)], 4, (190, 140, 112), ('mold', x0))
    # arched window (right) with sky, mullions, curtain
    sky = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); sd = ImageDraw.Draw(sky)
    win = [(492, 250), (700, 250), (700, 700), (492, 700)]
    sd.polygon([(x * 2, y * 2) for x, y in win], fill=(170, 205, 232, 255))
    g2 = grad((1, 450 * 2), (150, 192, 228), (236, 220, 196)).resize((208 * 2, 450 * 2))
    sky.paste(g2, (492 * 2, 250 * 2))
    cl = blob(600, 330, 55, 22, ('cloud',), 24); sd.polygon([(x * 2, y * 2) for x, y in cl], fill=(250, 246, 240, 255))
    p.im.alpha_composite(sky)
    p.line(win + [win[0]], 9, (110, 70, 52), ('win',)); p.line([(596, 250), (596, 700)], 7, (110, 70, 52), ('m1',)); p.line([(492, 440), (700, 440)], 7, (110, 70, 52), ('m2',))
    curtain = [(470, 230), (560, 235), (548, 560), (520, 700), (470, 700)]
    p.poly(curtain, (60, 110, 112)); p.line(curtain + [curtain[0]], 5, INK, ('cur',))
    for x in (490, 510, 530): p.line([(x, 250), (x - 4, 690)], 3, (40, 80, 84), ('fold', x))
    # framed picture (left) and wall lamp
    fr = [(70, 400), (230, 400), (230, 600), (70, 600)]
    p.poly(fr, (214, 170, 96)); p.line(fr + [fr[0]], 5, INK, ('fr',))
    inner = [(88, 418), (212, 418), (212, 582), (88, 582)]
    p.poly(inner, (120, 160, 150)); p.poly([(88, 560), (140, 480), (180, 530), (212, 470), (212, 582), (88, 582)], (86, 120, 104)); p.line(inner + [inner[0]], 3, INK, ('inner',))
    p.poly(blob(160, 456, 18, 18, ('sun',), 24), (240, 214, 140))
    lamp = [(300, 480), (356, 480), (368, 540), (288, 540)]
    p.poly(lamp, (196, 70, 64)); p.line(lamp + [lamp[0]], 4, INK, ('lamp',)); p.line([(328, 470), (328, 440), (300, 430)], 5, (150, 110, 60), ('arm',))
    # baseboard + carpet
    p.poly([(0, 900), (W, 900), (W, 940), (0, 940)], (120, 76, 60)); p.line([(0, 940), (W, 940)], 5, INK, ('bb',))
    p.poly([(0, 940), (W, 940), (W, H), (0, H)], (150, 62, 60)); p.poly([(40, 1010), (W - 40, 1010), (W - 10, 1250), (10, 1250)], (122, 52, 56))
    p.line([(40, 1010), (W - 40, 1010), (W - 10, 1250), (10, 1250), (40, 1010)], 5, (214, 168, 110), ('rug',))
    img.alpha_composite(p.out((W, H)))
    # baked window light: soft warm wash on wall and floor, one source, static
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx - 640) / 420., (yy - 520) / 520.)
    wash = np.clip(1 - d, 0, 1) ** 1.5 * .16
    a = np.asarray(img, np.float32)
    a[:, :, :3] = a[:, :, :3] * (1 - wash[:, :, None]) + np.array([255, 236, 200], np.float32) * wash[:, :, None]
    img = mottle(Image.fromarray(a.astype(np.uint8)), ('room',), .02)
    img.convert('RGB').save(path)


def table(path):
    W, H = 300, 230
    p = Pen((W, H), 3)
    top = [(14, 40), (286, 40), (296, 92), (4, 92)]
    p.poly(top, (178, 120, 76)); p.poly([(4, 92), (296, 92), (296, 112), (4, 112)], (140, 88, 56))
    for x0, x1 in ((20, 40), (258, 278)):
        leg = [(x0, 112), (x1, 112), (x1 + 3, 222), (x0 - 1, 222)]
        p.poly(leg, (132, 82, 52)); p.line(leg + [leg[0]], 4, INK, ('leg', x0))
    p.line(top + [top[0]], 5, INK, ('top',)); p.line([(4, 92), (296, 92), (296, 112), (4, 112), (4, 92)], 5, INK, ('front',))
    for i, y in enumerate((56, 70, 82)): p.line([(30, y), (270, y + (i % 2) * 2)], 2.2, (140, 92, 60), ('grain', i))
    mottle(p.out((W, H)), ('table',), .05).save(path)


def letter(path):
    W, H = 184, 222
    p = Pen((W, H), 3)
    paper = [(8, 8), (176, 12), (172, 214), (10, 210)]
    p.poly(paper, (246, 238, 216)); p.line(paper + [paper[0]], 4.2, INK, ('paper',))
    for i, y in enumerate((50, 76, 102, 128)):
        p.line([(30, y), (150 - (i % 2) * 40, y + 1)], 3, (150, 124, 110), ('t', i))
    p.poly(blob(128, 176, 24, 24, ('seal',), 28), (196, 60, 52)); p.line(blob(128, 176, 24, 24, ('seal',), 28) + [blob(128, 176, 24, 24, ('seal',), 28)[0]], 3, INK, ('sealo',))
    p.line([(120, 176), (136, 176)], 3, (240, 190, 176), ('s1',))
    mottle(p.out((W, H)), ('letter',), .03).save(path)


if __name__ == '__main__':
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    room(out / 'room.png'); table(out / 'table.png'); letter(out / 'letter.png')
