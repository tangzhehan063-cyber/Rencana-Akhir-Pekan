"""Story-ledger gate: a good ledger passes; each structural weakness is caught."""
from pathlib import Path
import copy, importlib.util, json, sys, unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('b6_story_review', ROOT/'scripts/b6_story_review.py')
mod = importlib.util.module_from_spec(spec); sys.modules['b6_story_review'] = mod; spec.loader.exec_module(mod)
GOOD = json.loads((ROOT/'examples/b6-story/ledger.json').read_text())

def broken(fn):
    d = copy.deepcopy(GOOD); fn(d); return mod.review(d)

class StoryReview(unittest.TestCase):
    def test_example_passes(self):
        self.assertTrue(mod.review(GOOD)['ok'], mod.review(GOOD))
    def test_missing_turning_point(self):
        r = broken(lambda d: d['scenes'].__delitem__(4)); self.assertFalse(r['ok'])
    def test_scene_must_change_something(self):
        r = broken(lambda d: d['scenes'][2].update(changes={})); self.assertFalse(r['ok'])
    def test_causal_link_required(self):
        r = broken(lambda d: d['scenes'][1].update(leads_to='')); self.assertFalse(r['ok'])
    def test_flat_intensity_rejected(self):
        def f(d):
            for s in d['scenes']: s['intensity'] = 3
        self.assertFalse(broken(f)['ok'])
    def test_generic_ending_rejected(self):
        r = broken(lambda d: d['scenes'][-1].update(narration='Never give up on your dreams.')); self.assertFalse(r['ok'])
    def test_payoff_must_callback_earlier_scene(self):
        r = broken(lambda d: d['scenes'][-1].update(callback_to='s9')); self.assertFalse(r['ok'])
    def test_literal_narration_warned(self):
        def f(d): d['scenes'][0]['narration'] = d['scenes'][0]['visual_carrier']
        self.assertTrue(any('repeats' in w for w in broken(f)['warnings']))
    def test_joke_needs_earlier_setup(self):
        r = broken(lambda d: d['scenes'][-1]['joke'].update(setup_scene='s6')); self.assertFalse(r['ok'])

if __name__ == '__main__':
    unittest.main()
