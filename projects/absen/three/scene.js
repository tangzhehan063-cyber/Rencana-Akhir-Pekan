import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// LANTAI 4 — Three.js liminal-horror stickman renderer.
// Deterministic: window.renderAt(t) draws the frame for absolute video time t (seconds).

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
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

// ---------- TEXTURES ----------
function ledTex() {
  return canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#120404'; g.fillRect(0, 0, w, h); });
}
function drawLed(tex, text, color = '#ff3326', glow = 1) {
  const {g, c} = tex.userData; g.fillStyle = '#110303'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 8; g.strokeRect(4, 4, c.width - 8, c.height - 8);
  g.font = 'bold 96px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26 * glow; g.fillStyle = color; g.fillText(text, c.width / 2, c.height / 2 + 4); g.shadowBlur = 0;
  tex.needsUpdate = true; tex.userData.text = text;
}
const tapeTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#d9cfae'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,40,${hash(i) * 0.08})`; g.fillRect(hash(i * 3) * w, hash(i * 5) * h, 3, 3); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  g.save(); g.translate(w / 2, h / 2 + 6); g.rotate(-0.06);
  g.font = '700 120px Caveat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#16161a'; g.fillText('BELUM JADI', 0, 0); g.restore();
});
const btnTex = {};
for (const k of ['5', '4', '3', '2', '1', 'G']) {
  btnTex[k] = [false, true].map(lit => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = lit ? '#ffcf73' : '#b9bec4'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = '#555b62'; g.lineWidth = 6; g.stroke();
    g.font = 'bold 70px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = lit ? '#5a2c00' : '#2b2f33'; g.fillText(k, 64, 70);
  }));
}
const clockTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#e9e5da'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#222'; g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); g.stroke(); }
  const hand = (a, len, wd) => { g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
  hand((11 + 47 / 60) / 12 * Math.PI * 2, 58, 10); hand(47 / 60 * Math.PI * 2, 88, 6);
  g.fillStyle = '#b22'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill();
});
const deskClockTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#060a08'; g.fillRect(0, 0, w, h); g.font = 'bold 72px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#5cf0a0'; g.shadowBlur = 14; g.fillStyle = '#7dffb9'; g.fillText('23:47', w / 2, h / 2 + 3); });
const cityTex = canvasTex(1024, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1424'); gr.addColorStop(1, '#1a2438'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let b = 0; b < 26; b++) { const bx = hash(b) * w, bw = 40 + hash(b + 9) * 90, bh = 120 + hash(b + 3) * 330; g.fillStyle = `rgb(${12 + b % 3 * 4},${18 + b % 4 * 3},${30 + b % 5 * 3})`; g.fillRect(bx, h - bh, bw, bh);
    for (let y = h - bh + 10; y < h - 8; y += 16) for (let x = bx + 6; x < bx + bw - 8; x += 13) if (hash(x * 0.3 + y * 7 + b) > 0.82) { g.fillStyle = hash(x + y) > .5 ? '#f5d58a' : '#9fc4ff'; g.fillRect(x, y, 6, 8); } }
});
const monitorTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#cfe2ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#3d6aa8'; g.fillRect(0, 0, w, 18);
  for (let i = 0; i < 8; i++) { g.fillStyle = '#7f9bc4'; g.fillRect(16, 34 + i * 14, 80 + hash(i) * 140, 6); } });

// ---------- SET: FLOOR 4 (corridor z 0..22, lift wall at z=0) ----------
const F4 = new THREE.Group(); scene.add(F4);
const floorTex = concreteTex('#6b6d6e', 512, 512, 2); floorTex.repeat.set(4, 10);
const wallTex = concreteTex('#7a7c7c', 512, 512, 5); wallTex.repeat.set(6, 1.5);
const floor4 = new THREE.Mesh(new THREE.PlaneGeometry(9, 26), new THREE.MeshStandardMaterial({map: floorTex, roughness: 1})); floor4.rotation.x = -Math.PI / 2; floor4.position.set(0, 0, 11); floor4.receiveShadow = true; F4.add(floor4);
const ceil4 = new THREE.Mesh(new THREE.PlaneGeometry(9, 26), new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, color: 0x9a9a9a})); ceil4.rotation.x = Math.PI / 2; ceil4.position.set(0, 3.2, 11); F4.add(ceil4);
for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshStandardMaterial({map: wallTex, roughness: 1})); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 4.5, 1.6, 11); w.receiveShadow = true; F4.add(w); }
const endWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshStandardMaterial({map: wallTex, roughness: 1})); endWall.rotation.y = Math.PI; endWall.position.set(0, 1.6, 24); F4.add(endWall);
// lift wall with opening x -0.6..0.6, y 0..2.2
const lw = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1});
box(3.9, 3.2, 0.25, lw, -2.55, 1.6, -0.12, F4); box(3.9, 3.2, 0.25, lw, 2.55, 1.6, -0.12, F4); box(1.2, 1.0, 0.25, lw, 0, 2.76, -0.12, F4);
box(0.1, 2.25, 0.3, steelDark, -0.65, 1.12, -0.1, F4); box(0.1, 2.25, 0.3, steelDark, 0.65, 1.12, -0.1, F4); box(1.4, 0.1, 0.3, steelDark, 0, 2.25, -0.1, F4);
const outLedTex = ledTex(); drawLed(outLedTex, '4');
const outLed = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({map: outLedTex})); outLed.position.set(0, 2.47, 0.02); F4.add(outLed);
const outLedLight = new THREE.PointLight(0xff2a1a, 0.6, 3.5, 2); outLedLight.position.set(0, 2.4, 0.25); F4.add(outLedLight);
// columns
const colMat = new THREE.MeshStandardMaterial({map: concreteTex('#727474', 256, 512, 8), roughness: 1});
for (let z = 3.5; z < 23; z += 4.2) for (const x of [-2.7, 2.7]) box(0.45, 3.2, 0.45, colMat, x, 1.6, z, F4);
// beams
for (let z = 3.5; z < 23; z += 4.2) box(9, 0.35, 0.4, colMat, 0, 3.02, z, F4, false);
// cables
const cableMat = new THREE.MeshStandardMaterial({color: 0x101010, roughness: 0.6});
for (let i = 0; i < 16; i++) { const pts = [], x0 = -3.5 + hash(i * 7) * 7, z0 = 1 + i * 1.4, dx = (hash(i * 3) - .5) * 2, dz = (hash(i * 5) - .5) * 1.5, sag = 0.35 + hash(i * 11) * 0.8;
  for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(V(x0 + dx * t, 3.15 - Math.sin(t * Math.PI) * sag, z0 + dz * t)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.02, 6), cableMat); m.castShadow = true; F4.add(m); }
