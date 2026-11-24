const { createHash } = require('node:crypto');
const { mkdir, writeFile, readdir, readFile } = require('node:fs/promises');
const { createRequire } = require('node:module');
const { dirname, join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const [entry, output, start, end, ...extra] = process.argv.slice(2);
  if (!entry || !output || extra.length || (start === undefined) !== (end === undefined)) {
    throw new Error('Usage: node three-scene-preflight.cjs INDEX.html OUTPUT_DIR [START END]');
  }
  const index = resolve(entry);
  const from = start === undefined ? -Infinity : Number(start);
  const to = end === undefined ? Infinity : Number(end);
  if (start !== undefined && (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from)) {
    throw new Error('START and END must be finite seconds with 0 <= START < END.');
  }
  // Static determinism lint: frame content must be a pure function of t.
  // Additive point sprites are reported, not blocked: dust must be justified by the scene.
  const forbidden = /Math\.random\s*\(|Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/;
  const sceneDir = dirname(index);
  const lintErrors = [];
  const lintWarnings = [];
  for (const name of await readdir(sceneDir)) {
    if (!name.endsWith('.js') && !name.endsWith('.mjs')) continue;
    (await readFile(join(sceneDir, name), 'utf8')).split('\n').forEach((line, i) => {
      if (forbidden.test(line.replace(/\/\/.*$/, ''))) lintErrors.push(`${name}:${i + 1}: non-deterministic source in scene code`);
      if (/THREE\.Points\(/.test(line) && /AdditiveBlending/.test(line)) lintWarnings.push(`${name}:${i + 1}: additive point sprites can twinkle; keep only if the scene justifies them`);
    });
  }
  lintWarnings.forEach(w => console.warn('warning: ' + w));
  if (lintErrors.length) throw new Error('Determinism lint failed:\n' + lintErrors.join('\n'));
  const projectRequire = createRequire(join(dirname(index), 'package.json'));
  const { chromium } = projectRequire('playwright');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      const location = message.location().url;
      if (message.type() === 'error' && !location.endsWith('/favicon.ico')) {
        errors.push(location ? `${location}: ${message.text()}` : message.text());
      }
    });
    await page.goto(process.env.THREE_SCENE_URL || pathToFileURL(index).href);
    await page.waitForFunction(() => window.sceneReady, null, { timeout: 60000 });
    const shots = await page.evaluate(() => window.setup());
    if (!Array.isArray(shots) || !shots.length) throw new Error('setup() must return [name, start, end] shot tuples.');

    const canvas = await page.locator('canvas').first().evaluate(element => ({
      width: element.width, height: element.height,
    }));
    await page.setViewportSize(canvas);

    const samples = [];
    let previousEnd = 0;
    for (const [i, shot] of shots.entries()) {
      const [name, startTime, endTime] = Array.isArray(shot) ? shot : [];
      if (typeof name !== 'string' || !name || !Number.isFinite(startTime) ||
          !Number.isFinite(endTime) || Math.abs(startTime - previousEnd) > 1e-6 || endTime <= startTime) {
        throw new Error(`Invalid or discontinuous timeline at shot ${i + 1}: ${JSON.stringify(shot)} (expected start ${previousEnd}).`);
      }
      previousEnd = endTime;
      const left = Math.max(startTime, from);
      const right = Math.min(endTime, to);
      if (left >= right) continue;
      for (const [position, fraction] of [['start', 0], ['middle', 0.5], ['end', 0.95]]) {
        samples.push({
          name, time: left + (right - left) * fraction,
          file: `${String(i + 1).padStart(3, '0')}-${name.replace(/[^a-z0-9_-]/gi, '_')}-${position}.png`,
        });
      }
    }
    if (!samples.length) throw new Error('Requested range contains no shots.');

    await mkdir(output, { recursive: true });
    async function capture(sample) {
      const active = await page.evaluate(time => window.renderAt(time), sample.time);
      if (active !== sample.name) throw new Error(`At ${sample.time}s expected "${sample.name}", got "${active}".`);
      const png = await page.screenshot();
      return { png, hash: createHash('sha256').update(png).digest('hex') };
    }

    for (const sample of samples) {
      const { png, hash } = await capture(sample);
      sample.hash = hash;
      await writeFile(join(output, sample.file), png);
    }
    const differences = [];
    for (const sample of [...samples].reverse()) {
      const { png, hash } = await capture(sample);
      if (hash !== sample.hash) {
        const file = sample.file.replace(/\.png$/, '-reverse.png');
        await writeFile(join(output, file), png);
        differences.push({ time: sample.time, forward: sample.file, reverse: file });
      }
    }
    await writeFile(join(output, 'report.json'), JSON.stringify({ samples, differences, errors }, null, 2) + '\n');
    if (differences.length || errors.length) {
      throw new Error(`${differences.length} seek-dependent frame(s), ${errors.length} browser error(s). See ${join(output, 'report.json')}.`);
    }
    console.log(`Checked ${samples.length} frames. Review the PNGs and a normal-speed preview before encoding the full film.`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
