# Place the ElevenLabs narration lines (out/vo/lNN.mp3) on the film timeline -> out/voice.wav + out/vo-schedule.json + captions.json
# Lines are trimmed of silence, sped up slightly (atempo, pitch preserved) and scheduled greedily near their planned shot times (no overlaps).
import subprocess, json, sys, numpy as np, wave
SR = 48000; DUR = 71.0; TEMPO = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0; GAP = 0.18; MAXLEAD = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
LINES = [  # (id, text, planned start in the shot plan)
 (1, "Selamat bergabung di PT Lantai Empat Sejahtera!", 0.2), (2, "Hari pertama pasti menyenangkan.", 3.9), (3, "Mari kenali fasilitas kantor kita.", 6.5),
 (4, "Pertama, mesin absen.", 9.4), (5, "Tempelkan kartu, dengar suara ramah, dan Anda resmi hadir.", 11.4), (6, "Mesin ini tidak pernah salah mencatat.", 16.8),
 (7, "Kedua, lift.", 20.4), (8, "Cepat, bersih, dan punya lima tombol.", 22.0), (9, "Satu ditutup lakban. Jangan dipikirkan.", 25.4),
 (10, "Ketiga, lantai empat.", 29.2), (11, "Sedang direnovasi, mohon jangan dimasuki.", 31.2), (12, "Kalau lift berhenti di sana, itu normal.", 35.0),
 (13, "Rekan-rekan lama kami akan menyambut Anda.", 39.2), (14, "Mereka sangat ramah.", 43.2), (15, "Mereka tidak pernah cuti.", 45.6),
 (16, "Mereka tidak pernah pulang.", 47.8), (17, "Terakhir, jadwal kerja Anda.", 50.4), (18, "Sudah kami siapkan.", 52.6),
 (19, "Besok, jam tujuh pagi.", 54.4), (20, "Dindingnya pas ukuran Anda.", 57.0), (21, "Selamat bekerja!", 60.4)]
def load(i):
    f = f"../audio/vo/l{i:02d}.mp3"
    cmd = ['ffmpeg', '-v', 'error', '-i', f, '-af', f'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.05,areverse,atempo={TEMPO}', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
out = np.zeros(int(DUR * SR), np.float32); sched = []; prev_end = 0.0
for i, text, plan in LINES:
    a = load(i); d = len(a) / SR; start = max(plan - MAXLEAD, prev_end + GAP); end = start + d
    k = int(start * SR); out[k:k + len(a)] += a[:len(out) - k]; sched.append({'id': i, 'text': text, 'plan': plan, 'start': round(start, 3), 'end': round(end, 3), 'dev': round(start - plan, 2)}); prev_end = end
for s in sched: print(f"l{s['id']:02d} plan {s['plan']:5.1f} -> {s['start']:6.2f}-{s['end']:6.2f}  dev {s['dev']:+.2f}  {s['text'][:40]}")
print('last voiced end', sched[-1]['end'], ' tempo', TEMPO)
peak = float(np.abs(out).max()); out *= 0.89 / peak if peak > 0 else 1
w = wave.open('out/voice.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes()); w.close()
json.dump(sched, open('out/vo-schedule.json', 'w'), indent=1, ensure_ascii=False)
# captions follow the real speech; line 22 has no voice (credits ran out) -> shown as text after line 21
caps = [{'start': round(s['start'] - 0.04, 3), 'end': s['end'], 'text': s['text'], 'machine': False, 'hold': round(s['end'] + 0.22, 3)} for s in sched]
l22s = sched[-1]['end'] + 0.35
caps.append({'start': round(l22s, 3), 'end': round(l22s + 3.2, 3), 'text': 'Kami tidak sabar melihat Anda bertahan lama.', 'machine': False, 'hold': round(l22s + 3.4, 3)})
caps.append({'start': 66.2, 'end': 68.2, 'text': 'Terima kasih, Bimo.', 'machine': True, 'hold': 68.4})
json.dump(caps, open('captions.json.new', 'w'), indent=1, ensure_ascii=False); print('captions.json.new written;', 'line22 caption at', round(l22s, 2))