// a dangling cable end + hanging bulb (dead)
{ const pts = [V(-1.4, 3.15, 6.2), V(-1.35, 2.6, 6.25), V(-1.38, 2.2, 6.2)]; F4.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.012, 5), cableMat));
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), std(0x9a9a8a, {r: 0.3})); b.position.set(-1.38, 2.15, 6.2); F4.add(b); }
// cement bags / bucket / trowel / bricks
const bagMat = std(0xb8ad94); for (let i = 0; i < 6; i++) { const b = box(0.55, 0.16, 0.38, bagMat, -3.6 + (i % 2) * 0.58, 0.08 + Math.floor(i / 2) * 0.16, 2.6, F4); b.rotation.y = (hash(i) - .5) * 0.2; }
const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 18, 1, true), std(0x2a5e8c, {r: 0.6})); bucket.position.set(2.9, 0.16, 2.2); bucket.castShadow = true; F4.add(bucket);
const brickMat = std(0x9c4f36); for (let i = 0; i < 18; i++) box(0.22, 0.07, 0.1, brickMat, 3.1 + (i % 3) * 0.24, 0.035 + Math.floor(i / 6) * 0.075, 5.2 + (Math.floor(i / 3) % 2) * 0.11, F4);
// plastic sheets at z = 12
const plastics = [];
const plTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9eef0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * w; g.fillStyle = `rgba(${hash(i) > .5 ? 255 : 120},${hash(i) > .5 ? 255 : 130},${hash(i) > .5 ? 255 : 140},${0.12 + hash(i * 7) * 0.2})`; g.fillRect(x, 0, 2 + hash(i * 5) * 9, h); }
  for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(90,80,70,${hash(i * 11) * 0.12})`; g.beginPath(); g.ellipse(hash(i * 13) * w, hash(i * 17) * h, 10 + hash(i) * 30, 6 + hash(i * 2) * 20, 0, 0, 7); g.fill(); } });
const plMat = new THREE.MeshStandardMaterial({map: plTex, color: 0xf2f6f8, emissive: 0x4a5258, transparent: true, opacity: 0.72, side: THREE.DoubleSide, roughness: 0.45, depthWrite: false});
for (const [x, w] of [[-1.55, 2.6], [1.3, 2.4]]) { const g = new THREE.PlaneGeometry(w, 2.95, 24, 24); const m = new THREE.Mesh(g, plMat); m.position.set(x, 1.6, 12); F4.add(m);
  plastics.push({m, base: Float32Array.from(g.attributes.position.array), x}); }
box(9, 0.06, 0.06, steelDark, 0, 3.08, 12, F4, false);
function swayPlastic(t, amt) {
  for (const p of plastics) { const a = p.m.geometry.attributes.position; for (let i = 0; i < a.count; i++) {
    const x = p.base[i * 3], y = p.base[i * 3 + 1], k = (1.48 - y) / 2.95; // 0 at top -> 1 at bottom
    a.setZ(i, (Math.sin(t * 1.3 + x * 2.1 + p.x) * 0.16 + Math.sin(t * 2.3 + x * 4.3 + y) * 0.05) * k * k * amt + 0.04 * Math.sin(x * 5 + p.x) * k); }
    a.needsUpdate = true; p.m.geometry.computeVertexNormals(); }
}
// work light behind the plastic
const lampStand = new THREE.Group(); lampStand.position.set(1.0, 0, 18.5); F4.add(lampStand);
box(0.04, 1.8, 0.04, black, 0, 0.9, 0, lampStand); const lampHead = box(0.28, 0.2, 0.16, std(0xe0b030, {r: 0.4}), 0, 1.85, -0.06, lampStand);
const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({color: 0xfff1c8})); lampGlow.position.set(0, 1.85, -0.145); lampGlow.rotation.y = Math.PI; lampStand.add(lampGlow);
const workLight = new THREE.SpotLight(0xffc98a, 300, 34, 0.8, 0.5, 1.3); workLight.position.set(1.0, 1.85, 18.3); workLight.target.position.set(-0.2, 0.6, 0); workLight.castShadow = true; workLight.shadow.mapSize.set(2048, 2048); workLight.shadow.bias = -0.0008; workLight.shadow.normalBias = 0.03; F4.add(workLight, workLight.target);
const coldFill = new THREE.PointLight(0x8aa4c8, 4, 16, 1.4); coldFill.position.set(-0.5, 2.8, 7); F4.add(coldFill);
const workFill = new THREE.PointLight(0xffb070, 14, 9, 1.6); workFill.position.set(1.0, 2.2, 17.8); F4.add(workFill);
const ambient = new THREE.HemisphereLight(0x46566c, 0x141414, 0.7); scene.add(ambient);

// ---------- SET: LIFT CABIN (x -0.8..0.8, z -1.6..0) ----------
const CAB = new THREE.Group(); scene.add(CAB);
const cabWall = std(0xa7a28f, {r: 0.6, m: 0.2});
box(1.62, 0.04, 1.62, std(0x3b3530, {r: 0.9}), 0, 0.0, -0.8, CAB, false);
box(1.62, 0.04, 1.62, std(0xc8c4b8, {r: 0.8}), 0, 2.32, -0.8, CAB, false);
box(0.04, 2.32, 1.62, cabWall, -0.82, 1.16, -0.8, CAB, false); box(0.04, 2.32, 1.62, cabWall, 0.82, 1.16, -0.8, CAB, false); box(1.62, 2.32, 0.04, cabWall, 0, 1.16, -1.62, CAB, false);
box(1.62, 0.06, 0.06, steel, 0, 0.95, -1.57, CAB, false); // handrail
box(1.6, 0.1, 0.2, steelDark, 0, 2.27, -0.36, CAB, false); // header inside
const cabLightPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({color: 0xfff3d6})); cabLightPanel.rotation.x = Math.PI / 2; cabLightPanel.position.set(0, 2.295, -0.8); CAB.add(cabLightPanel);
const cabLight = new THREE.PointLight(0xffefcf, 5.5, 4.5, 1.6); cabLight.position.set(0, 2.1, -0.8); cabLight.castShadow = true; cabLight.shadow.mapSize.set(1024, 1024); cabLight.shadow.bias = -0.002; cabLight.shadow.normalBias = 0.02; CAB.add(cabLight);
const cabSpill = new THREE.SpotLight(0xffe2b0, 45, 22, 0.62, 0.7, 1.4); cabSpill.position.set(0, 2.0, -1.3); cabSpill.target.position.set(0, 0, 4); cabSpill.castShadow = true; cabSpill.shadow.mapSize.set(2048, 2048); cabSpill.shadow.bias = -0.001; cabSpill.shadow.normalBias = 0.03; CAB.add(cabSpill, cabSpill.target);
// doors (two panels sliding)
const doorMat = std(0xa9b0b6, {r: 0.35, m: 0.7});
const doorL = box(0.6, 2.2, 0.04, doorMat, -0.3, 1.1, 0.0, CAB, true), doorR = box(0.6, 2.2, 0.04, doorMat, 0.3, 1.1, 0.0, CAB, true);
for (const d of [doorL, doorR]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 2.2, 0.045), black); seam.position.x = d === doorL ? 0.296 : -0.296; d.add(seam); }
// inside LED display above door (faces -z)
const inLedTex = ledTex(); drawLed(inLedTex, '5');
const inLed = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({map: inLedTex})); inLed.position.set(0, 2.13, -0.26); inLed.rotation.y = Math.PI; CAB.add(inLed);
const redLight = new THREE.PointLight(0xff2010, 0, 3.0, 1.8); redLight.position.set(0, 2.0, -0.4); CAB.add(redLight);
// button panel on +x wall
const panel = new THREE.Group(); panel.position.set(0.795, 1.2, -0.32); panel.rotation.y = -Math.PI / 2; CAB.add(panel);
box(0.2, 0.62, 0.015, std(0x7d8389, {r: 0.3, m: 0.7}), 0, 0, 0, panel, false);
const btn = {};
['5', '4', '3', '2', '1', 'G'].forEach((k, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), [std(0x777777), new THREE.MeshStandardMaterial({map: btnTex[k][0], roughness: 0.5}), std(0x777777)]);
  m.rotation.x = Math.PI / 2; m.rotation.y = Math.PI / 2; m.position.set(0, 0.24 - i * 0.095, 0.012); panel.add(m); btn[k] = m; });
const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.07), new THREE.MeshStandardMaterial({map: tapeTex, roughness: 0.9})); tape.position.set(0, 0.145, 0.0205); tape.rotation.z = 0.08; panel.add(tape);
const tapeGlow = new THREE.PointLight(0xff1a0a, 0, 0.25, 2); tapeGlow.position.set(0, 0.145, 0.06); panel.add(tapeGlow);
const tapeGlowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshBasicMaterial({map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 10, 64, 64, 64); r.addColorStop(0, 'rgba(255,40,16,1)'); r.addColorStop(0.55, 'rgba(255,30,10,.55)'); r.addColorStop(1, 'rgba(255,20,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false})); tapeGlowPlane.position.set(0, 0.145, 0.019); panel.add(tapeGlowPlane);
function setBtn(k, lit) { btn[k].material[1].map = btnTex[k][lit ? 1 : 0]; btn[k].material[1].emissive = new THREE.Color(lit ? 0x7a4a00 : 0); }


function shake(t, amp, freq = 18) { return V((noise1(t * freq) - .5) * amp, (noise1(t * freq + 40) - .5) * amp, 0); }

// ---------- STAIRWELL (x = -40). One storey = 3.2 m; geometry repeats so every landing is "4". ----------
const STW = new THREE.Group(); STW.position.set(-40, 0, 0); scene.add(STW);
const stairConc = new THREE.MeshStandardMaterial({map: concreteTex('#7d7f80', 256, 256, 11), roughness: 1});
const stairWall = new THREE.MeshStandardMaterial({map: concreteTex('#8c8e8a', 512, 512, 13), roughness: 1, color: 0xb9bdb0});
const railMat = std(0x2f5d3a, {r: 0.6, m: 0.3});
const sign4Tex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '230px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b3241b'; g.fillText('4', w / 2, h / 2 + 10); });
const exitTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#0f6b3a'; g.fillRect(0, 0, w, h); g.font = 'bold 40px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8ffe8'; g.fillText('TANGGA DARURAT', w / 2, h / 2 + 2); });
const stairLights = [];
for (const oy of [3.2, 0, -3.2, -6.4]) {
  const G = new THREE.Group(); G.position.y = oy; STW.add(G);
  // landing A (door level) z 0..1.6, full width x 0..2.6
  box(2.6, 0.2, 1.6, stairConc, 1.3, -0.1, 0.8, G);
  // flight A: x 0..1.2 descending toward -z
  for (let i = 0; i < 10; i++) { const top = -0.16 * (i + 1), hgt = 1.7 + top; box(1.2, hgt, 0.28, stairConc, 0.6, top - hgt / 2, -0.14 - 0.28 * i, G); }
  // landing B z -2.8..-4.4 at y -1.6
  box(2.6, 0.2, 1.6, stairConc, 1.3, -1.7, -3.6, G);
  // flight C: x 1.4..2.6 descending toward +z from -1.6 to -3.2
  for (let i = 0; i < 10; i++) { const top = -1.6 - 0.16 * (i + 1), hgt = 1.7 + (top + 1.6); box(1.2, hgt, 0.28, stairConc, 2.0, top - hgt / 2 + 0.0, -2.66 + 0.28 * i, G); }
  // walls
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.2), stairWall); wl.rotation.y = Math.PI / 2; wl.position.set(-0.01, -0.0 + 1.6 - 1.6, -1.4); wl.receiveShadow = true; G.add(wl);
  const wr = wl.clone(); wr.rotation.y = -Math.PI / 2; wr.position.x = 2.61; G.add(wr);
  const wb = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 3.2), stairWall); wb.position.set(1.3, 0, -4.41); G.add(wb);
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 3.2), stairWall); wf.rotation.y = Math.PI; wf.position.set(1.3, 1.6, 1.61); G.add(wf);
  // door on landing A front wall (z = 1.6), facing -z
  const door = box(0.95, 2.05, 0.06, std(0x5f6b70, {r: 0.5, m: 0.4}), 0.7, 1.02, 1.57, G);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.4), std(0x1b2228, {r: 0.2})); win.position.set(0.0, 0.35, -0.035); win.rotation.y = Math.PI; door.add(win);
  const bar = box(0.7, 0.05, 0.06, steel, 0.7, 1.0, 1.5, G, false);
  const s4 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({map: sign4Tex, transparent: true, roughness: 0.9})); s4.position.set(1.75, 1.3, 1.6); s4.rotation.y = Math.PI; G.add(s4);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({map: exitTex})); ex.position.set(0.7, 2.25, 1.58); ex.rotation.y = Math.PI; G.add(ex);
  // railing between flights
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.3, 8), railMat); rail.rotation.x = Math.atan2(1.6, 2.8) + Math.PI / 2; rail.position.set(1.3, -0.8 + 0.9, -1.4); G.add(rail);
  for (let k = 0; k < 6; k++) { const p = box(0.03, 0.9, 0.03, railMat, 1.3, -0.16 * (k * 2) - 0.45 + 0.9 - 0.45, -0.28 * k * 2 - 0.1, G, false); }
  // caged bulb
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({color: 0xf2f7d8})); bulb.position.set(1.3, 2.6, 0.9); G.add(bulb);
  const L = new THREE.PointLight(0xe9f2c8, 9, 7, 1.5); L.position.set(1.3, 2.45, 0.6); G.add(L); stairLights.push(L);
  const L2 = new THREE.PointLight(0xe9f2c8, 5, 6, 1.5); L2.position.set(1.3, 1.0, -3.4); G.add(L2); stairLights.push(L2);
}
// F4: stair door on the left wall at z 6.5 (opens into corridor)
const f4StairDoor = box(0.06, 2.05, 0.95, std(0x5f6b70, {r: 0.5, m: 0.4}), -4.47, 1.02, 6.5, F4);
const f4Exit = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({map: exitTex})); f4Exit.position.set(-4.46, 2.3, 6.5); f4Exit.rotation.y = Math.PI / 2; F4.add(f4Exit);

// schedule board near the work light
const boardTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f2f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
  g.fillStyle = '#1d2a5c'; g.font = '700 82px Caveat'; g.fillText('JADWAL TUKANG — LT. 4', 60, 120);
  g.font = '700 62px Caveat'; g.fillStyle = '#26324f';
  g.fillText('Rabu: plester  ✓', 70, 220); g.fillText('Kamis 07.00: tutup dinding  ✓', 70, 300); g.strokeStyle = '#26324f'; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 282); g.lineTo(760, 290); g.stroke();
  g.fillStyle = '#b3201a'; g.font = '700 74px Caveat'; g.fillText('BESOK 07.00 →', 70, 420); g.fillText('TUTUP DINDING', 70, 505); g.font = '700 96px Caveat'; g.fillText('SATPAM', 520, 595);
});
const boardRed = canvasTex(1024, 640, (g, w, h) => { g.clearRect(0, 0, w, h); });
function drawBoardCircle(k) { const {g, c} = boardRed.userData; g.clearRect(0, 0, c.width, c.height); if (k <= 0) return;
  g.strokeStyle = '#c4231b'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.ellipse(680, 565, 205, 70, -0.04, -Math.PI * 0.9, -Math.PI * 0.9 + Math.PI * 2.1 * k); g.stroke(); boardRed.needsUpdate = true; }
const BOARD = new THREE.Group(); BOARD.position.set(2.6, 0, 19.2); BOARD.rotation.y = Math.PI + 0.35; F4.add(BOARD);
box(0.04, 1.9, 0.04, black, -0.62, 0.95, 0.02, BOARD); box(0.04, 1.9, 0.04, black, 0.62, 0.95, 0.02, BOARD);
const boardM = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.82), new THREE.MeshStandardMaterial({map: boardTex, roughness: 0.6})); boardM.position.set(0, 1.45, 0); BOARD.add(boardM);
const boardC = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.82), new THREE.MeshBasicMaterial({map: boardRed, transparent: true})); boardC.position.set(0, 1.45, 0.003); BOARD.add(boardC);
const boardLight = new THREE.PointLight(0xffd7a0, 3, 3, 1.5); boardLight.position.set(1.7, 2.0, 18.2); F4.add(boardLight);
// half-built brick wall with a body-shaped niche
const brickTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8a8478'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = -1; c < 5; c++) { const x = c * 128 + (r % 2) * 64, y = r * 32; g.fillStyle = `hsl(${12 + hash(r * 9 + c) * 10},${42 + hash(r + c * 3) * 15}%,${33 + hash(r * 3 + c) * 10}%)`; g.fillRect(x + 4, y + 4, 120, 24); } });
brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping; brickTex.repeat.set(0.9, 0.9);
const NICHE = new THREE.Group(); NICHE.position.set(-1.0, 0, 21.6); NICHE.rotation.y = Math.PI; F4.add(NICHE);
{
  const outer = new THREE.Shape(); outer.moveTo(-1.6, 0); outer.lineTo(1.6, 0); outer.lineTo(1.6, 1.75);
  for (let i = 0; i <= 8; i++) outer.lineTo(1.6 - i * 0.4, 1.75 + (i % 2 ? 0.0 : 0.075) + (i > 4 ? -0.15 : 0)); outer.lineTo(-1.6, 1.6); outer.lineTo(-1.6, 0);
  // stickman silhouette hole (Rudi's standing outline, slightly generous)
  const P = [[0.045, 1.4], [0.11, 1.37], [0.17, 1.32], [0.24, 0.92], [0.29, 0.86], [0.3, 0.76], [0.25, 0.7], [0.18, 0.72], [0.15, 0.8], [0.17, 0.9], [0.1, 1.2],
    [0.095, 0.95], [0.11, 0.86], [0.12, 0.45], [0.12, 0.08], [0.19, 0.04], [0.19, 0.0], [0.04, 0.0], [0.045, 0.45], [0.03, 0.82], [0, 0.84]];
  const hole = new THREE.Path(); hole.moveTo(P[0][0], P[0][1]);
  for (const [x, y] of P.slice(1)) hole.lineTo(x, y);
  for (const [x, y] of P.slice(0, -1).reverse()) hole.lineTo(-x, y);
  for (let i = 0; i <= 24; i++) { const th = -Math.PI / 2 - 0.276 - (i / 24) * (2 * Math.PI - 0.552); hole.lineTo(Math.cos(th) * 0.165, 1.56 + Math.sin(th) * 0.165); }
  hole.lineTo(P[0][0], P[0][1]);
  outer.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outer, {depth: 0.22, bevelEnabled: false});
  const wallM = new THREE.Mesh(geo, [new THREE.MeshStandardMaterial({map: brickTex, roughness: 0.95}), std(0x6f6a62)]); wallM.castShadow = true; wallM.receiveShadow = true; NICHE.add(wallM);
}
const cement = new THREE.MeshStandardMaterial({color: 0x6c7072, roughness: 0.12, metalness: 0.1, map: concreteTex('#8a8d8e', 256, 256, 31)});
const nicheBack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.9), cement); nicheBack.position.set(0, 0.95, 0.12); NICHE.add(nicheBack);
const printTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(240,238,230,.92)';
  g.beginPath(); g.ellipse(128, 140, 52, 62, 0, 0, 7); g.fill(); for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(84 + i * 29, 62, 13, 32, (i - 1.5) * 0.12, 0, 7); g.fill(); }
  g.beginPath(); g.ellipse(196, 128, 14, 30, -0.7, 0, 7); g.fill(); });
const print = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({map: printTex, transparent: true, roughness: 0.4})); print.position.set(0.22, 0.79, 0.122); NICHE.add(print);
const pushGlove = new THREE.Group(); NICHE.add(pushGlove);
{ const palm = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 14), cement); palm.scale.set(1, 1.1, 0.6); pushGlove.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.05, 4, 8), cement); f.position.set(-0.042 + i * 0.028, 0.085, 0); pushGlove.add(f); } }
pushGlove.position.set(-0.03, 1.08, 0.08);
const nicheLight = new THREE.SpotLight(0xffd6a0, 0, 5, 0.6, 0.6, 1.4); nicheLight.position.set(-0.4, 2.3, 19.6); nicheLight.target.position.set(-1.0, 1.0, 21.6); F4.add(nicheLight, nicheLight.target);


// ---------- SET: LOBBY (x = 60). Lift on back wall z=-6, glass entrance z=+6, machine on pillar facing the lift ----------
const LOB = new THREE.Group(); LOB.position.set(60, 0, 0); scene.add(LOB);
const tileTex = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 196 + Math.floor(hash(x * 7 + y * 13) * 14); g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x * 128, y * 128, 128, 128); }
  g.strokeStyle = 'rgba(80,70,60,.5)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); } });
tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(4, 5);
const lobFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 12), new THREE.MeshStandardMaterial({map: tileTex, roughness: 0.32, metalness: 0.05})); lobFloor.rotation.x = -Math.PI / 2; lobFloor.receiveShadow = true; LOB.add(lobFloor);
const lobWallMat = new THREE.MeshStandardMaterial({map: concreteTex('#b9b2a2', 512, 512, 41), roughness: 0.9}); lobWallMat.map.repeat.set(3, 1);
const lobCeil = new THREE.Mesh(new THREE.PlaneGeometry(10, 12), std(0xcfcac0)); lobCeil.rotation.x = Math.PI / 2; lobCeil.position.y = 3.4; LOB.add(lobCeil);
for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.4), lobWallMat); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 5, 1.7, 0); w.receiveShadow = true; LOB.add(w); }
box(4.4, 3.4, 0.2, lobWallMat, -2.8, 1.7, -6.1, LOB, false); box(4.4, 3.4, 0.2, lobWallMat, 2.8, 1.7, -6.1, LOB, false); box(1.2, 1.1, 0.2, lobWallMat, 0, 2.85, -6.1, LOB, false);
box(0.12, 2.35, 0.3, steel, -0.66, 1.15, -6.0, LOB); box(0.12, 2.35, 0.3, steel, 0.66, 1.15, -6.0, LOB); box(1.44, 0.12, 0.3, steel, 0, 2.3, -6.0, LOB);
const lobDoorL = box(0.6, 2.25, 0.04, doorMat, -0.3, 1.125, -5.9, LOB), lobDoorR = box(0.6, 2.25, 0.04, doorMat, 0.3, 1.125, -5.9, LOB);
const lobCab = new THREE.Group(); lobCab.position.set(0, 0, -7.0); LOB.add(lobCab);
box(1.4, 0.04, 1.6, std(0x3b3530), 0, 0, 0, lobCab, false); box(0.04, 2.3, 1.6, cabWall, -0.7, 1.15, 0, lobCab, false); box(0.04, 2.3, 1.6, cabWall, 0.7, 1.15, 0, lobCab, false); box(1.4, 2.3, 0.04, cabWall, 0, 1.15, -0.8, lobCab, false); box(1.4, 0.04, 1.6, std(0xfff3d6, {extra: {emissive: 0xfff0d0, emissiveIntensity: 0.6}}), 0, 2.3, 0, lobCab, false);
box(1.4, 0.06, 0.06, steel, 0, 0.95, -0.76, lobCab, false);
const lobCabLight = new THREE.PointLight(0xfff0d0, 0, 4, 1.5); lobCabLight.position.set(0, 2.0, -7.0); LOB.add(lobCabLight);
const lobLedTex = ledTex(); const lobLed = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({map: lobLedTex})); lobLed.position.set(0, 2.55, -5.98); LOB.add(lobLed);
box(0.12, 0.2, 0.03, steelDark, 0.95, 1.2, -5.98, LOB, false);
// glass entrance + dawn outside
const glass = new THREE.MeshStandardMaterial({color: 0x9fb8c8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2, depthWrite: false});
for (const x of [-3.75, -1.25, 1.25, 3.75]) { const gp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), glass); gp.position.set(x, 1.6, 6.0); gp.rotation.y = Math.PI; LOB.add(gp); box(0.08, 3.4, 0.1, black, x + 1.25, 1.7, 6.0, LOB, false); }
box(10, 0.15, 0.12, black, 0, 3.32, 6.0, LOB, false);
const dawnTex = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5f7fa8'); gr.addColorStop(0.65, '#b9c6d4'); gr.addColorStop(1, '#e6c9a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let b = 0; b < 14; b++) { g.fillStyle = 'rgba(40,52,70,.85)'; const bx = hash(b + 3) * w, bw = 30 + hash(b) * 60, bh = 40 + hash(b * 3) * 120; g.fillRect(bx, h - bh, bw, bh); } });
const outside = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshBasicMaterial({map: dawnTex})); outside.position.set(0, 3.5, 11); outside.rotation.y = Math.PI; LOB.add(outside);
const dawn = new THREE.SpotLight(0xaec4e0, 60, 22, 0.9, 0.7, 1.2); dawn.position.set(1.5, 3.2, 9.5); dawn.target.position.set(0, 0, -2); dawn.castShadow = true; dawn.shadow.mapSize.set(1024, 1024); dawn.shadow.normalBias = 0.03; LOB.add(dawn, dawn.target);
const lobAmb = new THREE.PointLight(0x8090a8, 7, 14, 1.2); lobAmb.position.set(0, 3.0, 0); LOB.add(lobAmb);
// pillar + fingerprint machine (faces the lift, -z)
box(0.6, 3.4, 0.6, std(0x8e8679), 0, 1.7, 3.3, LOB);
const MACH = new THREE.Group(); MACH.position.set(0, 1.25, 2.98); MACH.rotation.y = Math.PI; LOB.add(MACH);
inked(new THREE.BoxGeometry(0.2, 0.28, 0.07), new THREE.MeshToonMaterial({color: 0x2a2d31, gradientMap: toonRamp}), 0.006, MACH).userData.ol.scale.set(1.06, 1.05, 1.15);
const machTex = canvasTex(256, 160, () => {});
function drawMach(state, clock = '06:59') { const {g, c} = machTex.userData; const w = c.width, h = c.height;
  if (machTex.userData.state === state + clock) return; machTex.userData.state = state + clock;
  g.fillStyle = state === 'off' ? '#0a0c0b' : state === 'thanks' || state === 'thanksD' ? '#0c2a17' : '#0d1a20'; g.fillRect(0, 0, w, h);
  if (state === 'off') { machTex.needsUpdate = true; return; }
  g.textAlign = 'center'; g.fillStyle = '#9fe8ff'; g.font = 'bold 26px Nunito'; g.fillText(clock, w / 2, 30);
  if (state === 'thanks' || state === 'thanksD') { g.fillStyle = '#7dffa9'; g.shadowColor = '#3dff7a'; g.shadowBlur = 10; g.font = '900 30px Nunito'; g.fillText('TERIMA KASIH', w / 2, 82); g.font = '900 40px Nunito'; g.fillText(state === 'thanks' ? 'RUDI' : 'DARTO', w / 2, 128); g.shadowBlur = 0; }
  else { g.fillStyle = '#6f8f9a'; g.font = '700 22px Nunito'; g.fillText('TEMPELKAN JARI', w / 2, 95); }
  machTex.needsUpdate = true; }
const machScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({map: machTex, color: 0xc8c8c8})); machScreen.position.set(0, 0.06, 0.037); MACH.add(machScreen);
const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({color: 0x30c860, transparent: true, opacity: 0.15})); scanGlow.position.set(0, -0.07, 0.037); MACH.add(scanGlow);
const machLed = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshBasicMaterial({color: 0x30ff70})); machLed.position.set(0.075, 0.115, 0.038); MACH.add(machLed);
const machLight = new THREE.PointLight(0x5dff95, 0, 2.6, 1.6); machLight.position.set(0, 1.3, 2.75); LOB.add(machLight);
// missing poster on the glass (readable from inside)
const posterTex = canvasTex(360, 500, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3201a'; g.font = '900 64px Anton'; g.textAlign = 'center'; g.fillText('DICARI', w / 2, 74);
  g.fillStyle = '#222'; g.font = '700 26px Nunito'; g.fillText('ORANG HILANG', w / 2, 112);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, 210, 62, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(w / 2 - 20, 205, 7, 10, 0, 0, 7); g.ellipse(w / 2 + 20, 205, 7, 10, 0, 0, 7); g.fill(); g.fillRect(w / 2 - 14, 238, 28, 4);
  g.fillRect(w / 2 - 6, 272, 12, 90); g.fillStyle = '#9c1d1d'; g.fillRect(w / 2 - 9, 282, 18, 70);
  g.fillStyle = '#111'; g.font = '900 46px Nunito'; g.fillText('RUDI', w / 2, 410); g.font = '600 20px Nunito'; g.fillText('Terakhir terlihat: Lantai 5, 23.47', w / 2, 446); g.fillText('Hubungi: Pos Satpam', w / 2, 474); });
const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.58), new THREE.MeshStandardMaterial({map: posterTex, roughness: 0.8})); poster.position.set(-1.0, 1.55, 5.96); poster.rotation.set(0, Math.PI, 0.03); LOB.add(poster);
// wall clock (digital) on left wall
const wclockTex = canvasTex(256, 96, () => {});
function drawWClock(s) { const {g, c} = wclockTex.userData; if (wclockTex.userData.s === s) return; wclockTex.userData.s = s; g.fillStyle = '#080404'; g.fillRect(0, 0, c.width, c.height); g.font = 'bold 80px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff3020'; g.shadowBlur = 16; g.fillStyle = '#ff4433'; g.fillText(s, c.width / 2, c.height / 2 + 4); g.shadowBlur = 0; wclockTex.needsUpdate = true; }
const wclock = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({map: wclockTex})); wclock.position.set(-4.97, 2.5, -1.2); wclock.rotation.y = Math.PI / 2; LOB.add(wclock);
box(0.04, 0.36, 0.86, black, -4.99, 2.5, -1.2, LOB, false);
// chair for Darto (facing the machine, +z)
const chairMat = new THREE.MeshToonMaterial({color: 0x3b4a5c, gradientMap: toonRamp});
box(0.46, 0.05, 0.44, chairMat, 0, 0.46, -0.6, LOB); box(0.46, 0.5, 0.05, chairMat, 0, 0.72, -0.84, LOB); for (const [x, z] of [[-0.2, -0.4], [0.2, -0.4], [-0.2, -0.8], [0.2, -0.8]]) box(0.03, 0.46, 0.03, black, x, 0.23, z, LOB, false);
// security desk with CCTV monitor
box(1.6, 0.9, 0.6, new THREE.MeshToonMaterial({color: 0x6b5a48, gradientMap: toonRamp}), -3.6, 0.45, 1.0, LOB);
const cctvTex = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#1a1d1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a403e'; for (let i = 0; i < 4; i++) g.fillRect((i % 2) * 128 + 4, Math.floor(i / 2) * 96 + 4, 120, 88); g.fillStyle = '#9aa'; g.font = '12px monospace'; ['LOBI', 'LIFT', 'PARKIR', 'LT 4'].forEach((s, i) => g.fillText(s, (i % 2) * 128 + 10, Math.floor(i / 2) * 96 + 18)); });
const mon = box(0.55, 0.4, 0.06, black, -3.6, 1.15, 0.85, LOB); const monS = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshBasicMaterial({map: cctvTex})); monS.position.set(-3.6, 1.15, 0.885); LOB.add(monS);

// ---------- props for Darto: flashlight + phone ----------
const coneMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: {uInt: {value: 0.22}, uColor: {value: new THREE.Color(0xfff1d0)}},
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform float uInt; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float along = clamp((vY+1.5)/3.0,0.0,1.0); float edge = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(uColor*uInt*pow(along,2.2)*edge, 1.0); }'});
function makeTorch() { const g = new THREE.Group();
  const body = inked(new THREE.CylinderGeometry(0.022, 0.018, 0.17, 12), new THREE.MeshToonMaterial({color: 0x2d2d2d, gradientMap: toonRamp}), 0.006, g); body.position.y = -0.06;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), new THREE.MeshBasicMaterial({color: 0xfff6dc})); lens.rotation.x = Math.PI / 2; lens.position.y = -0.146; g.add(lens);
  const spot = new THREE.SpotLight(0xfff0d0, 0, 14, 0.5, 0.6, 1.1); spot.position.y = -0.15; spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.normalBias = 0.03; g.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.y = -3; g.add(tgt); spot.target = tgt;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.0, 28, 1, true), coneMat); cone.position.y = -0.15 - 1.5; g.add(cone);
  return {g, spot, cone, lens}; }
const phoneTex = canvasTex(360, 720, () => {});
function drawPhone(k, lit = 1) { const key = Math.round(k * 30) + ':' + lit; if (phoneTex.userData.key === key) return; phoneTex.userData.key = key;
  const {g, c} = phoneTex.userData; const w = c.width, h = c.height;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16233b'); gr.addColorStop(1, '#05070c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = lit; g.fillStyle = '#e8eef8'; g.textAlign = 'center'; g.font = '300 92px Nunito'; g.fillText('07:00', w / 2, 170); g.font = '600 22px Nunito'; g.fillText('Jumat, 21 November', w / 2, 208);
  if (k > 0) { const y = 250 - (1 - k) * 160; g.globalAlpha = lit * k; g.fillStyle = 'rgba(235,240,245,.94)'; const r = 26; const x0 = 18, x1 = w - 18, y1 = y + 170;
    g.beginPath(); g.moveTo(x0 + r, y); g.lineTo(x1 - r, y); g.quadraticCurveTo(x1, y, x1, y + r); g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1); g.lineTo(x0 + r, y1); g.quadraticCurveTo(x0, y1, x0, y1 - r); g.lineTo(x0, y + r); g.quadraticCurveTo(x0, y, x0 + r, y); g.fill();
    g.fillStyle = '#1e7a45'; g.fillRect(36, y + 22, 34, 34); g.fillStyle = '#fff'; g.font = '900 20px Nunito'; g.fillText('✓', 53, y + 47);
    g.textAlign = 'left'; g.fillStyle = '#4a5260'; g.font = '700 18px Nunito'; g.fillText('ABSENSI • WISMA KENANGA', 82, y + 45); g.textAlign = 'right'; g.fillText('sekarang', w - 36, y + 45);
    g.textAlign = 'left'; g.fillStyle = '#111'; g.font = '800 26px Nunito'; g.fillText('Absen pulang berhasil.', 36, y + 98); g.font = '600 24px Nunito'; g.fillText('Terima kasih, Darto. 07:00', 36, y + 136); }
  g.globalAlpha = 1; phoneTex.needsUpdate = true; }
function makePhone() { const g = new THREE.Group();
  inked(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshToonMaterial({color: 0x15171a, gradientMap: toonRamp}), 0.004, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.138), new THREE.MeshBasicMaterial({map: phoneTex, color: 0xa8a8a8})); scr.position.z = 0.0055; g.add(scr);
  const glow = new THREE.PointLight(0xbfd4ff, 0, 1.2, 1.6); glow.position.z = 0.15; g.add(glow); return {g, glow}; }

// ---------- dust motes (drift deterministically; visible in beams) ----------
const dustTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const DUSTN = 700; const dustGeo = new THREE.BufferGeometry(); const dustBase = new Float32Array(DUSTN * 3);
for (let i = 0; i < DUSTN; i++) { dustBase[i * 3] = (hash(i * 1.3) - .5) * 5; dustBase[i * 3 + 1] = hash(i * 2.7) * 3; dustBase[i * 3 + 2] = (hash(i * 4.1) - .5) * 6; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUSTN * 3), 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({map: dustTex, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8d0c0}));
scene.add(dust);
function placeDust(center, t, amt = 1) { dust.visible = amt > 0; dust.material.opacity = 0.55 * amt; dust.position.copy(center); const a = dustGeo.attributes.position;
  for (let i = 0; i < DUSTN; i++) { a.array[i * 3] = dustBase[i * 3] + Math.sin(t * 0.21 + i) * 0.12; a.array[i * 3 + 1] = (dustBase[i * 3 + 1] + t * 0.03 * (0.3 + hash(i))) % 3; a.array[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.7) * 0.12; } a.needsUpdate = true; }

// ---------- CAST ----------
const darto = makeStick({tie: false, card: false, cap: true, mustache: true, badge: true, belt: true}); scene.add(darto.root); darto.setBlinkSeed(1.3);
const torch = makeTorch(); torch.g.position.set(0, -0.05, 0.03); darto.R.glove.add(torch.g);
const pocket = makePhone(); pocket.g.scale.setScalar(0.9); pocket.g.position.set(-0.06, 0.33, 0.062); pocket.g.rotation.x = -0.1; darto.chest.add(pocket.g);
const handPhone = makePhone(); scene.add(handPhone.g);
const handGlove = new THREE.Group(); scene.add(handGlove);
{ const p = inked(new THREE.SphereGeometry(0.062, 18, 14), toonWhite, INK, handGlove); p.scale.set(1.15, 1.0, 0.7); p.userData.ol.scale.setScalar(1.17);
  const th = inked(new THREE.CapsuleGeometry(0.02, 0.05, 4, 8), toonWhite, INK, handGlove); th.position.set(0.055, 0.03, 0.03); th.rotation.z = -0.5; th.userData.ol.scale.setScalar(1.5); }
const LX = x => 60 + x; const LV = (x, y, z) => V(60 + x, y, z);
// closed niche: plaster patch over the body-shaped hole
const plasterTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#9b9c98'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${hash(i) > .5 ? 255 : 40},${hash(i) > .5 ? 255 : 40},${hash(i) > .5 ? 255 : 40},.06)`; g.lineWidth = 6 + hash(i * 3) * 14; g.beginPath(); const x = hash(i * 5) * w, y = hash(i * 7) * h; g.arc(x, y, 30 + hash(i * 9) * 60, hash(i) * 6, hash(i) * 6 + 1.6); g.stroke(); }
  // faint body silhouette pressure mark
  g.fillStyle = 'rgba(40,40,40,.10)'; g.beginPath(); g.arc(w / 2, h * 0.16, 38, 0, 7); g.fill(); g.fillRect(w / 2 - 22, h * 0.24, 44, 150); g.fillRect(w / 2 - 22, h * 0.52, 16, 200); g.fillRect(w / 2 + 6, h * 0.52, 16, 200);
  g.save(); g.translate(w / 2 + 26, h * 0.27); g.rotate(-0.25); g.fillRect(0, 0, 14, 110); g.restore(); g.save(); g.translate(w / 2 - 40, h * 0.27); g.rotate(0.25); g.fillRect(0, 0, 14, 110); g.restore(); });
