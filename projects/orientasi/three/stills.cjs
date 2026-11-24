// node stills.cjs out_dir t1 t2 ... -> PNG stills for review
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [out, ...ts] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 720, height: 1280}});
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); }); p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.resolve('index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000});
  await p.evaluate('window.setup()');
  for (const t of ts) { const t0 = Date.now(); const name = await p.evaluate(`window.renderAt(${t})`);
    await p.screenshot({path: `${out}/t${String(t).padStart(5, '0')}-${name}.png`}); console.log(t, name, Date.now() - t0, 'ms'); }
  await b.close();
})();
