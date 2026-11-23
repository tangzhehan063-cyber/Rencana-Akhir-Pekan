// Project-local one-shot Gemini image call (adds aspect ratio). Usage:
// node gemini-image.mjs MODEL PROMPT_FILE OUT.png [--ref file]... [--aspect 9:16]
import fs from 'node:fs'; import crypto from 'node:crypto';
const a = process.argv.slice(2); const [model, promptFile, out] = a;
if (fs.existsSync(out)) { console.error('exists', out); process.exit(1); }
const refs = []; let aspect = '9:16';
for (let i = 3; i < a.length; i++) { if (a[i] === '--ref') refs.push(a[++i]); else if (a[i] === '--aspect') aspect = a[++i]; }
const parts = [{text: fs.readFileSync(promptFile, 'utf8')}];
for (const f of refs) parts.push({inlineData: {mimeType: f.endsWith('.png') ? 'image/png' : 'image/jpeg', data: fs.readFileSync(f).toString('base64')}});
const body = {contents: [{role: 'user', parts}], generationConfig: {responseModalities: ['TEXT', 'IMAGE'], imageConfig: {aspectRatio: aspect}}};
const rec = {model, promptFile, refs, aspect, at: new Date().toISOString()};
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY}, body: JSON.stringify(body), signal: AbortSignal.timeout(300000)});
if (!r.ok) { rec.error = `HTTP ${r.status} ${(await r.text()).slice(0, 300)}`; fs.writeFileSync(out + '.request.json', JSON.stringify(rec, null, 1)); console.error(rec.error); process.exit(1); }
const d = await r.json(); const p = (d.candidates?.[0]?.content?.parts || []).map(x => x.inlineData || x.inline_data).find(x => x?.mimeType?.startsWith('image/'));
if (!p) { rec.error = 'no image ' + JSON.stringify(d).slice(0, 400); fs.writeFileSync(out + '.request.json', JSON.stringify(rec, null, 1)); console.error(rec.error); process.exit(1); }
let buf = Buffer.from(p.data, 'base64');
const tmp = out + '.native'; fs.writeFileSync(tmp, buf);
rec.mime = p.mimeType; rec.usage = d.usageMetadata; rec.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
fs.writeFileSync(out + '.request.json', JSON.stringify(rec, null, 1));
console.log(JSON.stringify({out, mime: p.mimeType, tokens: d.usageMetadata?.totalTokenCount}));