const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.95), new THREE.MeshStandardMaterial({map: plasterTex, roughness: 0.95})); patch.position.set(0, 0.97, 0.226); NICHE.add(patch);
nicheBack.visible = false; print.visible = false; pushGlove.visible = false;

// ---------- helpers ----------
let fx = {cctv: 0, ca: 1, vig: 1}; let knockShake = 0;
function cctvText(s) { cctvEl.style.display = 'block'; cctvEl.querySelector('.bl').textContent = s; }
function torchOn(k = 1) { torch.spot.intensity = 5 * k; coneMat.uniforms.uInt.value = 0.16 * k; torch.cone.visible = k > 0.01; torch.lens.material.color.setScalar(0.25 + 0.75 * k); }
function sit(t) { darto.root.position.copy(LV(0, 0, -0.62)); darto.root.rotation.y = 0;
  return {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.95, 0.12], re: 0.45, la: [0.6, 0.15], le: 1.2, lean: 0.06}; }
const DOOR4 = V(-40 + 0.7, 0, 1.57); // stair door (landing A, group oy=0)

function resetAbsen() {
  LOB.visible = STW.visible = F4.visible = CAB.visible = false; darto.root.visible = false; handPhone.g.visible = false; handGlove.visible = false;
  darto.R.finger.visible = false; pocket.g.position.x = -0.06;
  torchOn(0); pocket.glow.intensity = 0; handPhone.glow.intensity = 0; drawPhone(0, 0); drawMach('idle', '07:00'); machLight.intensity = 0; scanGlow.material.opacity = 0.15;
  drawWClock('06:59'); lobDoorL.position.x = -0.3; lobDoorR.position.x = 0.3; lobCabLight.intensity = 0; drawLedIf(lobLedTex, 'L', '#ff3326');
  fx = {cctv: 0, ca: 1, vig: 1}; cctvEl.style.display = 'none'; knockShake = 0; dust.visible = false; endEl.style.opacity = 0; fadeEl.style.opacity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); scene.fog.density = 0.045; drawBoardCircleIf(0); nicheLight.intensity = 0;
  workLight.intensity = 300; workFill.intensity = 14; coldFill.intensity = 4; boardLight.intensity = 3;
  for (const g of STW.children) g.children.forEach(c => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.depth === 0.06 && c.geometry.parameters.width === 0.95) c.rotation.y = 0; });
}
function lobbyBase(dawnK = 1) { LOB.visible = true; dawn.intensity = 60 * dawnK; lobAmb.intensity = 4 * dawnK; scene.fog.density = 0.02; }
const stairDoors = []; for (const g of STW.children) g.children.forEach(c => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.depth === 0.06 && c.geometry.parameters.width === 0.95) stairDoors.push(c); });

