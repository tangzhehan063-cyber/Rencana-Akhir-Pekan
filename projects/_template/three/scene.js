import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// STICKMAN HORROR TEMPLATE — Three.js renderer (rig v4.1). Copy this folder to start a new film.
// Deterministic: window.renderAt(t) draws the frame for absolute video time t (seconds).

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82; // RONDA MALAM value: keeps white toon faces under the bloom threshold
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);
scene.fog = new THREE.FogExp2(0x080b0f, 0.045);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.03, 120);

// ---------- helpers ----------
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const seg = (t, a, b) => ease((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: o.r ?? 0.95, metalness: o.m ?? 0, ...o.extra});
function box(w, h, d, mat, x, y, z, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = {c, g, draw}; return t;
}
function concreteTex(base, w = 512, h = 512, seed = 1) {
  const t = canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const r = hash(i * 3.1 + seed); g.fillStyle = `rgba(${r < .5 ? 0 : 255},${r < .5 ? 0 : 255},${r < .5 ? 0 : 255},${0.025 + hash(i + seed) * 0.05})`;
      g.fillRect(hash(i * 1.7 + seed) * w, hash(i * 2.3 + seed) * h, 4 + hash(i * 5 + seed) * 10, 4 + hash(i * 7 + seed) * 10); }
    g.filter = 'blur(1.5px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = hash(i + seed * 9) * w, y = hash(i * 4 + seed) * h; g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (hash(i * 10 + k) - .5) * 60; y += hash(i * 20 + k) * 40; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 12; i++) g.fillRect(0, hash(i + 50) * h, w, 1);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ---------- materials ----------
const black = new THREE.MeshStandardMaterial({color: 0x0b0b0b, roughness: 0.85});
const white = new THREE.MeshStandardMaterial({color: 0xf4f2ee, roughness: 0.55});
const outlineMat = new THREE.MeshBasicMaterial({color: 0x050505, side: THREE.BackSide});
const steel = std(0x8d949b, {r: 0.45, m: 0.6});
const steelDark = std(0x5d646b, {r: 0.5, m: 0.55});


// ---------- TOON STICKMAN RIG v4 (cel shading + ink outline on every part, blink, breathing) ----------
const toonRamp = (() => { const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toonWhite = new THREE.MeshToonMaterial({color: 0xf6f3ec, gradientMap: toonRamp});
const toonBody = new THREE.MeshToonMaterial({color: 0x232326, gradientMap: toonRamp});
const inkMat = new THREE.MeshBasicMaterial({color: 0x050505, side: THREE.BackSide});
const INK = 0.011; // outline thickness (m)
function inked(geo, mat, ink = INK, parent) { // mesh + back-face hull slightly larger
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const o = new THREE.Mesh(geo.clone(), inkMat); o.userData.ink = true;
  const g = new THREE.Group(); g.add(m, o); g.userData.setInk = (sx, sy, sz) => o.scale.set(sx, sy, sz); g.userData.mesh = m; g.userData.ol = o;
  if (parent) parent.add(g); return g;
}
function capsuleInked(len, r) { const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), toonBody); m.position.y = -len / 2; m.castShadow = true;
  const o = new THREE.Mesh(new THREE.CapsuleGeometry(r + INK, len, 6, 14), inkMat); o.position.y = -len / 2; g.add(m, o); return g; }
// ---------- BODY SPEC (rig v4.1) ----------
// Body proportions are data, separate from identity (colours, kit flags) and from motion.
// BODY_DEFAULT reproduces rig v4 exactly: an actor built without `body` is pixel-identical to before.
// Units are metres. null = derived from other fields (same arithmetic as v4).
const RIG_VERSION = '4.1-bodyspec';
const BODY_DEFAULT = Object.freeze({
  headR: 0.14,                  // skull radius; face + head kit scale with it
  headShape: [1, 1.04, 0.96],   // skull squash (x, y, z)
  torso: 0.46,                  // chest length (hip pivot -> neck base)
  torsoR: 0.064,                // torso capsule radius (sets width; tie/badge/belt follow)
  torsoShape: [1.08, 1, 0.82],  // torso squash (x = width, z = depth)
  shoulderX: null,              // half shoulder span; null = torsoR * 1.08 (v4: shoulders sit on the torso edge)
  hipX: null,                   // half hip span; null = torsoR * 0.62
  upper: 0.28, fore: 0.27,      // upper arm / forearm
  armR: 0.043,                  // arm thickness (forearm = 0.95x)
  hand: 1,                      // glove scale
  thigh: 0.42, shin: 0.42,      // upper / lower leg
  legR: null,                   // shin thickness; null = armR (thigh = 1.08x)
  foot: 1,                      // shoe scale
  lean: 0, headTilt: 0,         // resting posture (rad), added under every pose
});
// Combinable starting points, not a fixed cast list. bodySpec('tall', 'slim', {headR: 0.12}) merges left to right.
const BODY_PRESETS = {
  average: {}, tall: {height: 1.9}, short: {height: 1.45},
  slim: {torsoR: 0.052, armR: 0.035, legR: 0.037},
  stocky: {height: 1.55, torsoR: 0.085, armR: 0.05, legR: 0.054},
  heavy: {torsoR: 0.1, torsoShape: [1.12, 1, 0.98], armR: 0.052, legR: 0.058, hipX: 0.075},
  broad: {torsoR: 0.08, shoulderX: 0.13},
  longLimbed: {upper: 0.33, fore: 0.32, thigh: 0.47, shin: 0.47},
  smallHead: {headR: 0.115}, largeHead: {headR: 0.165},
};
const _BODY_LIMITS = {headR: [0.08, 0.22], torso: [0.25, 0.75], torsoR: [0.035, 0.14], upper: [0.15, 0.45], fore: [0.15, 0.45],
  armR: [0.02, 0.08], legR: [0.02, 0.09], thigh: [0.22, 0.65], shin: [0.22, 0.65], hand: [0.6, 1.6], foot: [0.6, 1.6], height: [0.9, 2.4]};
// height (optional) = standing height to the top of the skull; reached by scaling torso + limb lengths (never head or thickness).
function _bodyHeight(B) { return B.thigh + B.shin + 0.035 + B.torso + 0.035 + B.headR + 0.01 + B.headR * B.headShape[1]; }
function bodySpec(...patches) {
  const B = {...BODY_DEFAULT};
  for (const p of patches) { const q = typeof p === 'string' ? BODY_PRESETS[p] : p; if (!q) { console.warn('bodySpec: unknown preset', p); continue; } Object.assign(B, q); }
  for (const [k, [lo, hi]] of Object.entries(_BODY_LIMITS)) if (B[k] != null && (B[k] < lo || B[k] > hi)) { console.warn(`bodySpec: ${k}=${B[k]} clamped to [${lo}, ${hi}]`); B[k] = clamp(B[k], lo, hi); }
  if (B.height != null) { const fixed = 0.035 + 0.035 + B.headR + 0.01 + B.headR * B.headShape[1], len = B.thigh + B.shin + B.torso, k = (B.height - fixed) / len;
    for (const key of ['thigh', 'shin', 'torso', 'upper', 'fore']) B[key] *= k; delete B.height; }
  return Object.freeze(B);
}
// Derived measurements, usable before an actor exists (for staging, framing, reach and seat checks).
function bodyMetrics(B = BODY_DEFAULT) {
  const TR = B.torsoR, hipY = B.thigh + B.shin + 0.035, shoulderX = B.shoulderX ?? TR * 1.08, hipX = B.hipX ?? TR * 0.62;
  const headCenterY = hipY + B.torso + 0.035 + B.headR + 0.01, height = headCenterY + B.headR * B.headShape[1];
  const armLength = B.upper + B.fore, handLen = (0.045 + 0.062 * 1.1) * B.hand;
  return {rig: RIG_VERSION, hipY, legLength: hipY, shoulderY: hipY + B.torso - 0.06, neckY: hipY + B.torso + 0.035, headCenterY,
    eyeY: headCenterY + 0.02 * B.headR / 0.14, height, headsTall: height / (2 * B.headR * B.headShape[1]),
    shoulderWidth: 2 * shoulderX, hipWidth: 2 * hipX, torsoWidth: 2 * TR * B.torsoShape[0], headWidth: 2 * B.headR,
    armLength, reach: armLength + handLen, handWidth: 2 * 0.062 * B.hand, footLength: (0.07 + 2 * 0.042) * B.foot,
    strideHint: 0.62 * hipY / 0.875,              // walk STRIDE scaled from the v4 body (0.62 m at 0.875 m legs)
    sitHipY: seatTop => seatTop - 0.01 - hipY};   // pose hipY that seats the hips on a surface (v4 Darto: seat 0.485 -> -0.4)
}

