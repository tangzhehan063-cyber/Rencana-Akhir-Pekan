import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, info = m.transcribe("narration.wav", language="id", word_timestamps=True, beam_size=5)
words = []
for s in segs:
    for w in s.words:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump(words, open("audio/asr-words.json", "w"), ensure_ascii=False, indent=0)
print(" ".join(f"{x['w']}[{x['s']}]" for x in words))