const shots = [
  {name: 'h-poster', t0: 0, t1: 1.95, f(t) { lobbyBase(); const k = seg(t, 0, 1.95);
    cam(LV(-0.9, 1.6, 4.7).lerp(LV(-0.95, 1.57, 5.15), k), LV(-1.0, 1.78, 6.0), 40); }},
  {name: 'h-machine', t0: 1.95, t1: 3.85, f(t) { lobbyBase(0.6); drawMach('thanks', '07:00:00'); machLight.intensity = 1.6; scanGlow.material.opacity = 0.7;
    const k = seg(t, 1.95, 3.85); cam(LV(0.2, 1.36, 2.05).lerp(LV(0.1, 1.32, 2.3), k), LV(0, 1.24, 2.98), 40); }},
  {name: 'lobby-dawn', t0: 3.85, t1: 6.95, f(t) { lobbyBase(); drawWClock(t < 6.2 ? '06:59' : '07:00'); drawMach('idle', t < 6.2 ? '06:59' : '07:00');
    const k = seg(t, 3.85, 6.95); cam(LV(-3.6, 1.7, -4.8).lerp(LV(-3.0, 1.6, -3.6), k), LV(0.2, 1.1, 3.0), 50); }},
  {name: 'push-machine', t0: 6.95, t1: 10.3, f(t) { lobbyBase(); drawMach('idle', '07:00');
    const k = seg(t, 6.95, 10.3); cam(LV(0.6, 1.4, 0.4).lerp(LV(0.15, 1.3, 2.25), k), LV(0, 1.25, 2.98), 42); }},
  {name: 'm1-thanks', t0: 10.3, t1: 12.6, f(t) { lobbyBase(); const on = t >= 10.5;
    drawMach(on ? 'thanks' : 'idle', '07:00:00'); machLight.intensity = on ? 1.8 : 0; scanGlow.material.opacity = on ? 0.9 * (0.6 + 0.4 * Math.sin(t * 6)) : 0.15;
    cam(LV(-0.08, 1.3, 2.3), LV(0, 1.22, 2.98), 38); }},
  {name: 'darto-inspect', t0: 12.6, t1: 16.3, f(t) { lobbyBase(); darto.root.visible = true; drawMach('idle', '07:00');
    darto.root.position.copy(LV(0.05, 0, 2.35)); darto.root.rotation.y = 0;
    const bend = seg(t, 13.2, 13.8) * (1 - seg(t, 15.0, 15.5)), tap = seg(t, 14.1, 14.5) * (1 - seg(t, 14.7, 15.0)), look = t > 15.4 ? Math.sin((t - 15.4) * 4) * 0.8 : 0;
    darto.pose({lean: 0.32 * bend, head: [look, -0.15 * bend], ra: [lerp(0.05, 1.15, tap), 0.05], re: lerp(0.15, 0.5, tap), la: [0.1, 0.15], point: 0, brow: 0.3, eyes: 1.05, mouth: 'flat'}, t);
    darto.R.finger.visible = tap > 0.5;
    cam(LV(1.5, 1.55, 1.2).lerp(LV(1.3, 1.5, 1.5), seg(t, 12.6, 16.3)), LV(0.0, 1.3, 2.7), 44); }},
  {name: 'cctv-days', t0: 16.3, t1: 20.36, f(t) { lobbyBase(0.8); fx.cctv = 1; darto.root.visible = true;
    const day = t < 17.65 ? 0 : t < 19.0 ? 1 : 2; const lit = ((t - 16.3) % 1.35) > 0.35;
    drawMach(lit ? 'thanks' : 'idle', '07:00'); machLight.intensity = lit ? 1.6 : 0;
    darto.root.position.copy(LV([0.9, -0.9, 0.7][day], 0, [2.0, 1.8, 1.4][day])); darto.root.rotation.y = [-0.6, 0.6, -0.3][day];
    darto.pose({head: [lit ? [0.5, -0.5, 0.3][day] : 0, 0], la: [0.1, 0.12], ra: [0.1, 0.12], eyes: 1.1}, t);
    cctvText(`${17 + day}-11-2026  07:00:0${Math.floor(((t - 16.3) % 1.35) * 5)}`);
    cam(LV(-4.6, 3.25, -0.8), LV(0.0, 0.9, 2.6), 58); }},
  {name: 'waiting-torch', t0: 20.36, t1: 23.67, f(t) { lobbyBase(0.35); darto.root.visible = true; torchOn(1); drawWClock('06:59'); drawMach('idle', '06:59');
    darto.pose({...sit(t), head: [0, 0.05], eyes: 1.0, brow: 0.2}, t);
    placeDust(LV(0, 0, 1.2), t, 1);
    const k = seg(t, 20.36, 23.67); cam(LV(1.6, 1.05, 1.6).lerp(LV(1.2, 1.1, 1.2), k), LV(0.0, 0.9, -0.8), 46); }},
  {name: 'clock-0659', t0: 23.67, t1: 25.9, f(t) { lobbyBase(0.35); drawWClock('06:59'); torchOn(1); darto.root.visible = true; darto.pose({...sit(t), head: [-0.6, 0.2], look: [-0.8, 0.4]}, t);
    const k = seg(t, 23.67, 25.9); cam(LV(-2.7, 2.2, -0.6).lerp(LV(-3.0, 2.3, -0.8), k), LV(-4.97, 2.45, -1.2), 40); }},
  {name: 'ding-turn', t0: 25.9, t1: 27.95, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; drawLedIf(lobLedTex, 'L', '#ffb020');
    const h = seg(t, 26.35, 26.6), b = seg(t, 26.55, 27.1);
    const P = sit(t); darto.pose({...P, head: [lerp(0, 1.2, h), 0], twist: lerp(0, 0.6, b), eyes: lerp(1, 1.4, h), brow: 0.6 * h, mouth: h > 0.5 ? 'o' : 'flat', ra: [lerp(0.95, 1.2, b), 0.12 + 0.5 * b]}, t);
    darto.root.rotation.y = -0.9 * b;
    cam(LV(0.25, 1.0, 1.0), LV(0, 1.2, -1.2), 44); }},
  {name: 'doors-open', t0: 27.95, t1: 29.48, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; drawLedIf(lobLedTex, 'L', '#ffb020');
    const o = seg(t, 28.0, 29.0); lobDoorL.position.x = -0.3 - 0.62 * o; lobDoorR.position.x = 0.3 + 0.62 * o; lobCabLight.intensity = 6 * o;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI;
    darto.pose({ra: [1.35, 0.05], re: 0.15, la: [0.15, 0.2], head: [0, 0], eyes: 1.35, brow: 0.6}, t);
    placeDust(LV(0, 0, -3), t, 1);
    cam(LV(-0.45, 1.7, 0.9), LV(0.0, 1.2, -6.0), 46); }},
  {name: 'empty', t0: 29.48, t1: 30.67, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92; lobCabLight.intensity = 6;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI; darto.pose({ra: [1.35, 0.05], re: 0.15, eyes: 1.35}, t);
    placeDust(LV(0, 0, -4), t, 1);
    const k = seg(t, 29.48, 30.67); cam(LV(0.1, 1.45, -2.4).lerp(LV(0.05, 1.42, -2.9), k), LV(0, 1.2, -7.4), 40); }},
  {name: 'machine-wakes', t0: 30.67, t1: 32.85, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92; lobCabLight.intensity = 6;
    const on = t >= 31.3; drawMach(on ? 'thanks' : 'off', '07:00'); machLight.intensity = on ? 2.4 * seg(t, 31.3, 31.5) : 0; scanGlow.material.opacity = on ? 0.9 : 0.0;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI;
    const turn = seg(t, 31.7, 32.6); darto.pose({ra: [1.35 - 0.5 * turn, 0.05], re: 0.15, head: [lerp(0, 1.1, turn), 0], twist: 0.3 * turn, eyes: 1.4, brow: 0.7}, t);
    cam(LV(0.9, 1.5, 2.2), LV(0.1, 1.3, -0.5), 46); }},
  {name: 'm2-face', t0: 32.85, t1: 35.5, f(t) { lobbyBase(0.35); torchOn(0.8); darto.root.visible = true; lobCabLight.intensity = 6; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92;
    drawMach('thanks', '07:00'); machLight.intensity = 2.4; scanGlow.material.opacity = 0.9 * (0.6 + 0.4 * Math.sin(t * 7));
    if (t < 34.1) { cam(LV(-0.06, 1.3, 2.3), LV(0, 1.22, 2.98), 38); darto.root.visible = false; }
    else { darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = 0.2; darto.pose({ra: [0.6, 0.1], re: 0.3, head: [0, 0.05], eyes: 1.6, brow: 1.0, mouth: 'o', la: [0.3, 0.3], lean: -0.06}, t);
      cam(LV(0.45, 1.6, 0.95), LV(0.15, 1.5, -0.3), 40); } }},
  {name: 'cctv-lift', t0: 35.5, t1: 38.6, f(t) { lobbyBase(0.35); fx.cctv = 1; lobDoorL.position.x = -0.3; lobDoorR.position.x = 0.3;
    const n = t < 36.3 ? 'L' : t < 36.9 ? '1' : t < 37.5 ? '2' : t < 38.1 ? '3' : '4'; drawLedIf(lobLedTex, n, n === '4' ? '#ff2a1a' : '#ffb020');
    cctvEl.querySelector('.tl').textContent = 'CAM-02  LIFT'; cctvText('20-11-2026  07:00:31');
    cam(LV(-0.9, 2.2, -4.2), LV(0, 2.2, -6.0), 34); }},
  {name: 'desk-monitor', t0: 38.6, t1: 39.75, f(t) { lobbyBase(0.35); darto.root.visible = true; drawLedIf(lobLedTex, '4', '#ff2a1a');
    darto.root.position.copy(LV(-3.35, 0, 1.75)); darto.root.rotation.y = Math.PI; darto.pose({head: [0, -0.05], eyes: 1.4, brow: 0.8, mouth: 'frown', la: [0.4, 0.2], le: 0.9, ra: [0.4, 0.2], re: 0.9, lean: 0.12}, t);
    cam(LV(-2.35, 1.5, 1.95), LV(-3.5, 1.2, 0.9), 46); }},
  {name: 'stairs-up', t0: 39.75, t1: 42.3, f(t) { STW.visible = true; darto.root.visible = true; torchOn(0.55);
    const k = seg(t, 39.75, 42.2); const p0 = V(-40 + 0.6, -1.58, -2.75), p1 = V(-40 + 0.6, 0.02, -0.05);
    const p = p0.clone().lerp(p1, k); darto.root.position.copy(p); darto.root.rotation.y = 0;
    const strength = 0.8 * ease(k / 0.08) * ease((1 - k) / 0.08);
    darto.pose({...walkPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, strength), ra: [1.25, 0.05], re: 0.2, head: [0, 0.15], eyes: 1.2, brow: 0.5}, t);
    placeDust(V(-39.4, -0.5, -1.4), t, 1);
    cam(p.clone().add(V(0.32, 1.28, 1.45)), p.clone().add(V(0, 0.9, 0)), 65); }},
  {name: 'door-ajar', t0: 42.3, t1: 47.8, f(t) { STW.visible = true; darto.root.visible = true; torchOn(1);
    const d = stairDoors.find(d => Math.abs(d.parent.position.y) < 0.01); const ajar = 0.18 + 0.35 * seg(t, 45.9, 46.7);
    d.rotation.y = ajar; d.position.x = 0.7 - 0.0;
    const pw = walkTo(darto, t, 42.6, 44.6, V(-40 + 0.6, 0.02, -0.05), V(-40 + 0.75, 0.02, 0.85));
    darto.pose({...pw, ra: [1.3, 0.05], re: 0.15, head: [0, 0.05], eyes: 1.25, brow: 0.6}, t);
    placeDust(V(-39.3, 0, 0.6), t, 1);
    cam(V(-38.15, 1.55, -0.6).lerp(V(-38.3, 1.5, -0.2), seg(t, 42.3, 47.8)), V(-39.3, 1.15, 1.57), 50); }},
  {name: 'corridor-beam', t0: 47.8, t1: 50.04, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1);
    darto.root.position.set(-3.9, 0.02, 6.5); darto.root.rotation.y = Math.PI / 2 + 0.3 * Math.sin((t - 47.8) * 1.4);
    darto.pose({ra: [1.3, 0.05], re: 0.15, head: [0.2 * Math.sin((t - 47.8) * 1.4), 0.05], eyes: 1.2, brow: 0.5}, t);
    swayPlastic(t, 0.6); placeDust(V(-2.0, 0, 6.8), t, 1);
    cam(V(-4.4, 2.05, 5.5), V(0.5, 1.3, 16), 48); }},
  {name: 'walk-to-wall', t0: 50.04, t1: 53.0, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1); swayPlastic(t, 0.6);
    const pw = walkTo(darto, t, 50.04, 53.0, V(-2.6, 0.02, 12.4), V(-1.15, 0.02, 19.4));
    darto.pose({...pw, ra: [1.25, 0.05], re: 0.2, head: [0, 0.0], eyes: 1.2, brow: 0.5}, t);
    placeDust(darto.root.position, t, 1);
    const c = darto.root.position.clone(); cam(V(c.x + 0.9, 1.5, c.z + 2.6), V(c.x, 1.1, c.z), 50); }},
  {name: 'wall-closed', t0: 53.0, t1: 55.72, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.55); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 19.6); darto.root.rotation.y = 0.05 * Math.sin(t);
    darto.pose({ra: [1.2 + 0.1 * Math.sin((t - 53) * 1.6), 0.1 * Math.cos((t - 53) * 1.6)], re: 0.2, head: [0, 0.05], eyes: 1.3, brow: 0.6}, t);
    placeDust(V(-1.0, 0, 20.4), t, 1);
    cam(V(-0.1, 1.35, 18.2).lerp(V(-0.35, 1.3, 18.6), seg(t, 53, 55.72)), V(-1.0, 1.0, 21.4), 46); }},
  {name: 'touch-cement', t0: 55.72, t1: 56.87, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.9); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 20.92); darto.root.rotation.y = 0;
    darto.pose({la: [1.35, 0.15], le: 0.05, ra: [0.9, 0.2], re: 0.6, head: [0, -0.05], eyes: 1.2, brow: 0.5, lean: 0.05}, t);
    cam(V(-2.45, 1.45, 19.85), V(-1.0, 1.15, 21.3), 34); }},
  {name: 'board-wide', t0: 56.87, t1: 61.1, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.45);
    darto.root.position.set(1.2, 0.02, 17.7); darto.root.rotation.y = 0.55; darto.pose({ra: [1.3, 0.1], re: 0.15, head: [0, 0.05], eyes: 1.2, brow: 0.5}, t);
    cam(V(0.0, 1.7, 16.2).lerp(V(0.35, 1.65, 16.7), seg(t, 56.87, 61.1)), V(2.55, 1.35, 19.2), 44); }},
  {name: 'board-close', t0: 61.1, t1: 64.9, f(t) { F4.visible = CAB.visible = true; torchOn(0); drawBoardCircleIf(seg(t, 63.85, 64.6));
    // Keep the handwritten clue readable under the work lamp and bloom.
    workLight.intensity = 35; workFill.intensity = 5; boardLight.intensity = 2;
    const k = seg(t, 61.1, 64.4); const a = BOARD.localToWorld(V(-0.2, 1.42, 0)), b = BOARD.localToWorld(V(0.26, 1.2, 0));
    const tgt = a.clone().lerp(b, k); const n = BOARD.localToWorld(V(0, 0, 1)).sub(BOARD.localToWorld(V(0, 0, 0))).normalize();
    cam(tgt.clone().add(n.multiplyScalar(1.25)), tgt, 40); }},
  {name: 'knocks', t0: 64.9, t1: 68.4, f(t) { F4.visible = CAB.visible = true; darto.root.visible = false; torchOn(0); nicheLight.intensity = 14;
    const knocks = [66.4, 67.3, 68.2]; let sh = 0; for (const kt of knocks) if (t >= kt && t < kt + 0.25) sh = 0.012 * (1 - (t - kt) / 0.25);
    placeDust(V(-1.0, 0, 21.2), t, 0.8 + 2 * sh * 50);
    cam(V(-0.6, 1.2, 19.85), V(-1.0, 1.0, 21.38), 40, sh > 0 ? shake(t, sh, 30) : null); }},
  {name: 'step-back', t0: 68.4, t1: 69.76, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1); nicheLight.intensity = 10;
    const k = seg(t, 68.45, 69.5); darto.root.position.set(-1.0, 0.02, lerp(20.6, 19.8, k)); darto.root.rotation.y = 0;
    darto.pose({...(k > 0 && k < 1 ? walkPose(-k * 0.8 / STRIDE * Math.PI, 0.7) : {}), ra: [1.2, 0.1], re: 0.2, head: [0, 0.1], eyes: 1.5, brow: 0.9, mouth: 'o', lean: -0.08}, t);
    cam(V(0.6, 1.4, 18.3), V(-1.0, 1.2, 20.6), 44); }},
  {name: 'pocket-buzz', t0: 69.76, t1: 71.14, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.8); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 19.8); darto.root.rotation.y = Math.PI * 0.85;
    const buzz = Math.sin(t * 90) * 0.004 * (((t - 69.76) % 0.6) < 0.35 ? 1 : 0); pocket.g.position.x = -0.06 + buzz; pocket.glow.intensity = 0.8; drawPhone(0, 1);
    darto.pose({ra: [0.5, 0.15], re: 0.4, head: [0, -0.35], eyes: 1.3, brow: 0.6, look: [0, -0.8]}, t);
    cam(V(-0.45, 1.35, 18.55), V(-1.0, 1.2, 19.75), 38); }},
  {name: 'phone', t0: 71.14, t1: 77.0, f(t) { F4.visible = CAB.visible = true; torchOn(0); nicheLight.intensity = 6;
    handPhone.g.visible = handGlove.visible = true; const k = seg(t, 73.9, 74.35); drawPhone(k, 1); handPhone.glow.intensity = 0.0;
    const base = V(-1.0, 1.42, 19.55); const bob = V(Math.sin(t * 1.3) * 0.004, Math.sin(t * 1.7) * 0.004, 0);
    handPhone.g.position.copy(base).add(bob); handPhone.g.rotation.set(-0.12, Math.PI + 0.05, 0.04);
    handGlove.position.copy(handPhone.g.position).add(V(0.0, -0.09, 0.012)); handGlove.rotation.set(0, Math.PI, 0); handGlove.scale.setScalar(0.85);
    const p = seg(t, 71.14, 73.6); cam(V(-1.0, 1.45, 19.05).lerp(V(-1.0, 1.43, 19.2), p), base, 30); }},
  {name: 'alone', t0: 77.0, t1: 80.4, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; nicheLight.intensity = 10 * (1 - seg(t, 79.3, 79.9));
    const fl = t > 79.0 && t < 79.9 ? (hash(Math.floor(t * 14)) > 0.45 ? 1 : 0.15) : t >= 79.9 ? 0 : 1; torchOn(fl);
    darto.root.position.set(-1.0, 0.02, 19.8); darto.root.rotation.y = 0; darto.pose({ra: [1.0, 0.1], re: 0.3, la: [0.6, 0.15], le: 1.2, head: [0, 0.05], eyes: 1.3, brow: 0.7}, t);
    workLight.intensity = 300 * (1 - seg(t, 79.5, 80.2)); workFill.intensity = 14 * (1 - seg(t, 79.5, 80.2));
    cam(V(-1.0, 1.6, 14.5).lerp(V(-1.0, 1.55, 15.4), seg(t, 77, 80.4)), V(-1.0, 1.1, 21.0), 40); }},
  {name: 'end', t0: 80.4, t1: 83.0, f(t) { fadeEl.style.opacity = 1; endEl.style.opacity = seg(t, 81.2, 81.9) * (1 - seg(t, 82.4, 82.95)); cam(V(0, 0, 0), V(0, 0, -1), 40); }},
];

