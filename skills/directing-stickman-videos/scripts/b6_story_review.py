#!/usr/bin/env python3
"""B6 story-ledger review: run before any art, narration or animation is made.

Checks narrative structure, not taste. A passing ledger permits production;
it does not prove the story is good. Findings are `errors` (block) and
`warnings` (judge). Usage: b6_story_review.py story-ledger.json
"""
import json
import re
import sys
from pathlib import Path

ROLES = ('hook', 'setup', 'conflict', 'escalation', 'turning_point', 'payoff', 'ending')
CHANGE_KINDS = ('objective', 'situation', 'emotion', 'knowledge', 'relationship',
                'object_state', 'stakes', 'direction')
SCENE_FIELDS = ('wants', 'action', 'obstacle', 'visual_carrier')
GENERIC_ENDINGS = ('believe in yourself', 'never give up', 'follow your dreams', 'the lesson is',
                   'moral of the story', 'remember to', 'just start today', 'every journey begins',
                   'you can do anything', 'so next time')
STOP = set('a an the and or but of to in on at is are was were it its he she they his her their this that with for as by from'.split())


def words(text):
    return [w for w in re.findall(r"[a-z0-9']+", (text or '').lower()) if w not in STOP]


def review(ledger):
    errors, warnings = [], []
    err, warn = errors.append, warnings.append
    scenes = ledger.get('scenes') or []
    if not ledger.get('protagonist', {}).get('wants'):
        err('protagonist.wants missing: the viewer must learn what the character wants')
    if len(scenes) < 4:
        err('fewer than 4 scenes cannot carry a hook, conflict, turn and payoff')
    ids = [s.get('id') for s in scenes]
    if len(set(ids)) != len(ids) or not all(ids):
        err('scene ids must be unique and non-empty')
    index = {s.get('id'): i for i, s in enumerate(scenes)}

    # Narrative arc: every role present, in order. Scenes may carry several roles.
    order = []
    for s in scenes:
        roles = s.get('roles') or ([s['role']] if s.get('role') else [])
        bad = [r for r in roles if r not in ROLES]
        if bad:
            err(f"{s.get('id')}: unknown role {bad}")
        order.append([r for r in roles if r in ROLES])
    flat = [(i, r) for i, rs in enumerate(order) for r in rs]
    for role in ROLES:
        if not any(r == role for _, r in flat):
            err(f'arc missing role: {role}')
    if flat:
        ranks = [ROLES.index(r) for _, r in flat]
        if ranks != sorted(ranks):
            err('arc roles are out of order (hook > setup > conflict > escalation > turning_point > payoff > ending)')
        if flat[0][1] != 'hook':
            err('first scene must be the hook')
        if flat[-1][1] != 'ending':
            err('last scene must be the ending')

    for i, s in enumerate(scenes):
        sid = s.get('id', f'#{i}')
        for f in SCENE_FIELDS:
            if len((s.get(f) or '').split()) < 2:
                err(f'{sid}: "{f}" missing or too thin to direct')
        ch = s.get('changes') or {}
        if ch.get('kind') not in CHANGE_KINDS or not ch.get('detail'):
            err(f'{sid}: must change one of {CHANGE_KINDS} with a detail; otherwise cut or redesign it')
        if i < len(scenes) - 1:
            if len((s.get('leads_to') or '').split()) < 3:
                err(f'{sid}: leads_to must say why this change causes the next scene')
        if len((s.get('visual_carrier') or '').split()) < 4:
            err(f'{sid}: visual_carrier must describe what a muted viewer understands')
        if not isinstance(s.get('intensity'), int) or not 1 <= s['intensity'] <= 5:
            err(f'{sid}: intensity must be an integer 1-5')
        # Narration should add, not illustrate.
        nar, vis = words(s.get('narration')), set(words(s.get('visual_carrier')))
        if len(nar) >= 5:
            overlap = sum(w in vis for w in nar) / len(nar)
            if overlap > .6:
                warn(f'{sid}: narration repeats {overlap:.0%} of what the picture already shows; add context or go silent')
        if not s.get('narration') and not s.get('silent'):
            warn(f'{sid}: no narration and not marked silent; confirm the silence is deliberate')

    # Escalation must actually rise, and the film needs contrast.
    esc = [s['intensity'] for s in scenes if 'escalation' in (s.get('roles') or [s.get('role')]) and isinstance(s.get('intensity'), int)]
    if len(esc) >= 2 and esc != sorted(esc):
        err('escalation scenes must not drop in intensity; reorder or relabel')
    levels = [s['intensity'] for s in scenes if isinstance(s.get('intensity'), int)]
    if levels and (max(levels) - min(levels) < 2):
        err('no contrast: intensities span less than 2 levels (needs quiet moments)')
    if levels and sum(l >= 4 for l in levels) > len(levels) * .4:
        warn('more than 40% of scenes are intensity 4+; exaggeration everywhere stops landing')

    # Payoff has to reinterpret the opening setup.
    for s in scenes:
        if 'payoff' in (s.get('roles') or [s.get('role')]):
            cb = s.get('callback_to')
            if cb not in index or index[cb] >= index[s['id']]:
                err(f"{s['id']}: payoff.callback_to must name an earlier scene (the setup it resolves)")

    # Jokes: setup before payoff, with a timing beat.
    for s in scenes:
        j = s.get('joke')
        if j:
            sid = s['id']
            if not (j.get('setup_scene') in index and index[j['setup_scene']] < index[sid]):
                err(f'{sid}: joke.setup_scene must name an earlier scene')
            if not j.get('payoff') or not j.get('timing'):
                err(f'{sid}: joke needs payoff and timing (pause, hold or reaction)')

    last = scenes[-1] if scenes else {}
    tail = ' '.join(str(last.get(k, '')) for k in ('narration', 'visual_carrier')).lower()
    for phrase in GENERIC_ENDINGS:
        if phrase in tail:
            err(f'ending uses generic closer "{phrase}"')
    first = (scenes[0].get('narration') or '').lower() if scenes else ''
    if re.match(r"\s*(hello|hi|hey|welcome|today we|in this video|did you know)", first):
        warn('hook opens with a greeting or stock formula; open on an event, contradiction or consequence')
    return {'ok': not errors, 'errors': errors, 'warnings': warnings, 'scenes': len(scenes)}


def main(argv):
    result = review(json.loads(Path(argv[1]).read_text()))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