let _stickCount = 0;
function makeStick(opts = {}) {
  const O = Object.assign({tie: true, card: true, cap: false, mustache: false, badge: false, belt: false}, opts);
  const B = opts.body ? (Object.isFrozen(opts.body) && 'torsoShape' in opts.body ? opts.body : bodySpec(opts.body)) : BODY_DEFAULT;
  // HR is the head's modelling radius (face/kit are authored at 0.14); the whole head group is scaled to B.headR.
  const HR = 0.14, headK = B.headR / HR, LR = B.armR, LEG = B.legR ?? LR, TR = B.torsoR, TS = B.torsoShape;
  const UPPER = B.upper, FORE = B.fore, THIGH = B.thigh, SHIN = B.shin, TORSO = B.torso;
  const HIP_Y = THIGH + SHIN + 0.035;
  const root = new THREE.Group(); const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Group(); torso.add(chest);
  { const m = new THREE.Mesh(new THREE.CapsuleGeometry(TR, TORSO - TR, 8, 18), toonBody); m.position.y = TORSO / 2; m.scale.set(TS[0], TS[1], TS[2]); m.castShadow = true; chest.add(m);
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(TR + INK, TORSO - TR, 8, 18), inkMat); o.position.copy(m.position); o.scale.copy(m.scale); chest.add(o); }
  const extras = [];
  if (O.tie) { const tieMat = new THREE.MeshToonMaterial({color: 0x9c1d1d, gradientMap: toonRamp});
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.03), tieMat); knot.position.set(0, TORSO - 0.02, TR * 0.8);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.27, 0.014), tieMat); tie.position.set(0, TORSO - 0.18, TR * 0.86);
    chest.add(knot, tie); extras.push(knot, tie); }
  if (O.card) { const card = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.008), new THREE.MeshToonMaterial({color: 0x2f6fb5, gradientMap: toonRamp})); card.position.set(0.075, TORSO - 0.17, TR * 0.8); chest.add(card); extras.push(card); }
  if (O.badge) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 6), new THREE.MeshStandardMaterial({color: 0xd9b44a, metalness: 0.6, roughness: 0.35})); b.rotation.x = Math.PI / 2; b.position.set(0.07, TORSO - 0.1, TR * 0.85); chest.add(b);
    const name = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.006), new THREE.MeshToonMaterial({color: 0xe8e2d0, gradientMap: toonRamp})); name.position.set(-0.07, TORSO - 0.1, TR * 0.85); chest.add(name); }
  if (O.belt) { const belt = new THREE.Mesh(new THREE.TorusGeometry(TR * 1.02, 0.012, 6, 24), new THREE.MeshToonMaterial({color: 0x4a3322, gradientMap: toonRamp})); belt.rotation.x = Math.PI / 2; belt.scale.set(TS[0], TS[2], 1); belt.position.y = 0.04; chest.add(belt); }
  const neck = new THREE.Group(); neck.position.y = TORSO + 0.035; chest.add(neck);
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 10), toonBody); neck.add(m); }
  const head = new THREE.Group(); head.position.y = B.headR + 0.01; if (headK !== 1) head.scale.setScalar(headK); neck.add(head);
  const skullG = inked(new THREE.SphereGeometry(HR, 40, 30), toonWhite, INK, head); skullG.scale.set(B.headShape[0], B.headShape[1], B.headShape[2]); skullG.userData.ol.scale.setScalar((HR + INK) / HR);
  const EZ = HR * 0.93; const eyeMat = new THREE.MeshBasicMaterial({color: 0x0a0a0a});
  const eyes = [-0.045, 0.045].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 12), eyeMat); e.position.set(x, 0.02, EZ); head.add(e); return e; });
  const pupils = eyes.map(e => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), new THREE.MeshBasicMaterial({color: 0xffffff})); p.position.set(0.006, 0.01, 0.02); e.add(p); return p; });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), eyeMat); mouth.position.set(0, -0.055, EZ - 0.006); head.add(mouth);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.005, 6, 16), eyeMat); mouthO.position.set(0, -0.058, EZ - 0.004); head.add(mouthO);
  const mouthF = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 16, Math.PI * 0.8), eyeMat); mouthF.position.set(0, -0.075, EZ - 0.012); mouthF.rotation.z = Math.PI * 0.1; head.add(mouthF);
  // expression-layer mouths (hidden unless pose() asks for them): smile arc (U-shape) and open mouth
  const arc = (rot, y) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 16, Math.PI * 0.8), eyeMat); m.rotation.z = rot; g.add(m); g.position.set(0, y, EZ - 0.002); g.visible = false; head.add(g); return g; };
  const mouthS = arc(Math.PI * 1.1, -0.042); // smile (U) ; mouthN = 'sad' frown (n) sitting on the head surface. Group takes scale/tilt so the base rotation does not skew width.
  const mouthN = arc(Math.PI * 0.1, -0.078);
  const mouthD = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 10), eyeMat); mouthD.position.set(0, -0.06, EZ - 0.004); mouthD.scale.set(1, 0.6, 0.5); mouthD.visible = false; head.add(mouthD);
  const brows = [-0.045, 0.045].map(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.01), eyeMat); b.position.set(x, 0.062, EZ - 0.01); head.add(b); return b; });
  if (O.cap) { const capMat = new THREE.MeshToonMaterial({color: 0x1f2d4f, gradientMap: toonRamp});
    const cap = inked(new THREE.CylinderGeometry(HR * 0.98, HR * 1.06, 0.09, 28), capMat, INK, head); cap.position.y = HR * 0.72; cap.userData.ol.scale.set(1.07, 1.12, 1.07);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(HR * 0.8, HR * 0.8, 0.014, 20, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshToonMaterial({color: 0x121b33, gradientMap: toonRamp})); brim.rotation.y = Math.PI; brim.position.set(0, HR * 0.5, HR * 0.55); head.add(brim);
    const emb = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), new THREE.MeshStandardMaterial({color: 0xd9b44a, metalness: 0.6, roughness: 0.4})); emb.position.set(0, HR * 0.75, HR * 1.02); head.add(emb); }
  if (O.mustache) { const ms = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.055, 4, 8), eyeMat); ms.rotation.z = Math.PI / 2; ms.position.set(0, -0.032, EZ + 0.002); ms.scale.set(1, 1, 0.6); head.add(ms); }
  const mkArm = side => { const sh = new THREE.Group(); sh.position.set(side * (B.shoulderX ?? TR * 1.08), TORSO - 0.06, 0); chest.add(sh);
    const up = capsuleInked(UPPER, LR); sh.add(up); const el = new THREE.Group(); el.position.y = -UPPER; up.add(el);
    const fo = capsuleInked(FORE, LR * 0.95); el.add(fo); const wr = new THREE.Group(); wr.position.y = -FORE; fo.add(wr);
    const glove = new THREE.Group(); if (B.hand !== 1) glove.scale.setScalar(B.hand); wr.add(glove);
    const palm = inked(new THREE.SphereGeometry(0.062, 18, 14), toonWhite, INK, glove); palm.position.y = -0.045; palm.scale.set(1, 1.1, 0.8); palm.userData.ol.scale.setScalar(1.17);
    const th = inked(new THREE.SphereGeometry(0.023, 10, 8), toonWhite, INK, glove); th.position.set(side * -0.05, -0.03, 0.022); th.userData.ol.scale.setScalar(1.45);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 16), toonWhite); cuff.rotation.x = Math.PI / 2; glove.add(cuff);
    const finger = inked(new THREE.CapsuleGeometry(0.016, 0.05, 4, 8), toonWhite, INK, glove); finger.position.set(0, -0.115, 0.0); finger.userData.ol.scale.setScalar(1.6); finger.visible = false;
    return {sh, el, wr, glove, finger}; };
  const L = mkArm(1), R = mkArm(-1);
  const mkLeg = side => { const hp = new THREE.Group(); hp.position.set(side * (B.hipX ?? TR * 0.62), 0, 0); hips.add(hp);
    const th = capsuleInked(THIGH, LEG * 1.08); hp.add(th); const kn = new THREE.Group(); kn.position.y = -THIGH; th.add(kn);
    const sh = capsuleInked(SHIN, LEG); kn.add(sh);
    const ank = new THREE.Group(); ank.position.y = -SHIN; sh.add(ank);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.07, 4, 10), toonBody); foot.rotation.x = Math.PI / 2; foot.scale.set(1.15 * B.foot, B.foot, 0.75 * B.foot); foot.position.set(0, -0.02, 0.045); foot.castShadow = true; ank.add(foot);
    return {hp, kn, ank}; };
  const LL = mkLeg(1), RL = mkLeg(-1);
  let blinkSeed = (_stickCount++ * 2.37 + 0.9) % 10; // deterministic per-actor default (was Math.random: re-renders could differ)
  function pose(p, t = 0) {
    const P = Object.assign({la: [0.05, 0.1], le: 0.15, ra: [0.05, 0.1], re: 0.15, ll: [0, 0.02], lk: 0, rl: [0, 0.02], rk: 0,
      head: [0, 0], roll: 0, lean: 0, twist: 0, eyes: 1, look: [0, 0], mouth: 'flat', brow: 0, hipY: 0, point: 0, blink: true, breathe: 1,
      // expression layer (all neutral by default => identical to the old pose()): see 12-expressions.js
      byL: 0, byR: 0, lid: 0, cross: 0, eyeAsym: 0, pupilS: 1, mw: 1, mc: 1, my: 0, mx: 0, mtilt: 0, mo: 0.6, shrug: 0}, p);
    L.sh.position.y = TORSO - 0.06 + 0.03 * P.shrug; R.sh.position.y = TORSO - 0.06 + 0.03 * P.shrug;
    L.sh.rotation.set(-P.la[0], 0, P.la[1]); L.el.rotation.set(-P.le, 0, 0);
    R.sh.rotation.set(-P.ra[0], 0, -P.ra[1]); R.el.rotation.set(-P.re, 0, 0);
    LL.hp.rotation.set(-P.ll[0], 0, P.ll[1]); LL.kn.rotation.set(P.lk, 0, 0); LL.ank.rotation.set(P.ll[0] - P.lk * 0.6, 0, 0);
    RL.hp.rotation.set(-P.rl[0], 0, -P.rl[1]); RL.kn.rotation.set(P.rk, 0, 0); RL.ank.rotation.set(P.rl[0] - P.rk * 0.6, 0, 0);
    const br = Math.sin(t * 1.7) * P.breathe;
    torso.rotation.set(P.lean + B.lean + br * 0.012, P.twist, 0); hips.position.y = HIP_Y + P.hipY; chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.015);
    neck.rotation.set(-P.head[1] - B.headTilt, P.head[0], P.roll);
    // blink: ~every 3.2 s, 0.13 s long (deterministic in t)
    const cyc = (t + blinkSeed) % 3.2, bl = P.blink && cyc < 0.13 ? Math.sin(cyc / 0.13 * Math.PI) : 0;
    eyes.forEach((e, i) => { const sg = i ? 1 : -1, es = i ? 1 - P.eyeAsym : 1 + P.eyeAsym, ei = P.eyes * es, lv = (i ? P.lidR : P.lidL) ?? P.lid;
      const sy = Math.max(0.08, 1.15 * ei * (1 - bl));
      e.scale.set(0.8 * (0.85 + 0.15 * ei), sy * (1 - lv), 0.45);
      e.position.x = sg * 0.045 + P.look[0] * 0.015 - sg * P.cross * 0.02; e.position.y = 0.02 + P.look[1] * 0.015 - 0.019 * sy * lv; });
    pupils.forEach(p => { p.visible = P.glint ?? (P.eyes > 1.15 && bl < 0.5); p.scale.setScalar(P.pupilS); });
    const mk = P.mouth;
    mouth.visible = mk === 'flat'; mouthO.visible = mk === 'o'; mouthF.visible = mk === 'frown'; mouthS.visible = mk === 'smile'; mouthN.visible = mk === 'sad'; mouthD.visible = mk === 'open';
    mouth.position.set(P.mx, -0.055 + P.my, EZ - 0.006); mouth.rotation.z = P.mtilt; mouth.scale.set(P.mw, 1, 1);
    mouthO.position.set(P.mx, -0.058 + P.my, EZ - 0.004); mouthO.scale.set(P.mw, P.mw, 1);
    mouthF.position.set(P.mx, -0.075 + P.my, EZ - 0.012); mouthF.rotation.z = Math.PI * 0.1 + P.mtilt; mouthF.scale.set(P.mw, P.mc, 1);
    mouthS.position.set(P.mx, -0.042 + P.my, EZ - 0.002); mouthS.rotation.z = P.mtilt; mouthS.scale.set(P.mw, P.mc, 1);
    mouthN.position.set(P.mx, -0.078 + P.my, EZ - 0.002); mouthN.rotation.z = P.mtilt; mouthN.scale.set(P.mw, P.mc, 1);
    mouthD.position.set(P.mx, -0.06 + P.my, EZ - 0.004); mouthD.rotation.z = P.mtilt; mouthD.scale.set(P.mw, P.mo * 1.3, 0.5);
    brows.forEach((b, i) => { const bv = (i ? P.browR : P.browL) ?? P.brow, by = i ? P.byR : P.byL;
      b.visible = Math.abs(bv) > 0.01 || Math.abs(by) > 0.01; b.rotation.z = (i ? -1 : 1) * bv * 0.5; b.position.y = 0.062 + Math.abs(bv) * 0.012 + by * 0.02; });
    L.finger.visible = P.point > 0.5;
  }
  pose({});
  return {root, pose, head, torso, chest, L, R, LL, RL, extras, setBlinkSeed: s => blinkSeed = s, body: B, metrics: bodyMetrics(B)};
}
// walk/run cycles; ph advances with travelled distance so feet do not slide (stride ~0.62 m per half-cycle)
function walkPose(ph, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.42 * s * amt, 0.02], lk: (Math.max(0, -c) * 0.75 + 0.05) * amt, rl: [-0.42 * s * amt, 0.02], rk: (Math.max(0, c) * 0.75 + 0.05) * amt,
    la: [lerp(0.05, -0.35 * s, amt), 0.1], ra: [lerp(0.05, 0.35 * s, amt), 0.1], le: lerp(0.15, 0.3, amt), re: lerp(0.15, 0.3, amt), hipY: -0.03 * Math.abs(Math.cos(ph)) * amt, twist: 0.08 * s * amt};
}
const STRIDE = 0.62;
function walkTo(actor, t, t0, t1, p0, p1, amt = 1) { // constant-speed walk from p0 to p1, returns pose patch
  const k = clamp((t - t0) / (t1 - t0)); const p = p0.clone().lerp(p1, k); actor.root.position.copy(p);
  actor.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  const d = p0.distanceTo(p1) * k; return k > 0 && k < 1 ? walkPose(d / STRIDE * Math.PI, amt) : {};
}

