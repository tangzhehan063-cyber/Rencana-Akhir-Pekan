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
 ('sfx/room-tone.wav',     15.9, -26, None, 'afade=t=in:d=1.2'),
 (f'{L}/owlish-home-202/Plastic/Plastic_03.wav', 20.2, -24, None, 'aecho=0.7:0.5:90:0.3'),
 (f'{L}/owlish-home-202/Plastic/Plastic_06.wav', 21.6, -26, None, 'aecho=0.7:0.5:90:0.3'),
 (f'{L}/kenney-impact/footstep_concrete_000.ogg', 24.45, -12, None, 'aecho=0.6:0.4:70:0.25'),
 (f'{L}/kenney-impact/footstep_concrete_002.ogg', 24.87, -12, None, 'aecho=0.6:0.4:70:0.25'),
 (f'{L}/kenney-impact/footstep_concrete_004.ogg', 25.29, -13, None, 'aecho=0.6:0.4:70:0.25'),
 ('sfx/door-slide.wav',    25.75,-15, None, ''),
 (f'{L}/kenney-impact/impactMetal_heavy_000.ogg', 26.72, -9, None, 'aecho=0.8:0.6:120:0.35'),
 ('sfx/sub-drone.wav',     26.4, -18, 1.4,  'afade=t=in:d=0.3'),
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
