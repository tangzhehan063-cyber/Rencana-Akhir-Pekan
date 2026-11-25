#!/usr/bin/env python3
"""Paint an ORIGINAL B6 character package (front view) from a spec. No bundled pixels.

Draws, deterministically, in the established B6 grammar (irregular white head,
heavy lids, pressure-varying ink, matte mottled paint, violet under-shadow):
head + expression variants, clothed torso with short sleeves, neck, belted
trousers, shoes and sleeve-cap cuffs. Only numeric rig fits (socket, bone
lengths, joint ranges, authored poses) are borrowed from an existing package's
front view; every sprite byte is new, so the asset-role guard treats the result
as new-story art. Usage: b6_original_cast.py FIT_PACKAGE OUT_PACKAGE CAST.json
"""
from pathlib import Path
import argparse, hashlib, json, math, shutil, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b6_wardrobe import Canvas, rgb, shade, wobble, rng, sha, draw_lower_body, draw_neck, draw_shoe  # noqa: E402

HEAD_W, HEAD_H, HK = 369, 323, 4          # head sprite px; 4x supersample
INK = (74, 46, 46)


def blob(cx, cy, rx, ry, seed, n=96):
    r = rng(*seed)
    p1, p2, p3 = r.uniform(0, 6.28, 3)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + .045 * math.sin(2 * a + p1) + .03 * math.sin(3 * a + p2) + .015 * math.sin(5 * a + p3)
        # flatter, slightly heavy jaw: the deliberately imperfect meme silhouette
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * (math.sin(a) * (1.0 if math.sin(a) < 0 else .93))))
    return pts


