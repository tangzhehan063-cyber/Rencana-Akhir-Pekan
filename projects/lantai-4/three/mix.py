# Build the sample/full audio mix with ffmpeg. Usage: python3 mix.py END_SECONDS OUT.wav
import subprocess, sys
END=float(sys.argv[1]); OUT=sys.argv[2]
L='/home/user/Rencana-Akhir-Pekan/skills/directing-stickman-videos/assets/b-audio-library/audio'
NARR='../film/narration.wav'
# (file, start, gain_dB, trim_dur or None, extra filter)
cues=[
 ('sfx/lift-hum.wav',      0.0,  -30, 2.9,  'afade=t=out:st=2.75:d=0.15'),
 ('sfx/sub-drone.wav',     0.0,  -20, 3.0,  'afade=t=out:st=2.6:d=0.4'),
 ('sfx/ding.wav',          1.55, -14, None, ''),
 (f'{L}/kenney-impact/impactMetal_heavy_001.ogg', 1.58, -16, None, ''),
 (f'{L}/the-shop/TheShopCollection_convenience_store_drinks_fridge_drone.wav', 2.9, -30, 3.3, 'afade=t=in:d=0.1,afade=t=out:st=3.1:d=0.2'),
 (f'{L}/kenney-interface/switch_002.ogg', 4.93, -14, None, ''),
 ('sfx/lift-hum.wav',      6.2,  -29, 20.55,'afade=t=in:d=0.1'),   # until doors close (26.75)
 (f'{L}/kenney-interface/switch_001.ogg', 7.43, -12, None, ''),
 ('sfx/sub-drone.wav',     10.5, -24, 3.2,  'afade=t=out:st=2.7:d=0.5'),
 ('sfx/ding.wav',          13.55,-12, None, ''),
 (f'{L}/kenney-impact/impactMetal_heavy_003.ogg', 13.55, -10, None, ''),
 ('sfx/door-slide.wav',    15.8, -16, None, ''),
 ('sfx/room-tone.wav',     15.9, -26, 29.9, 'afade=t=in:d=1.2'),
 (f'{L}/owlish-home-202/Plastic/Plastic_03.wav', 20.2, -24, None, 'aecho=0.7:0.5:90:0.3'),
 (f'{L}/owlish-home-202/Plastic/Plastic_06.wav', 21.6, -26, None, 'aecho=0.7:0.5:90:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 24.45, -12, None, 'aecho=0.6:0.4:70:0.25'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 24.87, -12, None, 'aecho=0.6:0.4:70:0.25'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 25.29, -13, None, 'aecho=0.6:0.4:70:0.25'),
 ('sfx/door-slide.wav',    25.75,-15, None, ''),
 (f'{L}/kenney-impact/impactMetal_heavy_000.ogg', 26.72, -9, None, 'aecho=0.8:0.6:120:0.35'),
 ('sfx/sub-drone.wav',     26.4, -18, 1.4,  'afade=t=in:d=0.3'),
 # ---- part 2 ----
 ('sfx/room-tone.wav',     45.8, -26, 24.0, 'afade=t=out:st=23.6:d=0.2'),
 (f'{L}/kenney-rpg/doorOpen_1.ogg', 27.6, -14, None, 'aecho=0.7:0.5:110:0.35'),
 ('sfx/boom.wav', 32.05, -12, None, ''), ('sfx/boom.wav', 34.1, -10, None, ''), ('sfx/boom.wav', 36.3, -9, None, ''),
 ('sfx/tone.wav', 36.2, -16, None, ''),
 (f'{L}/kenney-rpg/creak1.ogg', 37.45, -12, None, 'aecho=0.7:0.5:90:0.3'),
 (f'{L}/owlish-home-202/Plastic/Plastic_04.wav', 38.6, -15, None, ''),
 (f'{L}/owlish-home-202/Plastic/Plastic_06.wav', 39.9, -17, None, ''),
 ('sfx/sub-drone.wav', 40.9, -15, 5.0, 'afade=t=out:st=4.3:d=0.7'),
 ('sfx/tone.wav', 41.1, -18, None, ''),
 ('sfx/boom.wav', 43.7, -11, None, ''), ('sfx/boom.wav', 44.95, -9, None, ''),
 ('sfx/sub-drone.wav', 50.4, -20, 7.0, 'afade=t=out:st=6.2:d=0.8'),
 ('sfx/tone.wav', 59.2, -20, None, ''), ('sfx/boom.wav', 59.4, -11, None, ''),
 ('sfx/sub-drone.wav', 61.9, -18, 1.8, 'afade=t=out:st=1.4:d=0.4'),
 (f'{L}/rubberduck-water-40/slime_03.ogg', 64.0, -14, None, ''),
 (f'{L}/rubberduck-water-40/slime_05.ogg', 65.5, -15, None, ''),
 (f'{L}/rubberduck-water-40/slime_08.ogg', 68.0, -9, None, ''), ('sfx/boom.wav', 68.1, -8, None, ''),
 (f'{L}/isaiah-birds/birds-isaiah658_0.ogg', 69.9, -17, 13.7, 'aloop=loop=-1:size=2000000000,atrim=0:13.7,afade=t=in:d=0.4,afade=t=out:st=12.4:d=1.3'),
 (f'{L}/kresiek-amb-outside/amb_outdoor1_loop.ogg', 69.9, -22, 13.7, 'aloop=loop=-1:size=2000000000,atrim=0:13.7,afade=t=in:d=0.4,afade=t=out:st=12.4:d=1.3'),
 (f'{L}/yaroslav-car-pass/car1.wav', 71.4, -20, None, ''),
 ('sfx/sub-drone.wav', 75.9, -22, 5.0, ''), ('sfx/tone.wav', 78.0, -20, None, ''), ('sfx/boom.wav', 81.9, -10, None, ''),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 28.00, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 28.30, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 28.60, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 28.90, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 29.20, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 29.50, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 29.80, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 30.10, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 30.60, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 30.90, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 31.20, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 31.50, -14, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 32.75, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 32.97, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 33.19, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 33.41, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 33.63, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 33.85, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 35.05, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 35.25, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 35.45, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 35.65, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 35.85, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 36.05, -12, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 37.85, -15, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 38.20, -15, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 38.55, -15, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 46.30, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 46.50, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 46.70, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 46.90, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 47.10, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 47.30, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 47.50, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 47.70, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 47.90, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 48.10, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 48.30, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 48.50, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 48.70, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 48.90, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 49.10, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 49.30, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_001.ogg', 49.50, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 49.70, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_003.ogg', 49.90, -13, None, 'aecho=0.7:0.5:80:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 50.10, -13, None, 'aecho=0.7:0.5:80:0.3'),
]
music=(f'{L}/music/bgm-darkest-child.mp3', -27)
args=['ffmpeg','-y','-loglevel','error','-i',NARR,'-i',music[0]]
for c in cues: args+=['-i',c[0]]
fc=[]
fc.append(f"[0]atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,volume=1.0,asplit=2[nar][sc]")
fc.append(f"[1]atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,volume={music[1]}dB,afade=t=in:d=1.5,afade=t=out:st={END-1.2}:d=1.2[mus0]")
fc.append("[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[mus]")
labels=['[nar]','[mus]']
for i,(f,st,g,dur,ex) in enumerate(cues):
    k=i+2; ch=f"[{k}]aresample=48000,aformat=channel_layouts=stereo"
    if dur: ch+=f",atrim=0:{dur}"
    if ex: ch+=","+ex
    ms=int(st*1000); ch+=f",volume={g}dB,adelay={ms}|{ms}[c{i}]"; fc.append(ch); labels.append(f'[c{i}]')
fc.append(''.join(labels)+f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{END},alimiter=limit=0.89[out]")
args+=['-filter_complex',';'.join(fc),'-map','[out]','-ar','48000',OUT]
subprocess.run(args,check=True); print('ok',OUT)