// ---------- EXPRESSION LIBRARY (additive; uses the stickman rig's pose() face/posture keys) ----------
// Usage in a shot:   actor.pose({...walkPose(...), ...expr('suspicious', 0.8), ra: [...]}, t)
//   expr(name, k=1, genre)      -> pose patch; k scales the expression from neutral (0) to full (1, may exceed 1 for exaggeration)
//   exprMix(a, b, k)            -> blend two names/patches (e.g. calm -> panicked)
//   acting(track, t, genre)     -> emotional progression: track = [[t0,'deadpan',1],[t1,'suspicious',.6],[t2,'panicked',1]] (smoothstep between keys, holds at ends)
// Keys: brow/browL/browR (angle: + inner-up/worried, - inner-down/angry), byL/byR (brow raise), lid/lidL/lidR (upper-lid closure 0..1),
//       eyes (size), look [x,y], cross (cross-eyed), eyeAsym, pupilS, glint, mouth ('flat'|'o'|'frown'(legacy)|'sad'|'smile'|'open') with mw (width) mc (curve)
//       my/mx (offset) mtilt (crooked) mo (open height), head [yaw,pitch], roll (tilt), lean, shrug, blink.
const EXPR_NEUTRAL = {browL: 0, browR: 0, byL: 0, byR: 0, lid: 0, eyes: 1, look: [0, 0], cross: 0, eyeAsym: 0, pupilS: 1, mouth: 'flat', mw: 1, mc: 1, my: 0, mx: 0, mtilt: 0, mo: 0.6,
  head: [0, 0], roll: 0, lean: 0, shrug: 0, blink: true};