// ---------- shared helpers formerly in the LANTAI 4 shot section ----------
function cam(pos, look, fov = 45, sh = null) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos); if (sh) camera.position.add(sh); camera.lookAt(look); }
function drawLedIf(tex, s, col) { if (tex.userData.text !== s || tex.userData.col !== col) { drawLed(tex, s, col); tex.userData.col = col; } }
let _bc = -1; function drawBoardCircleIf(k) { k = Math.round(k * 40) / 40; if (k !== _bc) { _bc = k; drawBoardCircle(k); } }

// ---------- post-processing: bloom + chromatic aberration/vignette + CCTV mode ----------
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.38, 0.55, 0.86); composer.addPass(bloom);
const lookPass = new ShaderPass({uniforms: {tDiffuse: {value: null}, uCA: {value: 1}, uVig: {value: 1}, uCCTV: {value: 0}, uTime: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig, uCCTV, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 off = c * r2 * 0.012 * uCA;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (uCCTV > 0.5) { float l = dot(col, vec3(0.3,0.59,0.11)); col = vec3(l*0.92, l*1.02, l*0.95); col = (col-0.5)*1.25+0.5;
        col *= 0.88 + 0.12*sin(vUv.y*1280.0*1.6); col += (h(vUv*vec2(720.0,1280.0) + floor(uTime*30.0)) - 0.5)*0.09; }
      col *= mix(1.0, (1.0 - smoothstep(0.25, 0.95, length(c*vec2(1.0,0.75)))), 0.55*uVig);
      gl_FragColor = vec4(col, 1.0); }`});
composer.addPass(lookPass); composer.addPass(new OutputPass());

// ---------- overlay ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), setupEl = $('setup'), payEl = $('payoff'), ruleEl = $('rule'), fadeEl = $('fade'), cctvEl = $('cctv'), endEl = $('end');
endEl.style.zIndex = 5; endEl.style.position = 'absolute';
setupEl.textContent = 'MESIN INI MENGABSEN';
payEl.innerHTML = 'ORANG YANG<span class="l2" style="font-size:96px;color:#f3ead8">SUDAH HILANG.</span>';
let captions = [];
function overlay(t) {
  const showT = t < 3.9; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, 3.6, 3.88); setupEl.style.opacity = seg(t, 0.1, 0.35) * out;
    const pk = t - 1.95; payEl.style.opacity = (pk >= 0 ? 1 : 0) * out; payEl.style.transform = `scale(${pk >= 0 ? lerp(1.035, 1, clamp(pk / 0.2)) : 1.035})`;
    ruleEl.style.width = `${clamp((t - 2.05) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : ''; capEl.className = c && c.machine ? 'machine' : ''; capEl.style.opacity = c ? 1 : 0;
}
// static grain (drawn once)
{ const g = $('grain').getContext('2d'); const im = g.createImageData(360, 640); let s = 7; for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '700 40px Caveat', '800 40px Nunito', '300 40px Nunito', '600 40px Nunito', '700 40px Nunito'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  for (const t of [tapeTex, deskClockTex, sign4Tex, exitTex, boardTex, posterTex, ...Object.values(btnTex).flat()]) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; }
  drawLed(inLedTex, '5'); drawLed(outLedTex, '4'); machTex.userData.state = null; phoneTex.userData.key = null;
  scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  resetAbsen();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  lookPass.uniforms.uCCTV.value = fx.cctv; lookPass.uniforms.uTime.value = t; lookPass.uniforms.uCA.value = fx.ca;
  composer.render();
  overlay(t);
  return s.name;
};
// Test-only hook (never called by renderAt): lets scripts/expression-sheet.cjs render a face close-up on a bare stickman.
window.__lab = { names: Object.keys(EXPR), actor: null, expr, acting, compose, walkPose, lookBehind, track: poseTrack,
  poseCases() { const w = Math.PI * 0.6; return {
    ...Object.fromEntries(Object.keys(POSE).map(n => [n, POSE[n]])),
    'run': run(w), 'sneak': sneak(w), 'wave': wave(0.1), 'talk': talk(0.5), 'lookAround': lookAround(0.7, 0), 'lookBehind(1)': lookBehind(1),
    'tremble': poseAdd(POSE.idle, tremble(0.4, 3)), 'sitNervous': sitNervous(0.15),
    'walk+lookBehind+nervous': compose(walkPose(w), lookBehind(1), expr('nervous', 1)), 'run+panicked': compose(run(w), expr('panicked', 1)),
    'sneak+suspicious': compose(sneak(w), lookAround(0.7, 0), expr('suspicious', 1)), 'sit+talk': compose(POSE.sitting, talk(0.5), expr('annoyed', 0.7)),
    'standing+side-eye': compose(POSE.armsCrossed, expr('suspicious', 1)), 'think+confused': compose(POSE.think, expr('confused', 1)) }; },
  body(patch, rotY = 0.45) { resetAbsen(); lobbyBase();
    if (!this.actor) { this.actor = makeStick({tie: false, card: false}); scene.add(this.actor.root); }
    const a = this.actor; a.root.visible = true; a.root.position.copy(LV(-2, 0, -1.2)); a.root.rotation.y = rotY;
    a.pose({blink: false, ...patch}, 0); cam(LV(-2, 0.95, 2.6), LV(-2, 0.82, -1.2), 42); scene.updateMatrixWorld(true); composer.render(); a.root.visible = false; },
  // Body lineup: one actor per body spec, standing side by side (test-only; actors are created lazily and hidden after the render).
  lineup(specs, patch = {}, rotY = 0.35) { resetAbsen(); lobbyBase(); this.bodies = this.bodies || {};
    const n = specs.length, gap = 0.62, out = [];
    specs.forEach((sp, i) => { const key = JSON.stringify(sp);
      if (!this.bodies[key]) { const a = makeStick({tie: false, card: false, body: bodySpec(...[].concat(sp))}); a.setBlinkSeed(0); scene.add(a.root); this.bodies[key] = a; }
      const a = this.bodies[key]; a.root.visible = true; a.root.position.copy(LV(-2 + (i - (n - 1) / 2) * gap, 0, -1.2)); a.root.rotation.y = rotY; a.pose({blink: false, ...patch}, 0);
      const m = a.metrics; out.push({spec: sp, height: +m.height.toFixed(3), headsTall: +m.headsTall.toFixed(2), shoulderWidth: +m.shoulderWidth.toFixed(3), reach: +m.reach.toFixed(3), hipY: +m.hipY.toFixed(3)}); });
    // fit width (portrait: horizontal half-tan of a 42 deg vertical fov ~0.216) and a 2.1 m tall figure
    const w = (n - 1) * gap + 0.8, d = Math.max(3.0, w / 2 / 0.2); cam(LV(-2, 1.0, -1.2 + d), LV(-2, 0.95, -1.2), 42); scene.updateMatrixWorld(true); composer.render();
    Object.values(this.bodies).forEach(a => a.root.visible = false); return out; },
  face(name, k = 1, genre = null, extra = {}) { resetAbsen(); lobbyBase();
    if (!this.actor) { this.actor = makeStick({tie: false, card: false}); scene.add(this.actor.root); }
    const a = this.actor; a.root.visible = true; a.root.position.copy(LV(-2, 0, -1.2)); a.root.rotation.y = 0;
    a.pose({...(typeof name === 'string' ? expr(name, k, genre) : name), blink: false, ...extra}, 0);
    cam(LV(-2, 1.53, 0.5), LV(-2, 1.53, -1.2), 32); scene.updateMatrixWorld(true); composer.render(); a.root.visible = false; return name; } };
window.sceneReady = true;
