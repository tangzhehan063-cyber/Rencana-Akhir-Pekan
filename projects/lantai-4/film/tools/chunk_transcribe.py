import subprocess, json, base64, os, urllib.request
sil=[l.split() for l in open('audio/silences.txt')]
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','narration.wav']))
# speech chunks between silences
chunks=[]; cur=0.0
for kind,t in sil:
    t=float(t)
    if kind=='silence_start:': 
        if t-cur>0.05: chunks.append([cur,t])
    else: cur=t
if dur-cur>0.05: chunks.append([cur,dur])
os.makedirs('audio/chunks',exist_ok=True)
parts=[{"text":"Transcribe each numbered Indonesian audio clip verbatim. Return JSON list of {\"i\":n,\"text\":\"...\"} only."}]
for i,(a,b) in enumerate(chunks):
    f=f'audio/chunks/c{i:02d}.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i','narration.wav','-ss',str(a),'-to',str(b),f])
    parts.append({"text":f"Clip {i}:"}); parts.append({"inlineData":{"mimeType":"audio/wav","data":base64.b64encode(open(f,'rb').read()).decode()}})
json.dump(chunks,open('audio/chunks.json','w'))
body={"contents":[{"role":"user","parts":parts}],"generationConfig":{"responseMimeType":"application/json"}}
req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']})
d=json.load(urllib.request.urlopen(req,timeout=300))
txt=d['candidates'][0]['content']['parts'][0]['text']
res=json.loads(txt)
json.dump(res,open('audio/chunk-transcripts.json','w'),ensure_ascii=False,indent=1)
for r in res: print(r['i'], f"{chunks[r['i']][0]:.2f}-{chunks[r['i']][1]:.2f}", r['text'])
