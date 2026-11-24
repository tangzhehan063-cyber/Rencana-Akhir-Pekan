#!/usr/bin/env python3
"""Lock narration timing for a Three.js film BEFORE animating or rendering.

  python3 scripts/vo-schedule.py <project_dir> --check          # cost estimate only (no audio needed)
  python3 scripts/vo-schedule.py <project_dir> [--tempo 1.03] [--lead 0.3] [--gap 0.18] [--duration 71]

<project_dir>/script.json:
  {"voice_dir": "audio/vo",                       # lNN.mp3 / lNN.wav per line, relative to project_dir
   "lines": [{"id": 1, "text": "...", "plan": 0.2, "voiced": true, "gain_db": 0}, ...],   # gain_db: level-match a line from another provider   # plan = rough wanted start (s); voiced:false = text-only line
   "extra_captions": [{"start": 66.2, "end": 68.2, "text": "...", "machine": true, "hold": 68.4}]}   # e.g. on-screen machine text

Writes (relative to <project_dir>):  three/captions.json (real speech timing), three/out/voice.wav (mono, placed on the timeline),
three/out/vo-schedule.json (per-line start/end: build shot t0/t1 from this).  Lines are silence-trimmed, sped up by --tempo (pitch kept),
placed no earlier than plan-lead and never overlapping.  Deterministic: same inputs -> same outputs.
"""
import argparse, json, os, subprocess, wave, numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('--tempo', type=float, default=1.03); ap.add_argument('--lead', type=float, default=0.3)
ap.add_argument('--gap', type=float, default=0.18); ap.add_argument('--duration', type=float, default=71.0); ap.add_argument('--out', default='three'); ap.add_argument('--check', action='store_true', help='only print the voiced character count (cost estimate); needs no audio'); a = ap.parse_args()
SR = 48000; P = os.path.abspath(a.project); cfg = json.load(open(os.path.join(P, 'script.json'))); vdir = os.path.join(P, cfg.get('voice_dir', 'audio/vo'))
chars = sum(len(L['text']) for L in cfg['lines'] if L.get('voiced', True)); print(f"voiced characters: {chars} (ElevenLabs measured ~1 credit/char; check balance BEFORE generating)")
if a.check: raise SystemExit(0)
os.makedirs(os.path.join(P, a.out, 'out'), exist_ok=True)
def load(i):
    f = next((os.path.join(vdir, f'l{i:02d}{e}') for e in ('.mp3', '.wav') if os.path.exists(os.path.join(vdir, f'l{i:02d}{e}'))), None)
    if not f: raise SystemExit(f'missing voice file for line {i} in {vdir}')
    af = ('silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.05,areverse,atempo=%s' % a.tempo)
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-af', af, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
out = np.zeros(int(a.duration * SR), np.float32); sched = []; prev_end = 0.0; caps = []
for L in cfg['lines']:
    if L.get('voiced', True):
        x = load(L['id']) * 10 ** (L.get('gain_db', 0) / 20); d = len(x) / SR; s = max(L['plan'] - a.lead, prev_end + a.gap); e = s + d; k = int(s * SR); out[k:k + len(x)] += x[:len(out) - k]
        sched.append({'id': L['id'], 'text': L['text'], 'plan': L['plan'], 'start': round(s, 3), 'end': round(e, 3), 'dev': round(s - L['plan'], 2)}); prev_end = e
        caps.append({'start': round(s - 0.04, 3), 'end': round(e, 3), 'text': L['text'], 'machine': False, 'hold': round(e + 0.22, 3)})
    else:   # text-only line (e.g. voice not generated): shown after the previous voiced line, never silently dropped
        s = prev_end + 0.35; sched.append({'id': L['id'], 'text': L['text'], 'plan': L['plan'], 'start': round(s, 3), 'end': round(s + 3.2, 3), 'dev': round(s - L['plan'], 2), 'voiced': False})
        caps.append({'start': round(s, 3), 'end': round(s + 3.2, 3), 'text': L['text'], 'machine': False, 'hold': round(s + 3.4, 3)}); prev_end = s + 3.2
caps += cfg.get('extra_captions', [])
for s in sched: print(f"l{s['id']:02d} plan {s['plan']:5.1f} -> {s['start']:6.2f}-{s['end']:6.2f} dev {s['dev']:+.2f}{'  (no voice)' if s.get('voiced') is False else ''}  {s['text'][:38]}")
late = [s for s in sched if s['dev'] > 0.5]; print(f"{len(sched)} lines, last end {sched[-1]['end']}s of {a.duration}s; lines later than plan+0.5s: {[s['id'] for s in late] or 'none'}")
pk = float(np.abs(out).max()); out *= 0.89 / pk if pk > 0 else 1
w = wave.open(os.path.join(P, a.out, 'out', 'voice.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes()); w.close()
json.dump(sched, open(os.path.join(P, a.out, 'out', 'vo-schedule.json'), 'w'), indent=1, ensure_ascii=False); json.dump(caps, open(os.path.join(P, a.out, 'captions.json'), 'w'), indent=1, ensure_ascii=False)
