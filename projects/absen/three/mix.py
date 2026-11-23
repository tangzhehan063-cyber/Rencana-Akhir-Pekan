import subprocess, sys
END=float(sys.argv[1]); OUT=sys.argv[2]
L='/home/user/Rencana-Akhir-Pekan/skills/directing-stickman-videos/assets/b-audio-library/audio'
NARR='../audio/voices.wav'
cues=[
 (f'{L}/the-shop/TheShopCollection_convenience_store_drinks_fridge_drone.wav', 0.0, -30, 39.75, 'aloop=loop=-1:size=2000000000,atrim=0:39.75,afade=t=out:st=39.3:d=0.4'),
 ('sfx/sub-drone.wav', 0.0, -20, 3.9, 'afade=t=out:st=3.4:d=0.5'),
 ('sfx/beep.wav', 1.95, -16, None, ''),
 (f'{L}/kenney-interface/switch_002.ogg', 6.2, -18, None, ''),
 ('sfx/beep.wav', 10.495, -9, None, ''),
 (f'{L}/kenney-interface/switch_001.ogg', 14.3, -14, None, ''),
 ('sfx/hiss.wav', 16.3, -26, 4.06, ''),
 (f'{L}/kenney-interface/switch_003.ogg', 17.65, -16, None, ''), (f'{L}/kenney-interface/switch_003.ogg', 19.0, -16, None, ''),
 ('sfx/sub-drone.wav', 20.4, -24, 5.5, ''),
 ('sfx/ding.wav', 26.35, -9, None, ''),
 ('sfx/door-slide.wav', 28.0, -13, None, ''),
 ('sfx/lift-hum.wav', 28.2, -30, 7.0, 'afade=t=in:d=0.4,afade=t=out:st=6.4:d=0.6'),
 ('sfx/beep.wav', 31.3, -12, None, ''), ('sfx/tone.wav', 31.4, -20, None, ''),
 ('sfx/beep.wav', 33.18, -9, None, ''), ('sfx/boom.wav', 34.1, -11, None, ''),
 ('sfx/hiss.wav', 35.5, -26, 3.1, ''),
 ('sfx/beep.wav', 36.3, -22, None, 'asetrate=48000*0.6,aresample=48000'), ('sfx/beep.wav', 36.9, -22, None, 'asetrate=48000*0.6,aresample=48000'),
 ('sfx/beep.wav', 37.5, -22, None, 'asetrate=48000*0.6,aresample=48000'), ('sfx/boom.wav', 38.1, -13, None, ''),
 ('sfx/room-tone.wav', 39.75, -26, 29.9, 'afade=t=in:d=0.4'),
 ('sfx/room-tone.wav', 69.6, -26, 11.0, 'afade=t=out:st=10.4:d=0.6'),
 (f'{L}/kenney-rpg/creak2.ogg', 45.9, -12, None, 'aecho=0.7:0.5:110:0.35'),
 (f'{L}/owlish-home-202/Plastic/Plastic_04.wav', 48.4, -20, None, 'aecho=0.7:0.5:90:0.3'),
 ('sfx/sub-drone.wav', 53.0, -20, 4.0, 'afade=t=out:st=3.4:d=0.6'),
 (f'{L}/kenney-impact/impactGeneric_light_001.ogg', 56.0, -16, None, ''),
 ('sfx/tone.wav', 61.0, -22, None, ''), ('sfx/boom.wav', 64.0, -11, None, ''),
 ('sfx/knock.wav', 66.4, -8, None, ''), ('sfx/knock.wav', 67.3, -8, None, ''), ('sfx/knock.wav', 68.2, -7, None, ''),
 ('sfx/buzz.wav', 69.85, -12, None, ''), ('sfx/buzz.wav', 70.45, -12, None, ''),
 ('sfx/notif.wav', 73.9, -13, None, ''),
 ('sfx/sub-drone.wav', 75.5, -20, 5.0, ''),
 (f'{L}/kenney-interface/switch_001.ogg', 79.1, -18, None, ''), (f'{L}/kenney-interface/switch_001.ogg', 79.5, -18, None, ''),
 ('sfx/boom.wav', 80.0, -9, None, ''),
 ('sfx/knock.wav', 81.2, -6, None, ''),
]
def steps(a, b, dt, g, name='footstep_concrete'):
    t=a;i=0
    while t<b: cues.append((f'{L}/kenney-impact/{name}_00{i%5}.ogg', round(t,2), g, None, 'aecho=0.7:0.5:80:0.3')); t+=dt; i+=1
steps(39.9, 42.2, 0.32, -14); steps(42.6, 44.6, 0.42, -15); steps(50.1, 52.95, 0.27, -14); steps(68.5, 69.4, 0.45, -15)
music=(f'{L}/music/bgm-classic-horror-1.mp3', -27)
args=['ffmpeg','-y','-loglevel','error','-i',NARR,'-i',music[0]]
for c in cues: args+=['-i',c[0]]
fc=[f"[0]atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,asplit=2[nar][sc]",
    f"[1]aloop=loop=-1:size=2000000000,atrim=0:{END},aresample=48000,aformat=channel_layouts=stereo,volume={music[1]}dB,afade=t=in:d=1.5,afade=t=out:st={END-3.0}:d=2.5[mus0]",
    "[mus0][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[mus]"]
labels=['[nar]','[mus]']
for i,(f,st,g,dur,ex) in enumerate(cues):
    ch=f"[{i+2}]aresample=48000,aformat=channel_layouts=stereo"
    if dur and 'aloop' not in ex: ch+=f",atrim=0:{dur}"
    if ex: ch+=","+ex
    ms=int(st*1000); ch+=f",volume={g}dB,adelay={ms}|{ms}[c{i}]"; fc.append(ch); labels.append(f'[c{i}]')
fc.append(''.join(labels)+f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{END},alimiter=limit=0.89[out]")
args+=['-filter_complex',';'.join(fc),'-map','[out]','-ar','48000',OUT]
subprocess.run(args,check=True); print('ok',OUT)