class Pen:
    def __init__(self, size, ss=HK):
        self.ss = ss
        self.im = Image.new('RGBA', (size[0] * ss, size[1] * ss), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def poly(self, pts, fill):
        self.d.polygon([(x * self.ss, y * self.ss) for x, y in pts], fill=fill + (255,))

    def line(self, pts, w, color=INK, seed=('l',)):
        ph = (zlib.crc32('|'.join(map(str, seed)).encode()) % 997) / 997 * 6.28
        pts = [(x * self.ss, y * self.ss) for x, y in pts]
        tot = sum(math.dist(a, b) for a, b in zip(pts, pts[1:])) or 1
        run = 0
        for a, b in zip(pts, pts[1:]):
            n = max(2, int(math.dist(a, b) / 2))
            for i in range(n):
                u = (run + math.dist(a, b) * i / n) / tot
                r = w * self.ss * .5 * (1 + .14 * math.sin(u * 5 * math.pi + ph) + .05 * math.sin(u * 19 * math.pi))
                x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
                self.d.ellipse((x - r, y - r, x + r, y + r), fill=color + (255,))
            run += math.dist(a, b)

    def out(self, size):
        return self.im.resize(size, Image.LANCZOS)


def mottle(img, seed, amp=.05):
    """Fixed pigment variation baked into the asset (moves with the character)."""
    a = np.asarray(img, np.float32)
    h, w = a.shape[:2]
    low = rng(*seed).uniform(-1, 1, (max(2, h // 18), max(2, w // 18))).astype(np.float32)
    n = np.asarray(Image.fromarray(low).resize((w, h), Image.BICUBIC))
    a[:, :, :3] *= (1 + amp * n)[:, :, None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


EXPR = {   # eyes (lid drop, pupil dy), brow (left y, right y, tilt), mouth (kind)
    'smug': dict(lid=.55, pup=6, brow=(-4, -10, .35), mouth='grin'),
    'neutral': dict(lid=.5, pup=5, brow=(0, 0, 0), mouth='flat'),
    'flustered': dict(lid=.1, pup=0, brow=(-10, -16, -.6), mouth='o'),
    'resigned': dict(lid=.7, pup=8, brow=(4, 4, -.2), mouth='flat'),
    'relieved': dict(lid=.35, pup=4, brow=(-2, -2, .1), mouth='smile'),
}


def paint_head(c, name, expr, seed):
    """c: cast spec. Returns RGBA head sprite (HEAD_W x HEAD_H)."""
    W, H = HEAD_W, HEAD_H
    cx, cy, rx, ry = 184, 160, 166, 138
    shape = blob(cx, cy, rx, ry, seed + ('shape',))
    p = Pen((W, H))
    p.poly(shape, rgb(c['skin']))
    big = p.im
    # violet under-shadow from lower-left, soft and matte
    yy, xx = np.mgrid[0:big.height, 0:big.width].astype(np.float32)
    s = np.clip((yy / HK - (cy + 20)) / (ry * .9) + (cx - xx / HK) * .0012, 0, 1) ** 1.6
    a = np.asarray(big, np.float32)
    sh = np.array(rgb(c['skin_shadow']), np.float32)
    a[:, :, :3] = a[:, :, :3] * (1 - .8 * s[:, :, None]) + sh * .8 * s[:, :, None]
    big = Image.fromarray(a.astype(np.uint8))
    p2 = Pen((W, H)); p2.im = big; p2.d = ImageDraw.Draw(big)
    # hair
    hair = rgb(c['hair'])
    if c['hair_style'] == 'swept':
        hp = [(20, 150), (14, 95), (50, 38), (120, 8), (200, 6), (280, 28), (340, 80), (350, 140), (300, 90), (230, 70), (150, 80), (95, 100), (60, 150)]
    else:   # flat cap over short side-part
        hp = [(24, 140), (28, 90), (70, 40), (140, 14), (220, 14), (300, 40), (345, 100), (350, 150), (320, 110), (250, 92), (160, 96), (90, 110), (50, 150)]
    mask = Image.new('L', big.size, 0)
    ImageDraw.Draw(mask).polygon([(x * HK, y * HK) for x, y in blob(cx, cy, rx, ry, seed + ('shape',))], fill=255)
    layer = Image.new('RGBA', big.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).polygon([(x * HK, y * HK) for x, y in hp], fill=hair + (255,))
    clipped = Image.new('RGBA', big.size, (0, 0, 0, 0)); clipped.paste(layer, (0, 0), mask)
    big.alpha_composite(mottle(clipped, seed + ('hair',), .08))
    p2.im = big; p2.d = ImageDraw.Draw(big)
    ol = Pen((W, H)); ol.line([(x, y) for x, y in hp[:-4]], 6, INK, seed + ('hairline',))
    clip = Image.new('RGBA', big.size, (0, 0, 0, 0)); clip.paste(ol.im, (0, 0), mask); big.alpha_composite(clip)
    p2.im = big; p2.d = ImageDraw.Draw(big)
    if c['hair_style'] == 'cap':
        cap = rgb(c['cap'])
        brim = [(18, 128), (60, 96), (150, 84), (232, 92), (330, 116), (338, 138), (200, 130), (60, 150)]
        cp = [(40, 112), (70, 52), (150, 20), (240, 22), (310, 60), (338, 118), (230, 98), (140, 96)]
        p2.poly(cp, cap); p2.poly(brim, shade(cap, .85))
        p2.line(cp + [cp[0]], 6.5, INK, seed + ('cap',)); p2.line(brim + [brim[0]], 6, INK, seed + ('brim',))
    # outline with pressure, a few deliberate breaks left unfilled
    p2.line(shape + [shape[0]], 8.2, INK, seed + ('outline',))
    # face
    e = EXPR[expr]
    for side, ex in ((0, 128), (1, 238)):
        ey = 160
        p2.poly(blob(ex, ey + 4, 28, 20, seed + ('eye', side), 28), (250, 246, 246))
        p2.line(blob(ex, ey + 4, 28, 20, seed + ('eye', side), 28) + [blob(ex, ey + 4, 28, 20, seed + ('eye', side), 28)[0]], 4.5, INK, seed + ('eyeo', side))
        p2.poly(blob(ex + 2, ey + 4 + e['pup'], 9, 9, seed + ('pup', side), 20), INK)
        lid_h = 40 * e['lid']
        if lid_h > 3:
            p2.poly([(ex - 31, ey - 14), (ex + 31, ey - 14), (ex + 28, ey - 14 + lid_h), (ex - 28, ey - 14 + lid_h * .9)], INK)
        by = e['brow'][side]
        tilt = e['brow'][2] * (1 if side == 0 else -1) * 12
        p2.line([(ex - 34, ey - 38 + by + tilt), (ex, ey - 46 + by), (ex + 34, ey - 38 + by - tilt)], 8, INK, seed + ('brow', side))
    mx, my = 184, 240
    m = e['mouth']
    if m == 'grin':
        p2.poly([(mx - 46, my - 6), (mx + 54, my - 22), (mx + 40, my + 12), (mx - 30, my + 20)], (252, 244, 244))
        p2.line([(mx - 46, my - 6), (mx + 54, my - 22), (mx + 40, my + 12), (mx - 30, my + 20), (mx - 46, my - 6)], 5, INK, seed + ('mo',))
        p2.line([(mx - 14, my - 4), (mx - 8, my + 16)], 3, INK, seed + ('t1',)); p2.line([(mx + 16, my - 10), (mx + 22, my + 10)], 3, INK, seed + ('t2',))
    elif m == 'o':
        p2.poly(blob(mx, my + 4, 18, 22, seed + ('mo',), 24), (110, 50, 58)); p2.line(blob(mx, my + 4, 18, 22, seed + ('mo',), 24) + [blob(mx, my + 4, 18, 22, seed + ('mo',), 24)[0]], 5, INK, seed + ('moo',))
    elif m == 'smile':
        p2.line([(mx - 40, my - 6), (mx, my + 12), (mx + 44, my - 12)], 6, INK, seed + ('mo',))
    else:
        p2.line([(mx - 34, my + 2), (mx + 2, my + 6), (mx + 36, my - 2)], 5.5, INK, seed + ('mo',))
    if c.get('blush'):
        for bx in (86, 282):
            p2.poly(blob(bx, 214, 26, 15, seed + ('bl', bx), 24), (238, 190, 190))
    return mottle(p2.out((W, H)), seed + ('fin', expr), .02)


def paint_body(c, fit, seed):
    """540x810 sprite grid (3 px per local unit, origin (-90,-270)); returns body, cuffs."""
    S = 3
    size = (540, 810)
    to_px = lambda p: ((p[0] + 90) * S, (p[1] + 270) * S)
    cv = Canvas(size, to_px)
    g = rgb(c['garment']); shirt = rgb(c['shirt']); trim = rgb(c['trim'])
    # shirt sleeves (short): one flap per side, matching the fitted outlet segments
    flaps = {}
    for side in ('left', 'right'):
        arm = fit['arms'][side]
        (ax, ay), (bx, by) = arm['outlet_segment']
        sgn = -1 if side == 'left' else 1
        top_in, top_out = (sgn * 30, -238), (sgn * 66, -228)
        flap = [top_in, top_out, (ax, ay) if sgn < 0 else (bx, by), (bx, by) if sgn < 0 else (ax, ay), (sgn * 40, -190)]
        flaps[side] = flap
    for side, flap in flaps.items():
        cv.polygon(wobble(flap, seed + (side,), .25), shirt, seed + ('f', side), .05)
    cv.stroke(wobble(flaps['left'] + [flaps['left'][0]], seed + ('fl',), .2), 1.6, INK, seed + ('flo',))
    cv.stroke(wobble(flaps['right'] + [flaps['right'][0]], seed + ('fr',), .2), 1.6, INK, seed + ('fro',))
    # torso: waistcoat/jacket over the shirt, slightly crooked
    torso = [(-41, -238), (41, -238), (46, -176), (43, -97), (-42, -95), (-47, -176)]
    cv.polygon(wobble(torso, seed + ('t',), .5), g, seed + ('torso',), .07)
    cv.stroke(wobble(torso + [torso[0]], seed + ('to',), .35), 1.9, INK, seed + ('too',))
    # shirt collar V and placket
    v = [(-16, -238), (16, -238), (0, -196)]
    cv.polygon(v, shirt, seed + ('v',), .03); cv.stroke(v + [v[0]], 1.5, INK, seed + ('vo',))
    cv.stroke([(0, -196), (1, -98)], 1.4, INK, seed + ('center',))
    for i, y in enumerate((-182, -156, -130)):
        cv.polygon([(-2.5, y - 2.5), (2.5, y - 2.5), (2.5, y + 2.5), (-2.5, y + 2.5)], trim, seed + ('b', i), .0)
    if c.get('strap'):
        sc = rgb(c['strap']); strap = [(-30, -236), (-20, -236), (36, -104), (26, -100)]
        cv.polygon(strap, sc, seed + ('strap',), .04); cv.stroke(strap + [strap[0]], 1.5, INK, seed + ('so',))
    if c.get('pocket', True):
        cv.stroke([(14, -150), (32, -150), (32, -134), (14, -134), (14, -150)], 1.3, INK, seed + ('pk',))
    body = cv.result()
    # separate canvas for the lower body so it sits beneath the torso
    low = Canvas(size, to_px)
    view = {'legs': fit['legs']}
    draw_lower_body(low, view, c['lower'], INK, seed)
    base = low.result(); base.alpha_composite(body)
    return base, flaps, to_px


def derive_cuff(body, flap, to_px):
    mask = Image.new('L', body.size, 0)
    ImageDraw.Draw(mask).polygon([to_px(p) for p in flap], fill=255)
    cuff = Image.new('RGBA', body.size, (0, 0, 0, 0)); cuff.paste(body, (0, 0), mask)
    return cuff


def build(fit_pkg, out, cast):
    fit_pkg, out = Path(fit_pkg), Path(out)
    if out.exists():
        raise SystemExit('Output exists; will not overwrite: ' + str(out))
    src = json.loads((fit_pkg / 'package.json').read_text())
    fit = src['views']['front']
    (out / 'front').mkdir(parents=True)
    seed = (cast['character_id'], 'front')
    body, flaps, to_px = paint_body(cast, fit, seed)
    # head lift + neck (neck painted over the torso, under the head)
    rise = cast.get('neck_rise', 20.)
    hm = np.array(fit['sprites']['head']['image_to_local'], float)
    default = cast['default_expression']
    heads, chin = {}, None
    for expr in cast['expressions']:
        im = paint_head(cast, cast['character_id'], expr, seed)
        path = f'front/head-{expr}.png'; im.save(out / path)
        heads[expr] = {'path': path, 'sha256': sha(out / path), 'image_to_local': [[hm[0, 0], 0, hm[0, 2]], [0, hm[1, 1], hm[1, 2] - rise], [0, 0, 1]]}
        if expr == default:
            a = np.asarray(im)[:, :, 3] > 40
            ys, xs = np.nonzero(a); low = ys > ys.max() - .08 * (ys.max() - ys.min())
            chin = (hm[0, 0] * xs[low].mean() + hm[0, 2], hm[1, 1] * ys.max() + hm[1, 2] - rise)
    over = Canvas(body.size, to_px)
    draw_neck(over, chin[0], chin[1] - 10, -222., INK, rgb(cast['skin']), rgb(cast['skin_shadow']), seed)
    body.alpha_composite(over.result())
    body = mottle(body, seed + ('bodygrain',), .015)
    body.save(out / 'front/body.png')
    sprites = {'body': {'path': 'front/body.png', 'sha256': sha(out / 'front/body.png'), 'image_to_local': [[1 / 3, 0, -90], [0, 1 / 3, -270], [0, 0, 1]]},
               'head': heads[default], 'heads': heads}
    arms = json.loads(json.dumps(fit['arms']))
    for side in ('left', 'right'):
        cuff = derive_cuff(Image.open(out / 'front/body.png').convert('RGBA'), flaps[side], to_px)
        cuff.save(out / f'front/cuff-{side}.png')
        arms[side]['cuff'] = {'path': f'front/cuff-{side}.png', 'sha256': sha(out / f'front/cuff-{side}.png'), 'image_to_local': [[1 / 3, 0, -90], [0, 1 / 3, -270], [0, 0, 1]]}
    legs = json.loads(json.dumps(fit['legs']))
    for side in legs:
        img, m = draw_shoe(cast['shoes'], 'forward', INK, seed + (side,))
        rel = f'front/shoe-{side}.png'; img.save(out / rel)
        legs[side]['foot_asset'] = {'path': rel, 'sha256': sha(out / rel), 'image_to_local': m}; legs[side]['foot_size'] = [24, 15]
    band = chin[1] - 7
    view = {'facing': 'forward', 'sprites': sprites, 'arms': arms, 'legs': legs, 'ink_color': '#4a2e2e', 'arm_depth_order': fit.get('arm_depth_order', ['left', 'right']),
            'neck_attachment': {'mount_polygon': [[chin[0] - 6, band], [chin[0] + 6, band], [chin[0] + 6, band + 3], [chin[0] - 6, band + 3]], 'min_overlap_fraction': .7, 'min_overlap_thickness': 2.},
            'metadata': {'facing': 'forward', 'view_authorship': 'Original procedural painting (b6_original_cast.py); numeric rig fit borrowed, no bundled pixels'}}
    doc = {'schema': 'b6-puppet/1', 'binding_version': 2, 'character_id': cast['character_id'], 'display_name': cast['display_name'], 'coordinate_system': src['coordinate_system'],
           'views': {'front': view}, 'style': {'reference': 'B6 Sample1 Eiffel V44 grammar', 'paint': 'matte mottled pigment anchored in sprite space; pressure-varying ink'},
           'provenance': {'generator': 'b6_original_cast.py', 'spec': cast}, 'required_views': ['front'],
           'tested_scope': {'status': 'stationary front view only; five authored arm actions', 'unverified': ['walking', 'sitting', 'other views']}}
    (out / 'package.json').write_text(json.dumps(doc, indent=2) + '\n')
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('fit'); ap.add_argument('out'); ap.add_argument('cast')
    a = ap.parse_args()
    print(json.dumps({'package': str(build(a.fit, a.out, json.loads(Path(a.cast).read_text())))}))


if __name__ == '__main__':
    main()
