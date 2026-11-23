// Project-local TTS call: one request, saves native audio whatever mime the model returns.
import fs from 'node:fs';
const [textFile, out, model, voice] = process.argv.slice(2);
const key = process.env.GEMINI_API_KEY;
const body = {contents:[{role:'user',parts:[{text:fs.readFileSync(textFile,'utf8')}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)});
if(!r.ok){console.error('HTTP',r.status,(await r.text()).slice(0,2500));process.exit(1);}
const d = await r.json();
const p = (d.candidates?.[0]?.content?.parts||[]).map(x=>x.inlineData||x.inline_data).find(Boolean);
if(!p){console.error(JSON.stringify(d).slice(0,500));process.exit(1);}
console.log('mime',p.mimeType, 'usage', JSON.stringify(d.usageMetadata||{}));
fs.writeFileSync(out+'.raw', Buffer.from(p.data,'base64'));
fs.writeFileSync(out+'.mime', p.mimeType);
