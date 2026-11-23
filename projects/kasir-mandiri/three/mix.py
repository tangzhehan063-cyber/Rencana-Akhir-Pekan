# python3 mix.py END OUT.wav  -> narration + machine voice + SFX + ambience + music (ducked under voice)
import subprocess, sys
END = float(sys.argv[1]); OUT = sys.argv[2]
L = '/home/user/Rencana-Akhir-Pekan/skills/directing-stickman-videos/assets/b-audio-library/audio'
NARR = '../audio/voices.wav'
FRIDGE = f'{L}/the-shop/TheShopCollection_convenience_store_drinks_fridge_drone.wav'
# (file, start, gain dB, duration or None, extra filter)
cues = [
 (FRIDGE, 0.0, -27, END, 'aloop=loop=-1:size=2000000000,atrim=0:%.2f' % END),
 ('sfx/hum.wav', 0.0, -36, None, 'aloop=loop=-1:size=2000000000,atrim=0:%.2f' % END),
 ('sfx/sub-drone.wav', 0.0, -19, 3.9, 'afade=t=out:st=3.3:d=0.6'),
 ('sfx/chime.wav', 0.02, -11, None, ''),
 ('sfx/boom.wav', 1.6, -13, None, ''),
 # flicker crackles on the bad tube
 # 02:59 -> 03:00
 ('sfx/click.wav', 15.15, -18, None, ''), ('sfx/tone.wav', 15.2, -24, None, ''),
 # the machine wakes up on its own
 ('sfx/chime.wav', 16.62, -9, None, ''), ('sfx/sub-drone.wav', 16.7, -24, 4.0, 'afade=t=in:d=0.5,afade=t=out:st=3.3:d=0.7'),
 # weight counting up, then alarm
 ('sfx/buzz.wav', 23.25, -11, None, ''), ('sfx/sub-drone.wav', 23.3, -18, 5.0, 'afade=t=out:st=4.2:d=0.8'), ('sfx/boom.wav', 23.3, -16, None, ''),
]
G = f'{L}/kenney-interface'
cues += [
 # BATAL press, weight keeps rising
 ('sfx/click.wav', 24.95, -13, None, ''), ('sfx/buzz.wav', 28.3, -12, None, ''), ('sfx/buzz.wav', 29.5, -10, None, ''),
 ('sfx/chime.wav', 30.62, -12, None, ''),
 # CCTV: monitor hiss, cut-in, four in the queue
 ('sfx/hiss.wav', 33.5, -34, 3.4, 'afade=t=in:d=0.4'), (f'{G}/glitch_001.ogg', 36.88, -20, None, ''), ('sfx/hiss.wav', 36.9, -30, 4.6, ''),
 ('sfx/tone.wav', 37.8, -22, None, ''), ('sfx/sub-drone.wav', 39.9, -17, 4.0, 'afade=t=out:st=3.2:d=0.8'),
 ('sfx/boom.wav', 41.65, -15, None, ''),
 ('sfx/chime.wav', 45.8, -9, None, ''),
 # the queue vanishes one by one
 (f'{G}/glitch_002.ogg', 47.58, -20, None, ''), ('sfx/hiss.wav', 47.6, -30, 6.0, 'aloop=loop=1:size=288000,atrim=0:12.7'),
 ('sfx/glitch.wav', 51.12, -14, None, ''), ('sfx/glitch.wav', 52.92, -14, None, ''), ('sfx/glitch.wav', 54.92, -14, None, ''),
 ('sfx/boom.wav', 51.2, -20, None, ''), ('sfx/boom.wav', 53.0, -19, None, ''), ('sfx/boom.wav', 55.0, -18, None, ''),
 ('sfx/tone.wav', 57.3, -18, None, ''), ('sfx/boom.wav', 59.0, -11, None, ''), ('sfx/sub-drone.wav', 59.0, -18, 6.0, 'afade=t=out:st=5.0:d=1.0'),
 # on the scale
 ('sfx/boom.wav', 64.3, -10, None, ''), ('sfx/buzz.wav', 69.3, -9, None, ''),
 ('sfx/printer.wav', 71.8, -15, None, ''), ('sfx/tear.wav', 75.45, -15, None, ''),
 (f'{G}/confirmation_002.ogg', 76.0, -13, None, ''),
 # ending: CCTV, Bayu now in the queue
 (f'{G}/glitch_001.ogg', 80.68, -18, None, ''), ('sfx/hiss.wav', 80.7, -30, 2.8, 'afade=t=out:st=2.2:d=0.6'),
 ('sfx/glitch.wav', 81.55, -14, None, ''), ('sfx/boom.wav', 82.25, -8, None, ''), ('sfx/sub-drone.wav', 82.2, -15, 1.3, 'afade=t=out:st=0.8:d=0.5'),
]
def ticks(a, b, g=-27, dt=0.07):
    t = a
    while t < b: cues.append(('sfx/click.wav', round(t, 3), g, None, '')); t += dt
ticks(22.6, 23.25); ticks(27.6, 28.3); ticks(29.0, 29.5); ticks(67.9, 69.2, -25)
def steps(a, b, dt, g, name='footstep_concrete'):
    t = a; i = 0
    while t < b: cues.append((f'{L}/kenney-impact/{name}_00{i % 5}.ogg', round(t, 2), g, None, 'aecho=0.6:0.4:60:0.25')); t += dt; i += 1
steps(18.5, 19.9, 0.36, -17); steps(31.0, 31.8, 0.4, -18); steps(60.5, 61.9, 0.45, -17)
cues = [c for c in cues if c[1] < END]
music = (f'{L}/music/bgm-classic-horror-1.mp3', -29)
args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', NARR, '-i', music[0]]
for c in cues: args += ['-i', c[0]]
fc = [f"[0]atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,asplit=2[nar][sc]",
      f"[1]aloop=loop=-1:size=2000000000,atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,volume={music[1]}dB,afade=t=in:d=1.5,afade=t=out:st={END - 2.0}:d=2.0[mus0]",
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
