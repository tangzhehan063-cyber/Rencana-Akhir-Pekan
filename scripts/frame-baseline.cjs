// Visual-regression guard for the Three.js films (does not change any output).
//   node scripts/frame-baseline.cjs <project/three dir> record   -> write baseline-frames.json (+ PNGs to <outdir>)
//   node scripts/frame-baseline.cjs <project/three dir> check    -> re-render, exit 1 if any frame hash differs
// Samples the middle of every shot reported by window.setup(). Same machine + same Chromium/SwiftShader => byte-identical PNGs.
// Needs: playwright, and `npm ci` inside the project dir.  Optional 3rd arg: directory to save PNGs.
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');
(async () => {
  const dir = path.resolve(process.argv[2] || '.'), mode = process.argv[3] || 'check', outDir = process.argv[4];
  const file = path.join(dir, 'baseline-frames.json');
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 720, height: 1280}});
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000});
  const shots = await p.evaluate('window.setup()');
  const now = {};
  for (const [name, t0, t1] of shots) {
    const t = +((t0 + t1) / 2).toFixed(3); const got = await p.evaluate(`window.renderAt(${t})`);
    const buf = await p.screenshot({type: 'png'}); const key = `${name}@${t}`;
    now[key] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    if (outDir) { fs.mkdirSync(outDir, {recursive: true}); fs.writeFileSync(path.join(outDir, `${name}.png`), buf); }
    if (got !== name) console.log(`WARN renderAt(${t}) returned ${got}, expected ${name}`);
  }
  await b.close();
  if (mode === 'record') { fs.writeFileSync(file, JSON.stringify(now, null, 1) + '\n'); console.log(`recorded ${Object.keys(now).length} frames -> ${file}`); return; }
  const base = JSON.parse(fs.readFileSync(file, 'utf8')); let bad = 0;
  for (const k of new Set([...Object.keys(base), ...Object.keys(now)])) if (base[k] !== now[k]) { bad++; console.log('DIFF', k, base[k] || '(none)', '->', now[k] || '(none)'); }
  console.log(bad ? `FAIL: ${bad} frame(s) changed` : `OK: ${Object.keys(now).length} frames identical to baseline`); process.exit(bad ? 1 : 0);
})();