const EXPR = {
  // --- flat / dry
  deadpan:      {lid: 0.45, mouth: 'flat', head: [0, 0.02]},
  expressionless: {eyes: 1.08, mouth: 'flat', blink: false},
  sarcastic:    {lid: 0.3, byR: 0.7, browR: 0.3, browL: -0.2, mouth: 'smile', mw: 0.85, mc: 0.9, mtilt: 0.22, mx: 0.015, roll: 0.1, look: [0.6, 0.8]},
  smug:         {lid: 0.5, browL: -0.15, browR: 0.1, byR: 0.3, mouth: 'smile', mw: 1, mc: 0.9, mtilt: 0.15, mx: 0.01, head: [0, 0.14], roll: -0.08, lean: -0.03},
  // --- awkward / social discomfort
  awkward:      {browL: 0.55, browR: 0.55, mouth: 'smile', mw: 0.9, mc: 0.9, mtilt: -0.08, look: [-1, 0.25], shrug: 0.6, roll: 0.1},
  embarrassed:  {lid: 0.3, browL: 0.7, browR: 0.7, mouth: 'smile', mw: 0.8, mc: 0.8, mtilt: 0.12, look: [-1, -0.8], shrug: 0.8, head: [-0.1, -0.2], lean: 0.08, roll: 0.08},
  nervous:      {eyes: 1.15, browL: 0.6, browR: 0.6, byL: 0.2, byR: 0.2, mouth: 'flat', mw: 0.55, my: -0.004, look: [-1, 0.2], shrug: 0.5, blink: true},
  uncomfortable:{lid: 0.2, browL: 0.4, browR: 0.25, mouth: 'flat', mw: 0.8, mtilt: 0.2, look: [-1, 0], shrug: 0.7, roll: 0.1, head: [0, -0.05]},
  // --- confusion / doubt
  confused:     {browL: -0.35, browR: 0.3, byR: 0.7, byL: -0.1, mouth: 'flat', mw: 0.7, mtilt: 0.18, roll: 0.16, head: [0.12, 0.02], look: [0.3, 0.5]},
  suspicious:   {lid: 0.35, browL: -0.5, browR: -0.2, byR: 0.15, mouth: 'flat', mw: 0.8, mtilt: 0.12, look: [1, 0], head: [-0.3, 0]},    // side-eye: head turned one way, eyes the other
  disbelief:    {eyes: 1.4, browL: 0.25, browR: 0.25, byL: 1, byR: 1, mouth: 'open', mw: 1.3, mo: 0.9, lean: -0.1, head: [0, 0.12], blink: false},
  // --- negative
  annoyed:      {lid: 0.5, browL: -0.6, browR: -0.6, mouth: 'flat', mw: 0.9, mtilt: -0.05, head: [0, -0.04], roll: 0.04},
  angry:        {lid: 0.25, eyes: 1.05, browL: -1, browR: -1, mouth: 'sad', mw: 1.3, mc: 1.1, my: -0.004, head: [0, -0.1], lean: 0.1},
  disgusted:    {lid: 0.35, browL: -0.35, browR: 0.1, byR: 0.4, mouth: 'sad', mw: 1.1, mtilt: 0.22, my: -0.002, head: [0, 0.1], roll: 0.12, lean: -0.05},
  sad:          {lid: 0.35, browL: 0.9, browR: 0.9, mouth: 'sad', mw: 1, mc: 0.9, look: [0, -1], head: [0, -0.15], lean: 0.06},
  // --- high energy
  excited:      {eyes: 1.3, browL: 0.3, browR: 0.3, byL: 0.6, byR: 0.6, mouth: 'smile', mw: 1.7, mc: 1.3, head: [0, 0.1], lean: -0.03, blink: false},
  panicked:     {eyes: 1.45, pupilS: 0.6, browL: 0.9, browR: 0.9, byL: 0.4, byR: 0.4, mouth: 'open', mw: 1.35, mo: 1.6, shrug: 1, head: [0, 0.1], lean: -0.05, blink: false},
  shocked:      {eyes: 1.35, browL: 0.5, browR: 0.5, byL: 0.8, byR: 0.8, mouth: 'o', mw: 1.1, lean: -0.06, head: [0, 0.05], blink: false},
  silly:        {eyes: 1.2, cross: 1, byL: 0.5, byR: 0.5, mouth: 'smile', mw: 1.5, mc: 1.2, roll: 0.25},
  ridiculous:   {eyes: 1.45, cross: 0.9, eyeAsym: 0.3, byL: 0.9, byR: -0.2, browL: 0.4, mouth: 'open', mw: 1.5, mo: 0.9, roll: 0.3, shrug: 1, lean: -0.05},
  // --- horror / uncanny
  evilGrin:     {lid: 0.4, browL: -0.7, browR: -0.7, mouth: 'smile', mw: 1.8, mc: 1.2, my: -0.002, pupilS: 0.5, glint: true, head: [0, -0.15], lean: 0.04},
  unnaturalSmile: {eyes: 1.6, pupilS: 0.3, glint: true, mouth: 'smile', mw: 2.6, mc: 1.0, blink: false},
  creepy:       {eyes: 1.3, pupilS: 0.4, glint: true, mouth: 'smile', mw: 1.7, mc: 0.7, roll: 0.3, head: [0, -0.1], blink: false},
  uncanny:      {eyes: 1.25, eyeAsym: 0.35, byL: 0.4, byR: -0.1, browL: 0.15, browR: 0.15, mouth: 'smile', mw: 1.5, mc: 0.9, mtilt: 0.1, roll: -0.12, blink: false},
};
// genre -> amplitude of deviation from neutral (character identity untouched; only intensity changes)
const GENRE_AMP = {comedy: 1.3, drama: 0.6, horror: 0.9, mystery: 0.75};
function exprBase(x) { return typeof x === 'string' ? Object.assign({}, EXPR_NEUTRAL, EXPR[x]) : Object.assign({}, EXPR_NEUTRAL, x); }
function exprLerp(A, B, k) { const o = {};
  for (const key of Object.keys(EXPR_NEUTRAL)) { const a = A[key], b = B[key];
    if (Array.isArray(a)) o[key] = a.map((v, i) => lerp(v, b[i], k));
    else if (typeof a === 'number') o[key] = lerp(a, b, k);
    else o[key] = k < 0.5 ? a : b; }                 // categorical keys (mouth, blink) switch halfway
  for (const key of ['glint']) { const v = k < 0.5 ? A[key] : B[key]; if (v !== undefined) o[key] = v; }
  return o; }
function exprMix(a, b, k) { return exprLerp(exprBase(a), exprBase(b), clamp(k)); }
function expr(name, k = 1, genre = null) { const amp = genre ? GENRE_AMP[genre] ?? 1 : 1;
  const o = exprLerp(EXPR_NEUTRAL, exprBase(name), k * amp);
  const full = exprBase(name); o.mouth = k * amp >= 0.35 ? full.mouth : 'flat'; o.blink = full.blink; if (full.glint !== undefined && k * amp > 0.5) o.glint = full.glint;
  return o; }
