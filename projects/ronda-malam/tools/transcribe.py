# Verify TTS clips: Gemini transcription vs. source text. Run from audio/.
import json,base64,os,urllib.request,time,sys
fs=sys.argv[1:] or ['m0','c1','m1','c2','m2','c3','m3']
parts=[{"text":"Transcribe each numbered Indonesian audio clip verbatim (exact words heard, including any mispronunciation or skipped/added words). Return JSON list of {\"clip\":\"name\",\"text\":\"...\",\"issues\":\"...\"} only."}]
for f in fs:
    parts.append({"text":f"Clip {f}:"}); parts.append({"inlineData":{"mimeType":"audio/wav","data":base64.b64encode(open(f+'.wav','rb').read()).decode()}})
body=json.dumps({"contents":[{"role":"user","parts":parts}],"generationConfig":{"responseMimeType":"application/json"}}).encode()
for model in ['gemini-3.8-flash','gemini-flash-latest','gemini-3.5-flash']:
    try:
        req=urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',data=body,headers={'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']})
        d=json.load(urllib.request.urlopen(req,timeout=580)); break
    except Exception as e: print(model,'failed:',e); time.sleep(5)
res=json.loads(d['candidates'][0]['content']['parts'][0]['text'])
json.dump(res,open('transcripts.json','w'),ensure_ascii=False,indent=1)
norm=lambda s:''.join(ch for ch in s.lower() if ch.isalnum() or ch==' ').split()
for r in res:
    ref=open(r['clip']+'.txt').read()
    print(r['clip'], 'MATCH' if norm(ref)==norm(r['text']) else 'DIFF', '|', r['text'], '|', r.get('issues',''))
