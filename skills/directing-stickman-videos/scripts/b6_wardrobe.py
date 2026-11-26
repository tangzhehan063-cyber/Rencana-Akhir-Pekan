#!/usr/bin/env python3
"""Derive a clothed-proportion B6 puppet package from an approved package.

Adds a neck, a waist/hip block, trouser (or shorts/skirt) legs and painted
shoes to the *existing approved* head, torso, sleeves and arms. Nothing the
approved identity owns is redrawn: the head, face, hair, shirt, cuffs and
hand/arm fits are copied byte for byte. Only the head is lifted by `neck_rise`
so the neck is visible; all added art lives in the body sprite (anchored to
the character, so it cannot swim) or in a per-leg `foot_asset`.

Generation is deterministic (seeded by character/view/part): same inputs give
byte-identical PNGs. Usage:
    b6_wardrobe.py SRC_PACKAGE OUT_PACKAGE WARDROBE.json
The result is validated by the unchanged b6_puppet loader before it is kept.
"""
from pathlib import Path
import argparse, hashlib, json, math, shutil, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 3                                    # supersampling for drawn shapes
STYLES = ('trousers', 'shorts', 'skirt')
SHOES = ('sneaker', 'boot', 'dress')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rgb(hexcolor):
    h = hexcolor.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, k):
    return tuple(int(max(0, min(255, v * k))) for v in c)


def rng(*parts):
    return np.random.RandomState(zlib.crc32('|'.join(map(str, parts)).encode()))


