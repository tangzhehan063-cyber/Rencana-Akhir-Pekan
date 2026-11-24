# B6 quality refinement: story, clothed proportions, temporal stability

Additive to the B6 contracts. It changes no style lock, threshold or approval gate.

## 1. Story before art (run before any painting, narration or animation)

Write `story-ledger.json` (example: `examples/b6-story/ledger.json`) and run:

```bash
python3 scripts/b6_story_review.py story-ledger.json
```

It blocks production when: a role is missing or out of order (hook, setup, conflict, escalation, turning_point, payoff, ending; one scene may carry two roles); a scene lacks `wants`, `action`, `obstacle`, `visual_carrier` (what a muted viewer understands), a `changes` entry (objective, situation, emotion, knowledge, relationship, object_state, stakes or direction) or `leads_to` (why it causes the next scene); intensity never varies (quiet beats are required); escalation drops; the payoff does not `callback_to` an earlier scene; a joke has no earlier setup or no timing beat; the ending is a generic closer. It warns when narration repeats what the picture already shows, when a scene is silent without saying so, or when over 40% of scenes are intensity 4+.

A passing ledger permits production. It does not prove the story is good: still read the film muted, then the narration alone, then together.

## 2. Clothed proportions without a new style

`scripts/b6_wardrobe.py SRC OUT WARDROBE.json` derives a package from an approved one. Head, face, expressions, hair, sleeves, cuffs and arm fits are copied unchanged; it adds a neck (head lifted `neck_rise`, default 20 local units), a waist and pelvis block, trousers/shorts/skirt and painted shoes. Output is deterministic and is validated by the unchanged `b6_puppet` loader. Shipped examples: `characters/kiosk_keeper_v2`, `characters/parcel_runner_v2` (specs in `characters/wardrobe/`). Choose garments from the character's job, weather and era; do not reuse one outfit for the cast.

Limits, stated plainly: stance poses only. Walking, running, sitting and back views are **not** solved here; the runtime still does not claim gait. Trousers are painted into the body sprite, so large `ankle_targets` offsets can expose the leg stroke beside the hem; keep leans small or author a stance variant.

## 3. Temporal stability

Measured on the V90 reference engine over all 600 frames: output is a pure function of time (identical pixels on re-render), the highlight bloom pass contributes no sparkle (disabling it changed nothing), and x264 adds none. A naive frame-difference counts thin ink lines moving 1–2 px as sparkle; do not use one. Use:

```bash
python3 scripts/b6_temporal_audit.py film.mp4 [--start S --seconds N]
```

It flags one-frame spikes whose neighbourhood stayed still (glitter, swimming texture) and per-tile brightness zig-zags away from cuts (unmotivated flicker). Run it on every preview. Do not raise the thresholds to pass; find the source. Static assets keep their grain in asset space; no per-frame RNG, `Math.random`, wall-clock reads or additive sub-pixel particles unless the scene needs them (`three-scene-preflight.cjs` now rejects the first three and warns on the last).

The pinned dependencies matter: the V90 engine needs `numpy==2.0.2` (`np.cross` on 2-D vectors was removed in later releases).
