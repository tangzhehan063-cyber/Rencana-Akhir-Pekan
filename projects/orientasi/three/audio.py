# Synthesises the ORIENTASI sound bed (music + SFX, no narration) -> out/audio.wav, fully deterministic (seeded).
# Idea: a cheerful corporate jingle that slowly detunes and slows as the story turns dark; SFX are tied to shot times in 30-shots.js.
# Narration is mixed in later (text-first workflow): python3 audio.py [duration]
import sys, numpy as np, wave
SR = 48000; DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 71.0
N = int(SR * DUR); out = np.zeros(N, np.float32); rng = np.random.default_rng(7)
T = np.arange(N) / SR
def seg(t, a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def add(sig, t0, gain=1.0):
    i = int(t0 * SR);
    if i >= N: return
    n = min(len(sig), N - i); out[i:i + n] += (sig[:n] * gain).astype(np.float32)
def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR; return np.minimum(t / max(a, 1e-4), 1) * np.exp(-t / d)
def pluck(f, d=0.5, amp=1.0):
    n = int(d * SR); t = np.arange(n) / SR; s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 14) + 0.15 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 25)
    return amp * s * env(n, 0.004, d / 3.2)
def beep(f=1200, d=0.12, amp=0.5):
    n = int(d * SR); t = np.arange(n) / SR; return amp * np.sin(2 * np.pi * f * t) * np.minimum(1, (d - t) / 0.01) * np.minimum(1, t / 0.004)
def bell(f=1760, d=1.4, amp=0.5):
    n = int(d * SR); t = np.arange(n) / SR; return amp * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)) * env(n, 0.002, d / 4)

# ---- room tone (very quiet air), brighter in the lobby, hollow in the lift/corridor ----
air = lowpass(noise(DUR), 900).astype(np.float32); out += 0.035 * air / (np.abs(air).max() + 1e-9) * (0.6 + 0.4 * seg(T, 29, 36))
# ---- corporate jingle: pentatonic arpeggio, detunes + slows + thins out as the film darkens ----
penta = [0, 2, 4, 7, 9, 12, 9, 7]; prog = [0, 5, 7, 0]; root = 261.63  # C major, bars C F G C
clock, step = 0.0, 0
while clock < DUR:
    dark = float(seg(np.array(clock), 35, 60)); rate = 1 - 0.45 * dark            # tempo drifts down to 55%
    semis = -1.7 * dark + 0.12 * np.sin(clock * 3.1) * dark                         # detune + wobble
    bar = (step // 8) % 4; note = penta[step % 8] + prog[bar]
    if clock < 64 and not (dark > 0.7 and rng.random() < 0.45):                      # thin out when dark
        f = root * 2 ** ((note + semis) / 12); amp = 0.22 * (1 - 0.55 * dark) * (1 - float(seg(np.array(clock), 62, 63.9)))
        add(pluck(f, 0.55, amp), clock)
        if step % 8 == 0: add(pluck(f / 4, 0.9, amp * 1.4), clock)                  # bass on the bar
    clock += (60 / 116 / 2) / rate; step += 1
# ---- drone + dread (grows from the lift's arrival, cuts at the blackout) ----
dr = (np.sin(2 * np.pi * 55 * T) + 0.6 * np.sin(2 * np.pi * 82.9 * T + 0.6 * np.sin(T * 0.7)) + 0.3 * np.sin(2 * np.pi * 110.4 * T)) * (0.5 + 0.5 * np.sin(T * 0.9))
out += (0.12 * dr * seg(T, 33, 47) * (1 - seg(T, 63.8, 64.1))).astype(np.float32)
# ---- SFX tied to the shots ----
add(beep(1500, 0.1, 0.5), 13.1); add(beep(1100, 0.16, 0.45), 13.25)                           # card tap + machine "thanks"
add(beep(880, 0.07, 0.35), 19.9)                                                                # reaction
for tt in (24.0,): add(lowpass(noise(0.05), 3000) * env(int(0.05 * SR), 0.001, 0.015) * 0.9, tt)  # button click
for i, tt in enumerate((30.4, 31.4, 32.4, 33.4)): add(beep(700 if i < 3 else 520, 0.09, 0.3), tt)  # floor ticks, last one lower
add(bell(1760, 1.6, 0.45), 35.0)                                                                # ding
d = int(1.0 * SR); sl = lowpass(noise(1.0), 1800) * np.sin(np.linspace(0, np.pi, d)) ** 2; add(sl, 35.0, 0.35)   # door slide
tg = np.arange(int(1.1 * SR)) / SR; gl = np.sin(2 * np.pi * np.cumsum(430 - 260 * (tg / 1.1)) / SR + 3 * np.sin(tg * 9)) * np.sin(np.pi * tg / 1.1) ** 2
add(gl, 43.5, 0.28); add(lowpass(noise(1.1), 600) * np.sin(np.pi * tg / 1.1) ** 2, 43.5, 0.25)    # heads turn: eerie glide
add(pluck(207.6, 1.2, 0.5), 44.6); add(pluck(220.0, 1.2, 0.5), 44.6)                            # off-key smile sting (minor 2nd)
add(pluck(130.8, 1.0, 0.35), 54.6)                                                              # name on the board
tt = np.arange(int(0.9 * SR)) / SR; add(np.sin(2 * np.pi * 42 * tt) * np.exp(-tt * 4) * 0.9 + lowpass(noise(0.9), 400) * np.exp(-tt * 9) * 0.6, 63.9)   # lights off thunk
add(beep(1300, 0.12, 0.5), 66.2); add(beep(1700, 0.2, 0.5), 66.4)                               # machine: "Terima kasih, Bimo."
n = int(0.6 * SR); tz = np.arange(n) / SR; add(np.sign(np.sin(2 * np.pi * 140 * tz)) * 0.25 * np.minimum(1, (0.6 - tz) / 0.05), 68.6)   # error buzz
add(bell(880, 2.4, 0.25), 69.4)                                                                 # end tag
# ---- master ----
out *= np.minimum(1, T / 0.15) * np.minimum(1, (DUR - T) / 0.8)
out = np.tanh(out * 1.1); out *= 0.7 / max(1e-9, np.abs(out).max())
st = np.stack([out, out], 1); w = wave.open('out/audio.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()
print('audio.wav', DUR, 's, peak', float(np.abs(out).max()))
