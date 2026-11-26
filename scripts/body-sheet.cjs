// Render body-spec lineups (rig v4.1) as PNGs for visual review, plus their derived metrics.
//   node scripts/body-sheet.cjs projects/absen/three <outDir>
// Each lineup is a list of specs; a spec is a preset name, a patch object, or an array of both (merged left to right).
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
const LINEUPS = {
  height: ['short', 'average', 'tall', 'longLimbed'],
  build: ['slim', 'average', 'stocky', 'heavy'],
  shape: ['broad', 'smallHead', 'largeHead', 'average'],
  combos: [['tall', 'slim', 'smallHead'], ['short', 'stocky', 'largeHead'], ['broad', {upper: 0.33, fore: 0.32}], [{height: 1.9}, 'heavy', {thigh: 0.36, shin: 0.36}]],
};
(async () => {
  const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 720, height: 1280}}); p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000}); await p.evaluate('window.setup()');
  await p.addStyleTag({content: '#title,#cap{display:none!important}'});
  const report = {};
  for (const [name, specs] of Object.entries(LINEUPS)) {
    report[name] = await p.evaluate(`window.__lab.lineup(${JSON.stringify(specs)})`);
    await p.screenshot({path: path.join(out, `body-${name}.png`)});
  }
  fs.writeFileSync(path.join(out, 'body-metrics.json'), JSON.stringify(report, null, 1));
  await b.close(); console.log(JSON.stringify(report, null, 1));
})();
