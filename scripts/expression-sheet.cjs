// Render every named expression as a face close-up (PNG per expression) for visual review.
//   node scripts/expression-sheet.cjs projects/absen/three <outDir> [genre]
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), genre = process.argv[4] || null; fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 720, height: 1280}}); p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000}); await p.evaluate('window.setup()'); await p.addStyleTag({content: '#title,#cap{display:none!important}'});
  const names = ['neutral', ...await p.evaluate('window.__lab.names')];
  for (const n of names) { await p.evaluate(`window.__lab.face(${JSON.stringify(n === 'neutral' ? 'deadpan' : n)}, ${n === 'neutral' ? 0 : 1}, ${JSON.stringify(genre)})`);
    await p.screenshot({path: path.join(out, n + '.png'), clip: {x: 110, y: 440, width: 500, height: 500}}); }
  await b.close(); console.log(names.join(' '));
})();
