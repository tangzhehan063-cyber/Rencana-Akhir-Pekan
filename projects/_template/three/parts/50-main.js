// ---------- camera ----------
// cam(pos, look, fov, shake, t): handheld drift (deterministic in t) + rim light that follows the view.
// Guard: records a warning when the lens is closer than LOOK.minCamDist to a visible actor's head (ABSEN 49 s shot).
const camWarnings = [];
function cam(pos, look, fov = 45, shakeAmp = 0, t = 0) {
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos);
  if (shakeAmp > 0) camera.position.add(V((noise1(t * 0.7) - .5) * shakeAmp * 10, (noise1(t * 0.6 + 30) - .5) * shakeAmp * 10, 0));
  camera.lookAt(look); placeRim(camera.position, look, fx.rim); placeKey(camera, fx.key);
}
function checkCamera(t, shot) { scene.updateMatrixWorld(true);
  for (const a of cast) { if (!a.root.visible) continue; const h = a.head.getWorldPosition(V(0, 0, 0)), d = h.distanceTo(camera.position);
    if (d < LOOK.minCamDist) camWarnings.push({t: +t.toFixed(3), shot, dist: +d.toFixed(3)}); } }
function cctvText(s) { cctvEl.style.display = 'block'; cctvEl.querySelector('.bl').textContent = s; }

// ---------- post-processing: MSAA target + gentle bloom + look pass (CA, vignette, CCTV) ----------
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, {samples: LOOK.msaa, type: THREE.HalfFloatType})); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold); composer.addPass(bloom);
const lookPass = new ShaderPass({uniforms: {tDiffuse: {value: null}, uCA: {value: 1}, uVig: {value: 1}, uCCTV: {value: 0}, uTime: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig, uCCTV, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 off = c * r2 * 0.012 * uCA;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (uCCTV > 0.5) { float l = dot(col, vec3(0.3,0.59,0.11)); col = vec3(l*0.92, l*1.02, l*0.95); col = (col-0.5)*1.25+0.5;
        col *= 0.88 + 0.12*sin(vUv.y*1280.0*1.6); col += (h(vUv*vec2(720.0,1280.0) + floor(uTime*30.0)) - 0.5)*0.09; }
      col *= mix(1.0, 1.0 - smoothstep(0.25, 0.95, length(c*vec2(1.0,0.75))), 0.55*uVig);
      gl_FragColor = vec4(col, 1.0); }`});
composer.addPass(lookPass); composer.addPass(new OutputPass());

// ---------- overlay (HTML: title, captions, CCTV labels, end card) ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), setupEl = $('setup'), payEl = $('payoff'), ruleEl = $('rule'), fadeEl = $('fade'), cctvEl = $('cctv'), endEl = $('end');
let captions = [], TITLE = {setup: '', payoff: '', until: 0};
function overlay(t) {
  const showT = t < TITLE.until; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, TITLE.until - 0.3, TITLE.until); setupEl.style.opacity = seg(t, 0.1, 0.35) * out; payEl.style.opacity = seg(t, 0.6, 0.8) * out;
    ruleEl.style.width = `${clamp((t - 0.7) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : ''; capEl.className = c && c.machine ? 'machine' : ''; capEl.style.opacity = c ? 1 : 0;
}
// static film grain (drawn once)
{ const g = $('grain').getContext('2d'); const im = g.createImageData(360, 640); let s = 7; for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '700 40px Caveat', '800 40px Nunito'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  const meta = await (await fetch('film.json')).json(); TITLE = meta.title; setupEl.textContent = TITLE.setup; payEl.textContent = TITLE.payoff;
  $('end').querySelector('.t').textContent = meta.end.text; $('end').querySelector('.credit').textContent = meta.end.credit;
  clockTex.userData.s = null; scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  reset();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  scene.updateMatrixWorld(true); syncFx(); checkCamera(t, s.name);
  lookPass.uniforms.uCCTV.value = fx.cctv; lookPass.uniforms.uTime.value = t; lookPass.uniforms.uCA.value = fx.ca; lookPass.uniforms.uVig.value = fx.vig;
  composer.render();
  overlay(t);
  return s.name;
};
window.camWarnings = camWarnings;

// Test-only hooks (never used by renderAt): body lineups and face/pose sheets for review (scripts/body-sheet.cjs, pose-sheet.cjs, expression-sheet.cjs).
const LAB_AT = V(0, 0, 0.5);
window.__lab = { names: Object.keys(EXPR), actor: null, bodies: {}, expr, acting, compose, walkPose, lookBehind, track: poseTrack,
  _stage() { reset(); roomBase(); fx.rim = 0.5; },
  _bare() { if (!this.actor) { this.actor = makeStick({tie: false, card: false}); scene.add(this.actor.root); } const a = this.actor; a.root.visible = true; return a; },
  _render() { scene.updateMatrixWorld(true); syncFx(); composer.render(); },
  poseCases() { const w = Math.PI * 0.6; return {...Object.fromEntries(Object.keys(POSE).map(n => [n, POSE[n]])), 'run': run(w), 'sneak': sneak(w), 'wave': wave(0.1), 'talk': talk(0.5)}; },
  body(patch, rotY = 0.45) { this._stage(); const a = this._bare(); a.root.position.copy(LAB_AT); a.root.rotation.y = rotY; a.pose({blink: false, ...patch}, 0);
    cam(LAB_AT.clone().add(V(0, 0.95, 3.0)), LAB_AT.clone().add(V(0, 0.82, 0)), 42); this._render(); a.root.visible = false; },
  face(name, k = 1, genre = null, extra = {}) { this._stage(); const a = this._bare(); a.root.position.copy(LAB_AT); a.root.rotation.y = 0;
    a.pose({...(typeof name === 'string' ? expr(name, k, genre) : name), blink: false, ...extra}, 0);
    const e = LAB_AT.clone().add(V(0, a.metrics.eyeY, 0)); cam(e.clone().add(V(0, 0, 1.6)), e, 32); this._render(); a.root.visible = false; return name; },
  lineup(specs, patch = {}, rotY = 0.35) { this._stage(); const n = specs.length, gap = 0.62, out = [];
    specs.forEach((sp, i) => { const key = JSON.stringify(sp);
      if (!this.bodies[key]) { const a = makeStick({tie: false, card: false, body: bodySpec(...[].concat(sp))}); a.setBlinkSeed(0); scene.add(a.root); this.bodies[key] = a; }
      const a = this.bodies[key]; a.root.visible = true; a.root.position.copy(LAB_AT).add(V((i - (n - 1) / 2) * gap, 0, 0)); a.root.rotation.y = rotY; a.pose({blink: false, ...patch}, 0);
      const m = a.metrics; out.push({spec: sp, height: +m.height.toFixed(3), headsTall: +m.headsTall.toFixed(2), shoulderWidth: +m.shoulderWidth.toFixed(3), reach: +m.reach.toFixed(3), hipY: +m.hipY.toFixed(3)}); });
    const w = (n - 1) * gap + 0.8, d = Math.max(3.0, w / 2 / 0.2); cam(LAB_AT.clone().add(V(0, 1.0, d)), LAB_AT.clone().add(V(0, 0.95, 0)), 42); this._render();
    Object.values(this.bodies).forEach(a => a.root.visible = false); return out; } };
window.sceneReady = true;
