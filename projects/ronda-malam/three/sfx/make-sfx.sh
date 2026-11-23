#!/bin/bash
# Synthesized SFX for RONDA MALAM (FFmpeg only). Run: bash sfx/make-sfx.sh
set -e; cd "$(dirname "$0")"; A="ffmpeg -y -loglevel error -f lavfi -i"; O="-ar 48000 -ac 1"
# kentongan: hollow bamboo slit-drum knock (two resonant modes + wooden click)
$A "aevalsrc='0.55*sin(2*PI*640*t)*exp(-16*t)+0.35*sin(2*PI*1010*t)*exp(-24*t)+0.25*sin(2*PI*330*t)*exp(-10*t)+0.5*(random(0)-0.5)*exp(-300*t)':d=0.6" -af "lowpass=f=4000,aecho=0.7:0.5:180|330:0.25|0.12" $O kentongan.wav
# crickets: pulsed 4.6 kHz chirps, two insects at different rates, loopable 12 s
$A "aevalsrc='0.10*sin(2*PI*4600*t)*gt(sin(2*PI*28*t),0.2)*gt(sin(2*PI*1.6*t),0.3)+0.07*sin(2*PI*5200*t)*gt(sin(2*PI*31*t),0.1)*gt(sin(2*PI*1.1*t+1),0.4)':d=12" -af "afade=t=in:d=0.3,afade=t=out:st=11.7:d=0.3" $O crickets.wav
# sub drone, boom, rising tone
$A "aevalsrc='0.45*sin(2*PI*41*t)*(0.7+0.3*sin(2*PI*0.23*t))+0.2*sin(2*PI*61.7*t)':d=12" -af "lowpass=f=220" $O sub-drone.wav
$A "aevalsrc='0.9*sin(2*PI*(55*exp(-2*t))*t*8)*exp(-2.6*t)':d=2.2" -af "lowpass=f=300" $O boom.wav
$A "aevalsrc='0.22*sin(2*PI*(220+60*t)*t)+0.18*sin(2*PI*(233+64*t)*t)':d=3" -af "afade=t=in:d=1.5,afade=t=out:st=2.4:d=0.6" $O tone.wav
# door bolt (wooden latch slide + clack)
$A "anoisesrc=d=0.25:c=brown:a=0.5" -af "bandpass=f=900:w=700,afade=t=in:d=0.02,afade=t=out:st=0.18:d=0.07" $O bolt-slide.wav
$A "aevalsrc='0.8*sin(2*PI*1400*t)*exp(-60*t)+0.4*(random(0)-0.5)*exp(-200*t)':d=0.15" $O bolt-clack.wav
# flashlight switch
$A "aevalsrc='0.7*sin(2*PI*3200*t)*exp(-120*t)':d=0.06" $O switch.wav
# heartbeat (low double thump)
$A "aevalsrc='0.9*sin(2*PI*48*t)*exp(-18*t)+0.7*sin(2*PI*44*(t-0.22))*exp(-20*(t-0.22))*gte(t,0.22)':d=0.9" -af "lowpass=f=160" $O heartbeat.wav
echo sfx ok
