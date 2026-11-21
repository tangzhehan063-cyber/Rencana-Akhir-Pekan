#!/bin/bash
# Synthesized SFX for KASIR MANDIRI (FFmpeg only). Run from three/: bash sfx/make-sfx.sh
set -e; cd "$(dirname "$0")"; A="ffmpeg -y -loglevel error -f lavfi -i"; O="-ar 48000 -ac 1"
# kiosk chime: two-tone "attention" (E6 -> C6)
$A "aevalsrc='0.5*sin(2*PI*1318*t)*exp(-6*t)*lt(t,0.18)+0.5*sin(2*PI*1047*(t-0.2))*exp(-5*(t-0.2))*gte(t,0.2)':d=0.75" $O chime.wav
# low error buzz (scale alert)
$A "aevalsrc='0.35*sgn(sin(2*PI*180*t))*(0.6+0.4*sin(2*PI*8*t))*lt(t,0.42)':d=0.5" -af "lowpass=f=2400,afade=t=out:st=0.38:d=0.04" $O buzz.wav
# button press click
$A "aevalsrc='0.8*sin(2*PI*2400*t)*exp(-90*t)':d=0.08" $O click.wav
# fluorescent hum: 100 Hz + harmonics + slight buzz
$A "aevalsrc='0.10*sin(2*PI*100*t)+0.05*sin(2*PI*200*t)+0.03*sin(2*PI*300*t)+0.015*sgn(sin(2*PI*100*t))':d=30" -af "highpass=f=60" $O hum.wav
# sub drone (horror bed)
$A "aevalsrc='0.45*sin(2*PI*41*t)*(0.7+0.3*sin(2*PI*0.23*t))+0.2*sin(2*PI*61.7*t)':d=12" -af "lowpass=f=220" $O sub-drone.wav
# dissonant rising tone
$A "aevalsrc='0.22*sin(2*PI*(220+60*t)*t)+0.18*sin(2*PI*(233+64*t)*t)':d=3" -af "afade=t=in:d=1.5,afade=t=out:st=2.4:d=0.6" $O tone.wav
# boom / impact hit
$A "aevalsrc='0.9*sin(2*PI*(55*exp(-2*t))*t*8)*exp(-2.6*t)':d=2.2" -af "lowpass=f=300" $O boom.wav
# tape hiss
$A "anoisesrc=d=6:c=pink:a=0.25" -af "highpass=f=1500" $O hiss.wav
# thermal receipt printer: rapid stepping chatter + whine
$A "aevalsrc='0.35*(0.5+0.5*sgn(sin(2*PI*55*t)))*sin(2*PI*1900*t)*(0.6+0.4*random(0))+0.08*sin(2*PI*620*t)':d=3.2" -af "bandpass=f=1800:w=1600,afade=t=in:d=0.05,afade=t=out:st=3.0:d=0.2" $O printer.wav
# receipt tear
$A "anoisesrc=d=0.35:c=white:a=0.6" -af "bandpass=f=3000:w=2500,afade=t=in:d=0.02,afade=t=out:st=0.15:d=0.2" $O tear.wav
# digital glitch stutter (CCTV)
$A "aevalsrc='0.4*sgn(sin(2*PI*90*t))*gt(sin(2*PI*14*t),0)':d=0.6" -af "highpass=f=200,lowpass=f=5000" $O glitch.wav
# auto-door double chime (generic, not a brand jingle)
$A "aevalsrc='0.45*sin(2*PI*880*t)*exp(-4*t)+0.45*sin(2*PI*660*(t-0.35))*exp(-4*(t-0.35))*gte(t,0.35)':d=1.6" $O door-chime.wav
echo sfx ok