function acting(track, t, genre = null) { // track: [[time, nameOrPatch, intensity], ...] sorted by time
  if (t <= track[0][0]) return expr(track[0][1], track[0][2] ?? 1, genre);
  for (let i = 0; i < track.length - 1; i++) { const [t0, a, ka = 1] = track[i], [t1, b, kb = 1] = track[i + 1];
    if (t < t1) { const k = ease((t - t0) / (t1 - t0)); const A = exprLerp(EXPR_NEUTRAL, exprBase(a), ka * (GENRE_AMP[genre] ?? 1)), B = exprLerp(EXPR_NEUTRAL, exprBase(b), kb * (GENRE_AMP[genre] ?? 1));
      const o = exprLerp(A, B, k); const fa = exprBase(a), fb = exprBase(b); o.mouth = k < 0.5 ? fa.mouth : fb.mouth; o.blink = k < 0.5 ? fa.blink : fb.blink; return o; } }
  const L = track[track.length - 1]; return expr(L[1], L[2] ?? 1, genre); }

// ---------- POSE & MOTION LIBRARY (additive; existing walkPose/walkTo/sit() are untouched) ----------
// Static poses are patches for actor.pose(); motions are functions of time/phase returning patches.
//   POSE.<name>                       static body poses (point, think, shrug, facepalm, startled, cower, sitting, ...)
//   run(ph) sneak(ph) talk(t,en) wave(t) lookAround(t,t0) lookBehind(k) tremble(t,amt) sitNervous(t)   motions
//   compose(a, b, ...)                merge patches, later wins per key;  only(p, 'arms','head',...)  keeps just those body parts of a patch (arms/legs/torso/head/face)
//   poseMix(a, b, k)                  blend two poses (names or patches)
//   poseTrack([[t, name, blendIn, ease], ...], t)   hold/blend through poses over time: no sudden pose changes, optional overshoot ease 'back'
// Combine freely:  darto.pose({...compose(walkPose(ph), lookBehind(k), expr('nervous')), ...}, t)
// Pose keys: la/ra=[forward, out], le/re elbow, ll/rl=[swing, out], lk/rk knee, lean, twist, hipY, head=[yaw,pitch], roll, point, shrug (+ expression keys from 12-expressions.js)
const BODY_GROUPS = {
  arms: ['la', 'le', 'ra', 're', 'point', 'shrug'], legs: ['ll', 'lk', 'rl', 'rk', 'hipY'], torso: ['lean', 'twist'],
  head: ['head', 'roll'], face: ['eyes', 'look', 'mouth', 'brow', 'browL', 'browR', 'byL', 'byR', 'lid', 'cross', 'eyeAsym', 'pupilS', 'glint', 'mw', 'mc', 'my', 'mx', 'mtilt', 'mo', 'blink'] };
const POSE_NEUTRAL = {la: [0.05, 0.1], le: 0.15, ra: [0.05, 0.1], re: 0.15, ll: [0, 0.02], lk: 0, rl: [0, 0.02], rk: 0, head: [0, 0], roll: 0, lean: 0, twist: 0, hipY: 0, point: 0, shrug: 0};
function compose(...ps) { return Object.assign({}, ...ps.filter(Boolean)); }
function only(p, ...groups) { const keep = new Set(groups.flatMap(g => BODY_GROUPS[g])); return Object.fromEntries(Object.entries(p).filter(([k]) => keep.has(k))); }   // e.g. only(poseTrack(...), 'arms') over a walk cycle
function poseAdd(a, b) { const o = {...a}; for (const [k, v] of Object.entries(b)) o[k] = Array.isArray(v) ? v.map((x, i) => x + (a[k] ? a[k][i] : (POSE_NEUTRAL[k] ? POSE_NEUTRAL[k][i] : 0))) : typeof v === 'number' ? v + (a[k] ?? POSE_NEUTRAL[k] ?? 0) : v; return o; }
const POSE = {
  idle:       {},
  point:      {la: [1.45, 0.15], le: 0.05, point: 1, lean: 0.03},
  think:      {ra: [0.55, -0.1], re: 2.3, la: [0.1, 0.1], head: [0, -0.12], roll: 0.1, lean: 0.03},
  shrug:      {la: [0.3, 0.5], le: 1.1, ra: [0.3, 0.5], re: 1.1, shrug: 1, roll: 0.1, head: [0, 0.03]},
  facepalm:   {ra: [0.95, -0.05], re: 2.45, head: [0, -0.18], lean: 0.12, roll: -0.05},
  startled:   {lean: -0.15, la: [0.55, 0.95], le: 0.4, ra: [0.55, 0.95], re: 0.4, head: [0, 0.1], ll: [0.2, 0.15], rl: [-0.1, 0.12], hipY: 0.01, shrug: 0.6},
  cower:      {lean: 0.45, hipY: -0.28, ll: [0.95, 0.12], lk: 1.45, rl: [0.85, 0.12], rk: 1.5, la: [2.3, 0.1], le: 1.8, ra: [2.3, 0.1], re: 1.8, head: [0, -0.2], shrug: 1},
  sitting:    {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.95, 0.12], re: 0.45, la: [0.6, 0.15], le: 1.2, lean: 0.06},       // same values as the project's sit()
  slumped:    {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.3, 0.15], re: 0.2, la: [0.3, 0.15], le: 0.2, lean: 0.28, head: [0, -0.25]},
  armsCrossed:{la: [0.35, -0.1], le: 1.9, ra: [0.2, -0.5], re: 1.9, lean: -0.02},
  handsClasped:{la: [0.5, -0.2], le: 1.5, ra: [0.5, -0.2], re: 1.5},
  handsUp:    {la: [2.5, 0.35], le: 0.5, ra: [2.5, 0.35], re: 0.5, head: [0, 0.08], shrug: 0.4},
  reachForward: {la: [1.45, 0.05], le: 0.1, ra: [1.45, 0.05], re: 0.1, lean: 0.12},      // door handle / object grab start
  holdUp:     {ra: [1.25, 0.05], re: 0.2, lean: 0.02},                                          // torch / phone raised
  crouch:     {hipY: -0.3, ll: [1.0, 0.1], lk: 1.6, rl: [0.9, 0.1], rk: 1.6, lean: 0.35, la: [0.6, 0.15], le: 0.9, ra: [0.6, 0.15], re: 0.9, head: [0, 0.2]},
};
// ---- locomotion (phase ph advances with travelled distance, as walkPose; stride ~0.62 m per half-cycle) ----
function run(ph, amt = 1) { const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.9 * s * amt, 0.03], lk: (Math.max(0, -c) * 1.3 + 0.15) * amt, rl: [-0.9 * s * amt, 0.03], rk: (Math.max(0, c) * 1.3 + 0.15) * amt,
    la: [-0.75 * s * amt, 0.12], ra: [0.75 * s * amt, 0.12], le: 1.2 * amt, re: 1.2 * amt, hipY: -0.05 * Math.abs(Math.cos(ph)) * amt, twist: 0.14 * s * amt, lean: 0.2 * amt}; }
function sneak(ph, amt = 1) { const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.28 * s * amt, 0.03], lk: (Math.max(0, -c) * 0.5 + 0.55) * amt, rl: [-0.28 * s * amt, 0.03], rk: (Math.max(0, c) * 0.5 + 0.55) * amt,
    la: [0.4 * amt, 0.12], ra: [0.4 * amt, 0.12], le: 0.9 * amt, re: 0.9 * amt, hipY: -0.13 * amt, lean: 0.2 * amt, twist: 0.05 * s * amt}; }
// ---- upper-body motions (deterministic in t) ----
function wave(t, amt = 1) { return {ra: [2.5, 0.45 * amt + 0.1], re: 0.5 + 0.45 * Math.sin(t * 10) * amt, head: [0.12 * amt, 0.04], roll: -0.05 * amt}; }
function talk(t, en = 1) { const m = 0.35 + 0.55 * Math.abs(Math.sin(t * 9.3)) * (0.6 + 0.4 * noise1(t * 3));                                   // lip-flap + hand gesture + small nods
  return {mouth: 'open', mo: m, ra: [0.55 + 0.35 * noise1(t * 1.7 + 3) * en, 0.22], re: 0.9 + 0.5 * noise1(t * 2.1) * en, head: [0.05 * Math.sin(t * 1.3), 0.04 * Math.sin(t * 2.3)]}; }
