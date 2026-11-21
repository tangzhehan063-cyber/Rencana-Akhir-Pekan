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
 (f'{L}/kenney-interface/glitch_001.ogg', 4.1, -28, None, ''), (f'{L}/kenney-interface/glitch_002.ogg', 6.1, -30, None, ''),
 # 02:59 -> 03:00
 ('sfx/click.wav', 15.15, -18, None, ''), ('sfx/tone.wav', 15.2, -24, None, ''),
 # the machine wakes up on its own
 ('sfx/chime.wav', 16.62, -9, None, ''), ('sfx/sub-drone.wav', 16.7, -24, 4.0, 'afade=t=in:d=0.5,afade=t=out:st=3.3:d=0.7'),
 # weight counting up, then alarm
 ('sfx/buzz.wav', 23.25, -11, None, ''), ('sfx/sub-drone.wav', 23.3, -18, 5.0, 'afade=t=out:st=4.2:d=0.8'), ('sfx/boom.wav', 23.3, -16, None, ''),
]
t = 22.6
while t < 23.25: cues.append(('sfx/click.wav', round(t, 3), -27, None, '')); t += 0.07
def steps(a, b, dt, g, name='footstep_concrete'):
    t = a; i = 0
    while t < b: cues.append((f'{L}/kenney-impact/{name}_00{i % 5}.ogg', round(t, 2), g, None, 'aecho=0.6:0.4:60:0.25')); t += dt; i += 1
steps(18.5, 19.9, 0.36, -17)
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
