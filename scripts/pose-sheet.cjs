// Render every library pose / motion / combination as a full-body PNG for visual review.
//   node scripts/pose-sheet.cjs projects/absen/three <outDir>
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 720, height: 1280}}); p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000}); await p.evaluate('window.setup()');
  await p.addStyleTag({content: '#title,#cap{display:none!important}'});
  const names = await p.evaluate('Object.keys(window.__lab.poseCases())');
  for (const n of names) { await p.evaluate(`window.__lab.body(window.__lab.poseCases()[${JSON.stringify(n)}])`);
    await p.screenshot({path: path.join(out, n.replace(/[^\w+-]/g, '_') + '.png'), clip: {x: 60, y: 160, width: 600, height: 960}}); }
  await b.close(); console.log(names.length, 'poses');
})();