function lookAround(t, t0, rate = 1.1) { const u = (t - t0) * rate; return {head: [0.95 * Math.sin(u * 2), 0.06 * Math.sin(u * 3.1)], twist: 0.18 * Math.sin(u * 2 - 0.4)}; }
function lookBehind(k) { k = ease(k); return {head: [2.0 * k, 0.05 * k], twist: 0.55 * k, lean: 0.03 * k}; }     // k 0..1; turn the head (and shoulders) over the shoulder
function tremble(t, amt = 1) { const n = (f, o) => noise1(t * f + o) - 0.5;                                      // add with poseAdd(): small fear/cold shake, deterministic
  return {head: [0.05 * amt * n(14, 1), 0.04 * amt * n(13, 5)], roll: 0.04 * amt * n(11, 9), lean: 0.02 * amt * n(12, 3), la: [0.06 * amt * n(15, 7), 0.03 * amt * n(10, 2)], ra: [0.06 * amt * n(16, 4), 0.03 * amt * n(9, 6)]}; }
function sitNervous(t, amt = 1) { return poseAdd(POSE.sitting, {rk: 0.12 * amt * Math.max(0, Math.sin(t * 11)), re: 0.1 * amt * Math.sin(t * 2.2), head: [0.2 * Math.sin(t * 0.8) * amt, 0.04]}); }
// ---- blending / sequencing ----
const POSE_EASE = {smooth: ease, linear: clamp, back: k => { k = clamp(k); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }};
function poseBase(x) { const p = typeof x === 'string' ? POSE[x] : x; return Object.assign({}, POSE_NEUTRAL, p); }
function poseMix(a, b, k) { const A = poseBase(a), B = poseBase(b), o = {...A, ...B};
  for (const key of Object.keys(o)) { const x = A[key] ?? POSE_NEUTRAL[key], y = B[key] ?? POSE_NEUTRAL[key];
    if (Array.isArray(x) && Array.isArray(y)) o[key] = x.map((v, i) => lerp(v, y[i], k)); else if (typeof x === 'number' && typeof y === 'number') o[key] = lerp(x, y, k); else o[key] = k < 0.5 ? x : y; }
  if (o.point !== undefined) o.point = o.point > 0.5 ? 1 : 0; return o; }
// track entries: [startTime, nameOrPatch, blendInSeconds = 0.35, easeName = 'smooth']; the pose is held after the blend until the next entry starts
function poseTrack(track, t) { let i = 0; while (i < track.length - 1 && t >= track[i + 1][0]) i++;
  const [t0, cur, bin = 0.35, en = 'smooth'] = track[i]; if (i === 0 || t >= t0 + bin) return poseBase(cur);
  return poseMix(track[i - 1][1], cur, POSE_EASE[en]((t - t0) / bin)); }

// ---------- LOOK (template defaults learned from the ABSEN / RONDA MALAM audit) ----------
// Everything that decides exposure, glow and readability lives here, so a film can tune it in one place.
// The rig file (10-rig.js) stays a verbatim copy of rig v4.1; this part only adjusts shared materials after it.
const LOOK = {
  exposure: 0.82,          // renderer.toneMappingExposure (set in 00-base.js)
  toonTop: 235,            // top band of the toon ramp (v4 = 255): white faces/gloves stop sitting exactly at 1.0 before light
  bloom: {strength: 0.18, radius: 0.4, threshold: 0.97}, // ABSEN used 0.38 / 0.55 / 0.86 -> glowing heads and gloves
  msaa: 8,                 // samples on the composer target; without it renderer antialias is ignored and thin lines shimmer
  screen: 0.85,            // brightness of unlit screens/panels (1.0 = blooms); use glowMat() for light you WANT to bloom
  rim: {color: 0x8fa6c8, intensity: 0.0}, // back/edge light that follows the camera; raise (0.4-0.9) in dark sets so black bodies keep a silhouette
  key: {color: 0xfff4e6, intensity: 0.0}, // soft face light that rides with the camera (up-left of the lens); use ~1-1.5 in close-ups
  ca: 0.6, vignette: 1,    // lookPass chromatic aberration and vignette amounts
  minCamDist: 0.45,        // cam() warns when the lens is closer than this to a visible actor's head (m)
};
renderer.toneMappingExposure = LOOK.exposure;
// soften the toon ramp's top band (shared texture: affects every toon material of the rig)
toonRamp.image.data[8] = toonRamp.image.data[9] = toonRamp.image.data[10] = LOOK.toonTop; toonRamp.needsUpdate = true;

// Unlit display surfaces (phones, monitors, LED clocks, lamp panels). Capped below the bloom threshold by default.
function screenMat(map, level = LOOK.screen, extra = {}) { return new THREE.MeshBasicMaterial({map, color: new THREE.Color(level, level, level), ...extra}); }
function panelMat(color, level = LOOK.screen) { return new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(level)}); }
// Deliberate glow (a bulb, a lit lens): above 1.0 so the bloom pass picks it up. Keep these small on screen.
function glowMat(color, k = 1.6) { return new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k)}); }

// Rim light: a directional light placed behind the subject, opposite the camera. Updated by cam() every frame.
const rimLight = new THREE.DirectionalLight(LOOK.rim.color, 0); scene.add(rimLight, rimLight.target);
function placeRim(camPos, look, intensity = LOOK.rim.intensity) {
  rimLight.intensity = intensity; if (intensity <= 0) return;
  const back = look.clone().sub(camPos).setY(0).normalize();
  rimLight.position.copy(look).addScaledVector(back, 4).add(V(0, 2.5, 0)); rimLight.target.position.copy(look);
}

// Camera key light: close-ups under a single warm/top light put white faces in the toon ramp's middle band (they read brown).
// A weak neutral point light just above-left of the lens lifts the face into the top band without changing the set lighting.
const keyLight = new THREE.PointLight(LOOK.key.color, 0, 4, 2); scene.add(keyLight);
function placeKey(camObj, intensity = LOOK.key.intensity) {
  keyLight.intensity = intensity; if (intensity <= 0) return;
  keyLight.position.copy(camObj.position).add(V(-0.35, 0.3, 0.1).applyQuaternion(camObj.quaternion));
}

// ---------- FX: torch, atmospheric dust, body-aware walking ----------

// --- TORCH (flashlight held in a glove) ---
// Faces clipped in ABSEN because the torch kept full power at 0.3-0.8 m. set(k, subjectDist) scales the power so a
// subject at that distance receives the same light as one at `refDist`, which keeps close-ups exposed like wide shots.
const coneMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: {uInt: {value: 0.12}, uColor: {value: new THREE.Color(0xfff1d0)}},
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform float uInt; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float along = clamp((vY+1.5)/3.0,0.0,1.0); float edge = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(uColor*uInt*pow(along,2.2)*edge, 1.0); }'});
function makeTorch({power = 5, decay = 1.5, refDist = 1.5, angle = 0.45, beam = 0.12} = {}) {
  const g = new THREE.Group();
  const body = inked(new THREE.CylinderGeometry(0.022, 0.018, 0.17, 12), new THREE.MeshToonMaterial({color: 0x2d2d2d, gradientMap: toonRamp}), 0.006, g); body.position.y = -0.06;
  const lensM = new THREE.MeshBasicMaterial({color: 0xfff6dc}); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), lensM); lens.rotation.x = Math.PI / 2; lens.position.y = -0.146; g.add(lens);
  const spot = new THREE.SpotLight(0xfff0d0, 0, 14, angle, 0.6, decay); spot.position.y = -0.15; spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.normalBias = 0.03; g.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.y = -3; g.add(tgt); spot.target = tgt;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(angle) * 3, 3.0, 28, 1, true), coneMat); cone.position.y = -0.15 - 1.5; g.add(cone);
  return {g, spot, cone, lens, on: 0,
    set(k = 1, subjectDist = null) { this.on = k; const comp = subjectDist == null ? 1 : Math.min(1, Math.pow(Math.max(subjectDist, 0.05) / refDist, decay));
      spot.intensity = power * k * comp; coneMat.uniforms.uInt.value = beam * k; cone.visible = k > 0.01;
      lensM.color.setScalar(LOOK.screen * (0.25 + 0.75 * k)); }};
}

