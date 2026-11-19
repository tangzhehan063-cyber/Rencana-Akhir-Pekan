// node render.cjs START END OUT.mp4  -> silent video frames rendered deterministically at 30fps
const {chromium} = require('playwright'); const path = require('path'); const {spawn} = require('child_process');
(async () => {
  const [a, b, out] = process.argv.slice(2); const t0 = +a, t1 = +b, fps = 30, n = Math.round((t1 - t0) * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film', '-x264-params', 'aq-mode=3', '-pix_fmt', 'yuv420p', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const br = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--allow-file-access-from-files', '--enable-unsafe-swiftshader']});
  const p = await br.newPage({viewport: {width: 720, height: 1280}});
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + path.resolve('index.html')); await p.waitForFunction('window.sceneReady', null, {timeout: 60000}); await p.evaluate('window.setup()');
  const start = Date.now();
  for (let i = 0; i < n; i++) { const t = t0 + i / fps; await p.evaluate(`window.renderAt(${t})`);
    const buf = await p.screenshot({type: 'png'}); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n} t=${t.toFixed(2)} ${((Date.now() - start) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close(); console.log('done', out);
})();
