"""Clothed-proportion packages: geometry, determinism, identity preservation, runtime acceptance."""
from pathlib import Path
import hashlib, importlib.util, json, sys, tempfile, unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CH = ROOT/'assets/b6/characters'
def load(name, rel):
    spec = importlib.util.spec_from_file_location(name, ROOT/rel)
    mod = importlib.util.module_from_spec(spec); sys.modules[name] = mod; spec.loader.exec_module(mod); return mod
wardrobe = load('b6_wardrobe', 'scripts/b6_wardrobe.py')
rt = load('b6_puppet', 'scripts/b6_puppet.py')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
NAMES = ('kiosk_keeper', 'parcel_runner')

class Wardrobe(unittest.TestCase):
    def test_regeneration_is_byte_identical(self):
        for name in NAMES:
            with tempfile.TemporaryDirectory() as d:
                out = Path(d)/'pkg'
                wardrobe.build(CH/name, out, json.loads((CH/f'wardrobe/{name}_v2.json').read_text()))
                for p in (CH/f'{name}_v2').rglob('*.png'):
                    self.assertEqual(sha(p), sha(out/p.relative_to(CH/f'{name}_v2')), p.name)

    def test_identity_assets_are_unchanged(self):
        for name in NAMES:
            for view in ('front', 'three_quarter', 'side'):
                for part in ('head.png', 'cuff-left.png', 'cuff-right.png'):
                    self.assertEqual(sha(CH/name/view/part), sha(CH/f'{name}_v2'/view/part))

    def test_neck_waist_trousers_shoes_exist_and_scale_is_uniform(self):
        for name in NAMES:
            pkg = json.loads((CH/f'{name}_v2/package.json').read_text())
            for vid, view in pkg['views'].items():
                m = np.array(view['sprites']['body']['image_to_local'])
                self.assertAlmostEqual(m[0, 0], m[1, 1]); self.assertEqual(m[0, 1], 0)
                body = np.asarray(Image.open(CH/f'{name}_v2'/view['sprites']['body']['path']).convert('RGBA'))[:, :, 3] > 40
                row = lambda y: int((y - m[1, 2]) / m[1, 1])
                self.assertGreater(body[row(-60)].sum(), 20, f'{vid}: no trouser legs at knee height')
                self.assertGreater(body[row(-99)].sum(), 60, f'{vid}: no waist/hip block')
                self.assertTrue(body[row(-228)].any(), f'{vid}: no neck above shirt')
                for leg in view['legs'].values():
                    self.assertIn('foot_asset', leg)
                src = json.loads((CH/name/'package.json').read_text())['views'][vid]['sprites']['head']['image_to_local']
                self.assertLess(view['sprites']['head']['image_to_local'][1][2], src[1][2], 'head not lifted to expose neck')

    def test_runtime_accepts_every_view_and_action(self):
        for name in NAMES:
            ch = rt.load_character(str(CH/f'{name}_v2'))
            for view in ch.views:
                for action in rt.ACTIONS:
                    pu = rt.Puppet(ch, view, 'a')
                    pose = pu.pose(action=action, phase=1, placement=[[1.3, 0, 320], [0, 1.3, 600], [0, 0, 1]], frame_index=0)
                    r = rt.render_scene((640, 680), [pose], frame_index=0)
                    self.assertEqual(r.qa['errors'], [], (name, view, action))

if __name__ == '__main__':
    unittest.main()