// --- DUST v2 (atmospheric, not glitter) ---
// ABSEN dust read as snow: 700 identical additive points, unlit, ~90 px wide at 0.5 m, popping at the wrap.
// Here: varied (mostly tiny) sizes with a pixel cap, normal blending at low opacity, fade near the lens and far away,
// soft fade at the wrap, and brightness that comes from the torch beam (plus a small ambient floor).
const DUST = {count: 900, box: V(5, 3, 6), worldSize: 0.012, maxPx: 6, opacity: 0.5, ambient: 0.12, near: 1.0, far: 7};
const dustGeo = new THREE.BufferGeometry();
{ const n = DUST.count, pos = new Float32Array(n * 3), seed = new Float32Array(n), size = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = hash(i * 1.3) * DUST.box.x; pos[i * 3 + 1] = hash(i * 2.7) * DUST.box.y; pos[i * 3 + 2] = hash(i * 4.1) * DUST.box.z;
    seed[i] = hash(i * 9.7); size[i] = 0.4 + 1.2 * Math.pow(hash(i * 5.3), 2.5); } // skewed: most motes small, a few larger
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); dustGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); }
const dustMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false,
  uniforms: {uTime: {value: 0}, uCenter: {value: V(0, 0, 0)}, uBox: {value: DUST.box}, uPx: {value: 1}, uMaxPx: {value: DUST.maxPx}, uOpacity: {value: DUST.opacity},
    uColor: {value: new THREE.Color(0xd8d0c0)}, uAmb: {value: DUST.ambient}, uNear: {value: DUST.near}, uFar: {value: DUST.far},
    uBeamPos: {value: V(0, 0, 0)}, uBeamDir: {value: V(0, -1, 0)}, uBeamCos: {value: 0.9}, uBeamOn: {value: 0}},
  vertexShader: `attribute float aSeed; attribute float aSize;
    uniform float uTime, uPx, uMaxPx, uAmb, uNear, uFar, uBeamCos, uBeamOn; uniform vec3 uCenter, uBox, uBeamPos, uBeamDir; varying float vA;
    void main(){ vec3 p = position;
      p.x += sin(uTime*0.21 + aSeed*6.283)*0.12; p.z += cos(uTime*0.17 + aSeed*10.7)*0.12;
      float fy = fract((p.y + uTime*0.025*(0.3 + aSeed)) / uBox.y); p.y = fy * uBox.y;
      float wrap = smoothstep(0.0, 0.08, fy) * (1.0 - smoothstep(0.92, 1.0, fy));
      vec3 w = uCenter + p - vec3(uBox.x*0.5, 0.0, uBox.z*0.5);
      vec4 mv = viewMatrix * vec4(w, 1.0); float d = -mv.z;
      float px = min(uPx * aSize / max(d, 0.05), uMaxPx); gl_PointSize = max(px, 1.5);
      vec3 L = w - uBeamPos; float lb = max(length(L), 0.01);
      float beam = uBeamOn * smoothstep(uBeamCos, mix(uBeamCos, 1.0, 0.4), dot(L / lb, uBeamDir)) / (1.0 + lb*lb*0.2);
      vA = (uAmb + beam) * smoothstep(uNear*0.5, uNear, d) * (1.0 - smoothstep(uFar*0.6, uFar, d)) * wrap * clamp(px / 1.5, 0.0, 1.0);
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
    void main(){ vec2 c = gl_PointCoord - 0.5; float a = 1.0 - dot(c, c) * 4.0; if (a <= 0.0) discard; gl_FragColor = vec4(uColor, a * a * vA * uOpacity); }`});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
let _dustBeam = null;
// call from a shot: placeDust(center, t, amount, torchOrNull). The beam is read after matrices update (see syncFx in 50-main).
function placeDust(center, t, amt = 1, beamTorch = null) { dust.visible = amt > 0; dustMat.uniforms.uCenter.value.copy(center); dustMat.uniforms.uTime.value = t;
  dustMat.uniforms.uOpacity.value = DUST.opacity * amt; _dustBeam = beamTorch; }
function syncFx() {
  dustMat.uniforms.uPx.value = DUST.worldSize * H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const b = _dustBeam; dustMat.uniforms.uBeamOn.value = b && b.on > 0 ? 3 * b.on : 0;
  if (b && b.on > 0) { const p = b.spot.getWorldPosition(V(0, 0, 0)), q = b.spot.target.getWorldPosition(V(0, 0, 0));
    dustMat.uniforms.uBeamPos.value.copy(p); dustMat.uniforms.uBeamDir.value.copy(q.sub(p).normalize()); dustMat.uniforms.uBeamCos.value = Math.cos(b.spot.angle); }
}

// --- body-aware walk (stride from the actor's leg length, eased start/stop, smoothed facing) ---
// Pose cycle is still walkPose from the rig; only the phase/stride and timing adapt to the body.
function walkToBody(actor, t, t0, t1, p0, p1, amt = 1, ramp = 0.12) {
  const k = clamp((t - t0) / (t1 - t0)); const d = p0.distanceTo(p1);
  // ease in/out on distance so the actor accelerates and settles instead of starting at full speed
  const e = k < ramp ? (k * k) / (2 * ramp * (1 - ramp)) : k > 1 - ramp ? 1 - ((1 - k) * (1 - k)) / (2 * ramp * (1 - ramp)) : (k - ramp / 2) / (1 - ramp);
  const p = p0.clone().lerp(p1, e); actor.root.position.copy(p); actor.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  const strength = amt * ease(k / ramp) * ease((1 - k) / ramp);
  return k > 0 && k < 1 ? walkPose(e * d / actor.metrics.strideHint * Math.PI, strength) : {};
}

// ---------- DEMO SET: a small dark room (replace with the film's own sets) ----------
// Conventions: one THREE.Group per set, hidden by reset(), shown by the shots that use it. Matte surfaces (roughness 1)
// avoid the specular hotspots ABSEN got from a glossy floor under a strong spot.
const ROOM = new THREE.Group(); scene.add(ROOM);
{ const floorTex = concreteTex('#5f6162', 512, 512, 3); floorTex.repeat.set(3, 4);
  const wallTex = concreteTex('#6e706f', 512, 512, 7); wallTex.repeat.set(3, 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({map: floorTex, roughness: 1})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; ROOM.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, color: 0x8a8a8a})); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3; ROOM.add(ceil);
  const wm = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1});
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), wm); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 3, 1.5, 0); w.receiveShadow = true; ROOM.add(w); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wm); back.position.set(0, 1.5, -4); back.receiveShadow = true; ROOM.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wm); front.rotation.y = Math.PI; front.position.set(0, 1.5, 4); ROOM.add(front); }
// door on the back wall
const roomDoor = box(0.95, 2.05, 0.06, std(0x4f585c, {r: 0.8}), 0.9, 1.025, -3.97, ROOM);
box(0.08, 0.04, 0.04, steel, 0.5, 1.0, -3.93, ROOM, false);
// table + chair
const tableMat = new THREE.MeshToonMaterial({color: 0x5a4636, gradientMap: toonRamp});
box(1.2, 0.05, 0.7, tableMat, -1.1, 0.76, -2.4, ROOM); for (const [x, z] of [[-1.65, -2.7], [-0.55, -2.7], [-1.65, -2.1], [-0.55, -2.1]]) box(0.05, 0.74, 0.05, black, x, 0.37, z, ROOM, false);
// chair faces +z (toward the usual camera side); seat centre (-1.1, -0.88)
const SEAT_TOP = 0.485, SEAT_AT = V(-1.1, 0, -0.88); // SEAT_TOP feeds actor.metrics.sitHipY(SEAT_TOP)
box(0.46, 0.05, 0.44, tableMat, -1.1, 0.46, -0.88, ROOM); box(0.46, 0.5, 0.05, tableMat, -1.1, 0.72, -1.12, ROOM);
for (const [x, z] of [[-1.3, -0.7], [-0.9, -0.7], [-1.3, -1.08], [-0.9, -1.08]]) box(0.03, 0.44, 0.03, black, x, 0.22, z, ROOM, false);
// wall clock: an unlit screen, capped below the bloom threshold by screenMat()
const clockTex = canvasTex(256, 96, () => {});
function drawClock(s) { const {g, c} = clockTex.userData; if (clockTex.userData.s === s) return; clockTex.userData.s = s;
  g.fillStyle = '#080404'; g.fillRect(0, 0, c.width, c.height); g.font = 'bold 80px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff3020'; g.shadowBlur = 14; g.fillStyle = '#ff4433'; g.fillText(s, c.width / 2, c.height / 2 + 4); g.shadowBlur = 0; clockTex.needsUpdate = true; }
