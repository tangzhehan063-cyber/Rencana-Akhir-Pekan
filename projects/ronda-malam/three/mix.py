# python3 mix.py END OUT.wav  -> voices + SFX + night ambience + music (ducked under voice)
import subprocess, sys
END = float(sys.argv[1]); OUT = sys.argv[2]
L = '/home/user/Rencana-Akhir-Pekan/skills/directing-stickman-videos/assets/b-audio-library/audio'
NARR = '../audio/voices.wav'
K = 'sfx/kentongan.wav'; KF = 'aecho=0.8:0.6:420|780:0.35|0.2'  # far/empty-pos version
CRICKET_STOP = 55.2  # the night goes silent right before the whisper
cues = [
 (f'{L}/kresiek-amb-outside/amb_outdoor1_loop.ogg', 0.0, -27, None, 'aloop=loop=-1:size=2000000000,atrim=0:%.2f' % END),
 ('sfx/crickets.wav', 0.0, -27, None, 'aloop=loop=-1:size=2000000000,atrim=0:%.2f,afade=t=out:st=%.2f:d=0.25' % (CRICKET_STOP + 0.3, CRICKET_STOP)),
 ('sfx/crickets.wav', 86.5, -33, None, 'aloop=loop=-1:size=2000000000,atrim=0:9,afade=t=in:d=3'),
 (K, 0.2, -5, None, ''), (K, 0.75, -5, None, ''),
 ('sfx/boom.wav', 1.62, -15, None, ''), ('sfx/sub-drone.wav', 0.0, -22, 3.9, 'afade=t=out:st=3.3:d=0.6'),
 ('sfx/switch.wav', 13.85, -16, None, ''), ('sfx/switch.wav', 13.95, -18, None, ''),
 ('sfx/tone.wav', 28.1, -24, None, ''),
 (f'{L}/pauliuw-dog/Dog/Dog Bark 2.wav', 33.0, -32, None, 'aecho=0.8:0.6:300:0.3,lowpass=f=2500'),
 ('sfx/heartbeat.wav', 44.6, -16, None, ''), ('sfx/heartbeat.wav', 45.5, -16, None, ''),
 ('sfx/sub-drone.wav', 51.0, -20, 6.0, 'afade=t=in:d=1.5,afade=t=out:st=5.0:d=1.0'),
 ('sfx/boom.wav', 56.7, -12, None, ''),
 (f'{L}/antoine-nature/Nature Sounds Pack/Foliage/Foliage03.wav', 57.4, -24, None, ''),
 (K, 66.05, -4, None, KF), (K, 66.65, -4, None, KF), (K, 67.25, -4, None, KF),
 (f'{L}/kenney-rpg/doorClose_4.ogg', 69.75, -8, None, ''), ('sfx/bolt-slide.wav', 70.25, -10, None, ''), ('sfx/bolt-clack.wav', 70.5, -8, None, ''),
 ('sfx/switch.wav', 71.35, -14, None, ''), ('sfx/switch.wav', 71.6, -14, None, ''), ('sfx/switch.wav', 71.85, -14, None, ''), ('sfx/switch.wav', 72.05, -14, None, ''),
 (f'{L}/owlish-home-202/Cloth/Cloth_02.wav', 74.1, -20, None, ''),
 ('sfx/tone.wav', 80.3, -20, None, ''), ('sfx/boom.wav', 82.8, -12, None, ''), ('sfx/sub-drone.wav', 82.8, -18, 4.0, 'afade=t=out:st=3.2:d=0.8'),
 ('sfx/heartbeat.wav', 97.0, -14, None, ''), ('sfx/heartbeat.wav', 98.0, -13, None, ''), ('sfx/heartbeat.wav', 99.0, -12, None, ''), ('sfx/heartbeat.wav', 100.0, -11, None, ''),
 ('sfx/heartbeat.wav', 101.0, -10, None, ''), ('sfx/heartbeat.wav', 102.0, -10, None, ''), ('sfx/heartbeat.wav', 103.0, -9, None, ''),
 (f'{L}/kenney-rpg/creak2.ogg', 105.6, -12, None, ''), (f'{L}/kenney-rpg/doorClose_4.ogg', 108.4, -5, None, ''), ('sfx/boom.wav', 108.45, -8, None, ''),
]
def steps(a, b, dt, g, name='footstep_concrete', echo='aecho=0.6:0.4:60:0.25'):
    t = a; i = 0
    while t < b: cues.append((f'{L}/kenney-impact/{name}_00{i % 5}.ogg', round(t, 2), g, None, echo)); t += dt; i += 1
steps(1.95, 4.2, 0.42, -20)                       # Dimas arrives
for off in (0, 0.13, 0.27, 0.36): steps(30.4 + off, 42.1, 0.52, -24)   # four men walking
steps(68.4, 69.7, 0.2, -14)                       # running into the pos
steps(69.7, 69.8, 0.5, -16, 'footstep_wood')
cues = [c for c in cues if c[1] < END]
music = (f'{L}/music/bgm-darkest-child.mp3', -30)
args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', NARR, '-i', music[0]]
for c in cues: args += ['-i', c[0]]
# music drops out completely from the whisper until the 4th rule is read, then returns
fc = [f"[0]atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,asplit=2[nar][sc]",
      f"[1]aloop=loop=-1:size=2000000000,atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,volume={music[1]}dB,"
      f"volume='if(between(t,{CRICKET_STOP},86.0),0,1)':eval=frame,afade=t=in:d=1.5,afade=t=out:st={max(0, END - 2.5)}:d=2.5[mus0]",
      "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[mus]"]
labels = ['[nar]', '[mus]']
for i, (f, st, g, dur, ex) in enumerate(cues):
    ch = f"[{i + 2}]aresample=48000,aformat=channel_layouts=stereo"
    if dur and 'aloop' not in ex: ch += f",atrim=0:{dur}"
    if ex: ch += "," + ex
    ms = int(st * 1000); ch += f",volume={g}dB,adelay={ms}|{ms}[c{i}]"; fc.append(ch); labels.append(f'[c{i}]')
fc.append(''.join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{END},afade=t=out:st={END - 0.4}:d=0.4,alimiter=limit=0.89[out]")
args += ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', OUT]
subprocess.run(args, check=True); print('ok', OUT)
