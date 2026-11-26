"""Temporal audit and rendering determinism: glitter must be detectable and renders repeatable."""
from pathlib import Path
import importlib.util, sys, unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
def load(name, rel):
    spec = importlib.util.spec_from_file_location(name, ROOT/rel)
    mod = importlib.util.module_from_spec(spec); sys.modules[name] = mod; spec.loader.exec_module(mod); return mod
audit = load('b6_temporal_audit', 'scripts/b6_temporal_audit.py')

def still(h=120, w=160):
    rng = np.random.RandomState(3)
    base = np.full((h, w, 3), 140, np.uint8); base[40:80, 30:90] = (200, 120, 90)
    return base

class TemporalAudit(unittest.TestCase):
    def test_static_frames_are_clean(self):
        frames = [still() for _ in range(8)]
        r = audit.audit(frames)
        self.assertEqual(r['sparkle_pixels_total'], 0); self.assertEqual(r['luma_pulse_tiles'], 0)

    def test_single_frame_speck_is_flagged(self):
        frames = [still() for _ in range(8)]
        frames[4] = frames[4].copy(); frames[4][10, 10] = (255, 255, 255)
        self.assertGreaterEqual(audit.audit(frames)['sparkle_pixels_total'], 1)

    def test_moving_edge_is_not_sparkle(self):
        frames = []
        for i in range(10):
            f = still(); f[:, 60 + 2 * i:64 + 2 * i] = (20, 20, 20); frames.append(f)
        self.assertEqual(audit.audit(frames)['sparkle_pixels_total'], 0)

    def test_alternating_brightness_is_flicker_but_a_cut_is_not(self):
        flicker = [np.full((64, 64, 3), 100 + (12 if i % 2 else 0), np.uint8) for i in range(10)]
        self.assertGreater(audit.audit(flicker)['luma_pulse_tiles'], 0)
        cut = [np.full((64, 64, 3), 60, np.uint8)] * 5 + [np.full((64, 64, 3), 200, np.uint8)] * 5
        self.assertEqual(audit.audit(cut)['luma_pulse_tiles'], 0)

class PuppetDeterminism(unittest.TestCase):
    def test_same_pose_renders_identical_pixels_at_any_frame_index(self):
        """No per-frame noise: a held pose must not change texture between frames."""
        rt = load('b6_puppet', 'scripts/b6_puppet.py')
        ch = rt.load_character(str(ROOT/'assets/b6/characters/kiosk_keeper'))
        m = [[1.2, 0, 300], [0, 1.2, 560], [0, 0, 1]]
        outs = []
        for i in range(3):
            pu = rt.Puppet(ch, 'front', 'a')
            r = rt.render_scene((640, 640), [pu.pose(placement=m, frame_index=i)], frame_index=i)
            outs.append(np.asarray(r.beauty).tobytes())
        self.assertTrue(outs[0] == outs[1] == outs[2])

if __name__ == '__main__':
    unittest.main()