const wallClock = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), screenMat(clockTex)); wallClock.position.set(-2.98, 2.2, -1.6); wallClock.rotation.y = Math.PI / 2; ROOM.add(wallClock);
// ceiling lamp: small deliberate glow (bulb) + a warm point light with physical falloff
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glowMat(0xffe9c0, 1.4)); bulb.position.set(0, 2.55, -1); ROOM.add(bulb);
box(0.01, 0.45, 0.01, black, 0, 2.8, -1, ROOM, false);
const lamp = new THREE.PointLight(0xffd9a8, 6, 9, 2); lamp.position.set(0, 2.45, -1); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; lamp.shadow.normalBias = 0.02; ROOM.add(lamp);
// cool window light from the right wall + a weak sky fill
const moon = new THREE.SpotLight(0x9fb4d8, 20, 14, 0.5, 0.7, 1.5); moon.position.set(2.8, 2.6, 1.0); moon.target.position.set(-0.5, 0, -1.5); ROOM.add(moon, moon.target);
const roomFill = new THREE.HemisphereLight(0x3c4a5e, 0x101010, 0.5); ROOM.add(roomFill);

// ---------- CAST ----------
// Identity (kit flags, colours) and body (bodySpec) are chosen independently. Bodies are combinable presets + overrides:
//   bodySpec('tall', 'slim', {headR: 0.12})   later entries win; put {height: ...} last if a fixed height matters.
// Every actor exposes .metrics (hipY, eyeY, reach, strideHint, sitHipY(seatTop) ...) for staging and framing.
const tokohA = makeStick({tie: false, card: false, cap: true, badge: true, belt: true}); scene.add(tokohA.root); tokohA.setBlinkSeed(1.3);
const tokohB = makeStick({tie: true, card: true, body: bodySpec('tall', 'slim', 'smallHead')}); scene.add(tokohB.root); tokohB.setBlinkSeed(2.1);
const cast = [tokohA, tokohB];
const torchA = makeTorch(); torchA.g.position.set(0, -0.05, 0.03); tokohA.R.glove.add(torchA.g);

// ---------- SHOTS ----------
// Rules that keep renders deterministic and seekable (checked by the preflight script):
//   * reset() puts EVERY mutable thing back to a neutral state; renderAt() calls it before each shot.
//   * a shot's f(t) sets everything it needs from t alone (no state carried over from the previous frame).
//   * shots are contiguous: each t0 equals the previous t1.
let fx = {cctv: 0, ca: LOOK.ca, vig: LOOK.vignette, rim: LOOK.rim.intensity, key: LOOK.key.intensity};
function reset() {
  ROOM.visible = false; cast.forEach(a => { a.root.visible = false; a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, 0); a.pose({}, 0); });
  torchA.set(0); dust.visible = false; _dustBeam = null; drawClock('00:59'); roomDoor.rotation.y = 0;
  lamp.intensity = 6; moon.intensity = 20; roomFill.intensity = 0.5;
  fx = {cctv: 0, ca: LOOK.ca, vig: LOOK.vignette, rim: LOOK.rim.intensity, key: LOOK.key.intensity}; cctvEl.style.display = 'none'; endEl.style.opacity = 0; fadeEl.style.opacity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); scene.fog.density = 0.045;
}
function roomBase() { ROOM.visible = true; scene.fog.density = 0.03; }
const B_AT = V(0.5, 0, -2.6); // tokoh B stands under the ceiling lamp (key light for the close-up)
const SIT_A = () => ({...POSE.sitting, hipY: tokohA.metrics.sitHipY(SEAT_TOP)}); // seat height from the body, not a magic number

const shots = [
  {name: 'wide-room', t0: 0, t1: 3.2, f(t) { roomBase(); fx.rim = 0.5;
    tokohA.root.visible = tokohB.root.visible = true;
    tokohA.root.position.copy(SEAT_AT); tokohA.pose({...SIT_A(), ra: [0.95, 0.12], re: 0.45, head: [0.3, 0.05], eyes: 1.1}, t); torchA.set(1, 2.5);
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = -0.25; tokohB.pose({...POSE.handsClasped, head: [-0.3, 0.1], ...expr('creepy', 0.6)}, t);
    placeDust(V(-0.5, 0, -1.5), t, 1, torchA);
    const k = seg(t, 0, 3.2); cam(V(-0.5, 1.65, 2.8).lerp(V(-0.45, 1.6, 2.3), k), V(-0.55, 1.0, -1.8), 50, 0.003, t); }},
  {name: 'stand-walk', t0: 3.2, t1: 6.4, f(t) { roomBase(); fx.rim = 0.5; tokohA.root.visible = true;
    const p0 = SEAT_AT.clone(), p1 = V(0.9, 0, 0.3);
    const pw = walkToBody(tokohA, t, 3.6, 6.2, p0, p1);
    if (t < 3.6) { tokohA.root.position.copy(p0); tokohA.root.rotation.y = 0; }
    tokohA.pose(compose(t < 3.6 ? poseMix(SIT_A(), 'idle', seg(t, 3.2, 3.6)) : pw, {ra: [1.25, 0.05], re: 0.2}, expr('nervous', 0.8)), t);
    const c = tokohA.root.position; torchA.set(1, 2.0); placeDust(c, t, 1, torchA);
    cam(V(c.x + 1.1, 1.45, c.z + 2.2), V(c.x, 1.05, c.z - 0.3), 48, 0.003, t); }},
  {name: 'close-b', t0: 6.4, t1: 9.0, f(t) { roomBase(); fx.rim = 0.7; fx.key = 1.3; tokohB.root.visible = true;
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = 0.15;
    tokohB.pose({...acting([[6.4, 'deadpan', 1], [7.6, 'unnaturalSmile', 1]], t), head: [0, 0.04]}, t);
    const e = tokohB.root.position.clone().add(V(0, tokohB.metrics.eyeY, 0)); // frame on the body's real eye height
    cam(e.clone().add(V(0.15, 0.02, 0.95)), e.clone().add(V(0, -0.04, 0)), 34, 0.0015, t); }},
  {name: 'cctv', t0: 9.0, t1: 11.0, f(t) { roomBase(); fx.cctv = 1; drawClock('01:00');
    tokohA.root.visible = tokohB.root.visible = true;
    tokohA.root.position.set(0.9, 0, 0.3); tokohA.root.rotation.y = Math.PI * 0.92; tokohA.pose({head: [0.1, 0], eyes: 1.4}, t);
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = -0.3; tokohB.pose({head: [-0.5, 0]}, t);
    cctvText('21-11-2026  01:00:0' + Math.floor((t - 9) * 4)); cam(V(-2.6, 2.75, 3.5), V(0.3, 0.8, -2.4), 58); }},
  {name: 'end', t0: 11.0, t1: 14.0, f(t) { fadeEl.style.opacity = 1; endEl.style.opacity = seg(t, 11.3, 11.9) * (1 - seg(t, 13.3, 13.9)); cam(V(0, 0, 0), V(0, 0, -1), 40); }},
];

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