class Canvas:
    """Local-unit drawing surface over an existing sprite grid."""
    def __init__(self, size, to_px):
        self.size = size
        self.to_px = to_px                    # local (x, y) -> sprite px
        self.img = Image.new('RGBA', (size[0] * SS, size[1] * SS), (0, 0, 0, 0))

    def px(self, p):
        x, y = self.to_px(p)
        return x * SS, y * SS

    def polygon(self, pts, fill, seed, grain=.05):
        mask = Image.new('L', self.img.size, 0)
        ImageDraw.Draw(mask).polygon([self.px(p) for p in pts], fill=255)
        w, h = self.img.size
        low = rng(*seed).uniform(-1, 1, (max(2, h // 36), max(2, w // 36))).astype(np.float32)
        noise = np.asarray(Image.fromarray(low).resize((w, h), Image.BICUBIC))
        base = np.empty((h, w, 3), np.float32)
        base[:] = fill
        base *= (1 + grain * noise)[:, :, None]
        layer = np.dstack((np.clip(base, 0, 255), np.asarray(mask, np.float32))).astype(np.uint8)
        self.img.alpha_composite(Image.fromarray(layer))

    def stroke(self, pts, width, color, seed):
        """Pressure-varying ink line, deterministic and anchored to the asset."""
        d = ImageDraw.Draw(self.img)
        phase = (zlib.crc32('|'.join(map(str, seed)).encode()) % 997) / 997 * 2 * math.pi
        pts = [self.px(p) for p in pts]
        total = sum(math.dist(a, b) for a, b in zip(pts, pts[1:])) or 1
        run = 0
        for a, b in zip(pts, pts[1:]):
            n = max(2, int(math.dist(a, b) / 2))
            for i in range(n):
                u = (run + math.dist(a, b) * i / n) / total
                r = width * 3 * SS * .5 * (1 + .12 * math.sin(u * 5 * math.pi + phase) + .05 * math.sin(u * 17 * math.pi))
                x = a[0] + (b[0] - a[0]) * i / n
                y = a[1] + (b[1] - a[1]) * i / n
                d.ellipse((x - r, y - r, x + r, y + r), fill=color + (255,))
            run += math.dist(a, b)

    def result(self):
        return self.img.resize(self.size, Image.LANCZOS)


def wobble(pts, seed, amp=.45):
    """Small fixed edge irregularity: part of the shape, never animated."""
    r = rng(*seed)
    return [(x + r.uniform(-amp, amp), y + r.uniform(-amp, amp)) for x, y in pts]


def leg_geometry(view):
    L, R = view['legs']['left'], view['legs']['right']
    gap = abs(R['hip'][0] - L['hip'][0])
    half_hip = max(8., min(15., gap * .36))
    return L, R, half_hip


def draw_lower_body(cv, view, spec, ink, seed):
    L, R, half_hip = leg_geometry(view)
    style = spec['style']
    cloth = rgb(spec['color'])
    top = -101.
    hem = {'trousers': -27., 'shorts': -58., 'skirt': -52.}[style]
    cx0 = min(L['hip'][0], R['hip'][0]) - half_hip - 1
    cx1 = max(L['hip'][0], R['hip'][0]) + half_hip + 1
    if style == 'skirt':
        mid = (cx0 + cx1) / 2
        poly = wobble([(cx0, top), (cx1, top), (cx1 + 11, hem), (mid, hem + 2), (cx0 - 11, hem)], seed + ('skirt',))
        cv.polygon(poly, cloth, seed + ('skirt',))
        cv.stroke(poly + [poly[0]], 2.1, ink, seed + ('skirt-ink',))
        return
    # Pelvis block: both legs share it, so the figure has a real waist and hips.
    crotch = top + 24
    legs = []
    for leg in (L, R):
        hx, ax = leg['hip'][0], leg['ankle'][0]
        t = (hem - leg['hip'][1]) / (leg['ankle'][1] - leg['hip'][1])
        hx_hem = hx + (ax - hx) * t
        wk = half_hip * .76
        legs.append([(hx - half_hip, top), (hx + half_hip, top), (hx_hem + wk, hem), (hx_hem - wk, hem)])
    inner = (L['hip'][0] + R['hip'][0]) / 2
    pelvis = [(cx0, top), (cx1, top), (cx1, crotch), (inner, crotch + 6), (cx0, crotch)]
    for i, poly in enumerate([pelvis] + legs):
        cv.polygon(wobble(poly, seed + (i,)), cloth, seed + ('fill', i))
    # Ink: outer silhouette per leg, crotch seam, no fabric folds.
    for i, poly in enumerate(legs):
        outer = [poly[0], poly[3], poly[2], poly[1]] if i == 0 else [poly[1], poly[2], poly[3], poly[0]]
        cv.stroke(wobble(outer, seed + ('ink', i), .3), 2.0, ink, seed + ('ink', i))
    # Crotch: two short inner-leg ink edges meeting the pelvis, no loose seam line.
    for leg, sgn in ((L, 1), (R, -1)):
        e = leg['hip'][0] + sgn * half_hip
        cv.stroke([(e, top + 8), (e, crotch + 2), ((e + inner) / 2, crotch + 5)], 1.6, ink, seed + ('crotch', sgn))
    # Waistband and a hem cuff, the two marks that make it read as trousers.
    belt = rgb(spec.get('belt', spec['color']))
    cv.polygon([(cx0, top - 1), (cx1, top - 1), (cx1, top + 5), (cx0, top + 5)], shade(belt, .75), seed + ('belt',), .03)
    cv.stroke([(cx0, top + 5), (cx1, top + 5)], 1.6, ink, seed + ('belt-ink',))
    for i, poly in enumerate(legs):
        cv.stroke([poly[3], poly[2]], 2.0, ink, seed + ('hem', i))


def draw_neck(cv, cx, top, bottom, ink, skin, shadow, seed, flat=False):
    half_top, half_bot = 8.5, 10.5
    vee = 0 if flat else 11.
    poly = [(cx - half_top, top), (cx + half_top, top), (cx + half_bot, bottom), (cx, bottom + vee), (cx - half_bot, bottom)]
    cv.polygon(poly, skin, seed + ('neck',), .015)
    cut = top + (bottom - top) * .42
    under = [(cx - half_top, top), (cx + half_top, top), (cx + half_top + .2 * (half_bot - half_top), cut),
             (cx - half_top - .2 * (half_bot - half_top), cut)]
    cv.polygon(under, shadow, seed + ('neck-shadow',), .01)
    cv.stroke(wobble([(cx - half_top, top), (cx - half_bot, bottom), (cx, bottom + vee)], seed + ('nl',), .25), 1.8, ink, seed + ('nl',))
    cv.stroke(wobble([(cx + half_top, top), (cx + half_bot, bottom), (cx, bottom + vee)], seed + ('nr',), .25), 1.8, ink, seed + ('nr',))


def draw_shoe(spec_shoe, facing, ink, seed):
    """Return (RGBA image, image_to_local 3x3) with the ankle at local origin."""
    k = 4                                      # px per local unit
    style = spec_shoe['style']
    upper = rgb(spec_shoe['color']);sole = rgb(spec_shoe.get('sole', '#efe6d6'))
    front = facing == 'forward'
    w, h = (24, 15) if front else (36, 15)
    boot = style == 'boot'
    ox, oy = w * (.5 if front else (.34 if facing == 'right' else .66)), 4.
    H = h + (4 if boot else 0)
    W, Hh = int(w * k) + 8, int(H * k) + 8
    cv = Canvas((W, Hh), lambda p: (p[0] * k + 4 + ox * k, p[1] * k + 4 + oy * k))
    # Local coords: ankle at (0,0); ground about y=+4.5.
    d = 1 if facing in ('right', 'forward') else -1
    if front:
        shape = [(-11, -3), (11, -3), (12, 5), (9, 10.4), (-9, 10.4), (-12, 5)]
    else:
        toe = 19 * d; heel = -12 * d
        shape = [(heel, -3), (heel + 5 * d, -3), (toe * .55, 0), (toe, 5), (toe * .98, 10.4), (heel * .95, 10.4)]
        if boot:
            shape[0] = (heel, -9); shape[1] = (heel + 8 * d, -9)
    cv.polygon(wobble(shape, seed + ('shoe',), .25), upper, seed + ('shoe',), .06)
    soleband = [(x, y) for x, y in shape if y > 8]
    if len(soleband) >= 2:
        xs = [p[0] for p in soleband]
        cv.polygon([(min(xs), 6.8), (max(xs), 6.8), (max(xs), 10.4), (min(xs), 10.4)], sole, seed + ('sole',), .02)
    cv.stroke(wobble(shape + [shape[0]], seed + ('shoe-ink',), .2), 2.0, ink, seed + ('shoe-ink',))
    img = cv.result()
    m = [[1 / k, 0, -(4 + ox * k) / k], [0, 1 / k, -(4 + oy * k) / k], [0, 0, 1]]
    return img, m


def build(src, out, wardrobe):
    src, out = Path(src), Path(out)
    if out.exists():
        raise SystemExit('Output exists; will not overwrite: ' + str(out))
    pkg = json.loads((src / 'package.json').read_text())
    shutil.copytree(src, out)
    pkg['character_id'] = wardrobe.get('character_id', pkg['character_id'] + '_clothed')
    pkg['binding_version'] = 2
    pkg['display_name'] = wardrobe.get('display_name', pkg['display_name'] + ' (clothed proportions)')
    ink = rgb(pkg['views']['front'].get('ink_color', '#4a2e2e'))
    skin, shadow = rgb(wardrobe.get('skin', '#f6ecec')), rgb(wardrobe.get('skin_shadow', '#d9c5dc'))
    rise = float(wardrobe.get('neck_rise', 20))
    for vid, view in pkg['views'].items():
        seed = (pkg['character_id'], vid)
        body = view['sprites']['body']
        bm = np.array(body['image_to_local'], float)
        with Image.open(out / body['path']) as _im:
            size = _im.size
        inv = lambda p: ((p[0] - bm[0, 2]) / bm[0, 0], (p[1] - bm[1, 2]) / bm[1, 1])
        to_px = lambda p: ((p[0] - bm[0, 2]) / bm[0, 0], (p[1] - bm[1, 2]) / bm[1, 1])
        # Head lift; neck centre follows the head's actual chin.
        hm = np.array(view['sprites']['head']['image_to_local'], float)
        head_img = np.asarray(Image.open(out / view['sprites']['head']['path']).convert('RGBA'))
        ys, xs = np.nonzero(head_img[:, :, 3] > 40)
        low = ys > ys.max() - .08 * (ys.max() - ys.min())
        chin_x = hm[0, 0] * xs[low].mean() + hm[0, 2]
        for item in [view['sprites']['head'], *view['sprites'].get('heads', {}).values()]:
            item['image_to_local'][1][2] -= rise
        chin_y = hm[1, 1] * ys.max() + hm[1, 2] - rise
        # The approved sprite stops at the vest hem (local y -90): extend the
        # canvas down to the ground so trousers are not clipped.
        tall = (size[0], int(round((0 - bm[1, 2]) / bm[1, 1])) + 6)
        under = Canvas(tall, to_px)
        draw_lower_body(under, view, wardrobe['lower'], ink, seed)
        merged = under.result()
        base = Image.open(out / body['path']).convert('RGBA')
        merged.alpha_composite(base)                  # approved art stays on top
        # Skin neck rises out of the neckline, over the shirt's collar V.
        over = Canvas(tall, to_px)
        draw_neck(over, chin_x, chin_y - 10, wardrobe.get('neckline', -222.), ink, skin, shadow, seed, flat=(view['facing'] not in ('forward',) and vid == 'side'))
        merged.alpha_composite(over.result())
        merged.save(out / body['path'], optimize=False)
        # Binding v2 contract: a band on the painted neck, just under the chin,
        # where head and neck art really overlap (checked by the runtime loader).
        band = chin_y - 7
        view['neck_attachment'] = {'mount_polygon': [[chin_x - 6, band], [chin_x + 6, band], [chin_x + 6, band + 3], [chin_x - 6, band + 3]],
                                   'min_overlap_fraction': 0.7, 'min_overlap_thickness': 2.0}
        body['sha256'] = sha(out / body['path'])
        for side, leg in view['legs'].items():
            img, m = draw_shoe(wardrobe['shoes'], view['facing'], ink, seed + (side,))
            rel = f'{vid}/shoe-{side}.png'
            img.save(out / rel)
            leg['foot_asset'] = {'path': rel, 'sha256': sha(out / rel), 'image_to_local': m}
            leg['foot_size'] = [20, 9]
        view['ink_color'] = view.get('ink_color', '#4a2e2e')
    pkg.setdefault('metadata', {})['wardrobe'] = {
        'derived_from': pkg.get('character_id'), 'generator': 'b6_wardrobe.py', 'spec': wardrobe,
        'unchanged': ['head sprites', 'expressions', 'sleeves and cuffs', 'arm fits and poses'],
        'unverified': ['walking gait', 'sitting pose', 'back view']}
    (out / 'package.json').write_text(json.dumps(pkg, indent=2) + '\n')
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('wardrobe')
    a = ap.parse_args()
    out = build(a.src, a.out, json.loads(Path(a.wardrobe).read_text()))
    print(json.dumps({'package': str(out)}))


if __name__ == '__main__':
    main()
