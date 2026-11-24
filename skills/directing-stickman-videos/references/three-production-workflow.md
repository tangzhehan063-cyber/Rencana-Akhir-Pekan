# Three.js Code Engine: voice-first production workflow

Applies to custom Three.js films (ABSEN, LANTAI 4, ORIENTASI). **Goal: render the full film once, with its final voice.** A full render is ~20 minutes of CPU; captions are burned into the frames, so anything that changes speech timing after rendering forces a second full render. Lock the voice first.

## Stages and gates (do not skip ahead; each gate is the user's decision)

| # | Stage | Output | Gate |
|---|---|---|---|
| 1 | **Naskah** | script text + shot plan (purpose of each shot: what changes, focal point, why this camera) in `projects/<name>/naskah-vN.txt` | user approves script |
| 2 | **Voice (VO)** | one audio file per line + locked timing | user chooses provider, then approves the voice |
| 3 | **Animation** | shots built on the locked timeline, reviewed as stills and short draft ranges only | user approves the animation |
| 4 | **Final render** | one full render with captions burned in, then mux voice + music/SFX | deliver |

## Stage 2 details: voice

1. **Ask which provider**: ElevenLabs (connector in the session; spends the account's credits) or Gemini TTS (`scripts/gemini-media.mjs`; needs an API key and network access to Google, which a restricted environment may block; its price is not verified here). Say if a provider is unreachable. Do not pick for the user when both work.
2. **Price it before generating.** Put the lines in `projects/<name>/script.json` and run `python3 scripts/vo-schedule.py projects/<name> --check` (needs no audio) to read the voiced character count (ElevenLabs measured ~1 credit per character). Check the account balance or use `estimate_only` first. A run that exhausts the quota mid-batch leaves a half-voiced film (this happened: 21 of 22 lines).
3. **One line per file, one take each** (`generations_count: 1`, never re-call to retry: it charges again). Pick a voice that fits the film's narrator character; name the voice and model in `naskah`. Download promptly (signed URLs expire in about 2 hours) into `projects/<name>/audio/vo/lNN.mp3` and **commit them**: they cost credits and are not reproducible for free.
4. **Lock the timing**: `python3 scripts/vo-schedule.py projects/<name> [--tempo 1.03] [--lead 0.3]` trims silence, places each line near its planned moment without overlap, writes `three/captions.json` from the real speech and `three/out/vo-schedule.json`. Captions are never hand-typed or estimated. A line without voice is kept as on-screen text, never silently dropped.
5. Let the user listen (audio only, no render) before stage 3.

## Stage 3 details: animation

- Take each shot's `t0/t1` from `vo-schedule.json` (the voice leads or lands on the action; a shot never waits for words that are not there yet). Total length = voice + deliberate silence, decided here, not after rendering.
- Reuse engine parts, rig, `expr()` and pose library; do not copy them into the project.
- Review with stills (`stills.cjs`, one per shot at several times), `three-scene-preflight.cjs`, `scripts/frame-baseline.cjs` and `scripts/expression-sheet.cjs` / `scripts/pose-sheet.cjs`. Render a video **range** only when motion must be judged; never the whole film.
- Check what stills cannot: shots are not blown out (bloom threshold, lights near white heads), subjects are in frame, text is readable at phone size.

## Stage 4 details: final

1. `node render.cjs 0 <end> out/video.mp4` once.
2. Mux: voice over a music/SFX bed with sidechain ducking and loudness normalisation, e.g.
   `ffmpeg -i bed.wav -i voice.wav -filter_complex "[1:a]aformat=channel_layouts=stereo,asplit=2[v][k];[0:a][k]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[bg];[bg]volume=0.85[b];[b][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]" -map "[a]" mix.wav` then `-c:v copy -c:a aac`.
3. If a late fix is needed, re-render **only the affected range** and splice (`trim`/`setpts`/`concat` at exact frame boundaries), not the whole film.

## Rules
- No full render before the voice is locked and the user has approved stage 3.
- A change to wording or timing after stage 2 goes back to stage 2.
- Disclose what was not checked (e.g. listening quality) instead of implying approval.
