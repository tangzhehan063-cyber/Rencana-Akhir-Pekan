import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// KASIR MANDIRI — Three.js horror stickman renderer (rig shared with ABSEN / LANTAI 4).
// Deterministic: window.renderAt(t) draws the frame for absolute video time t (seconds).

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
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
function makeStick(opts = {}) {
  const O = Object.assign({tie: true, card: true, cap: false, mustache: false, badge: false, belt: false}, opts);
  const HR = 0.14, LR = 0.043, TR = 0.064, UPPER = 0.28, FORE = 0.27, THIGH = 0.42, SHIN = 0.42, TORSO = 0.46;
  const HIP_Y = THIGH + SHIN + 0.035;
  const root = new THREE.Group(); const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Group(); torso.add(chest);
  { const m = new THREE.Mesh(new THREE.CapsuleGeometry(TR, TORSO - TR, 8, 18), toonBody); m.position.y = TORSO / 2; m.scale.set(1.08, 1, 0.82); m.castShadow = true; chest.add(m);
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(TR + INK, TORSO - TR, 8, 18), inkMat); o.position.copy(m.position); o.scale.copy(m.scale); chest.add(o); }
  const extras = [];
  if (O.tie) { const tieMat = new THREE.MeshToonMaterial({color: 0x9c1d1d, gradientMap: toonRamp});
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.03), tieMat); knot.position.set(0, TORSO - 0.02, TR * 0.8);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.27, 0.014), tieMat); tie.position.set(0, TORSO - 0.18, TR * 0.86);
    chest.add(knot, tie); extras.push(knot, tie); }
  if (O.card) { const card = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.008), new THREE.MeshToonMaterial({color: 0x2f6fb5, gradientMap: toonRamp})); card.position.set(0.075, TORSO - 0.17, TR * 0.8); chest.add(card); extras.push(card); }
  if (O.badge) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 6), new THREE.MeshStandardMaterial({color: 0xd9b44a, metalness: 0.6, roughness: 0.35})); b.rotation.x = Math.PI / 2; b.position.set(0.07, TORSO - 0.1, TR * 0.85); chest.add(b);
    const name = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.006), new THREE.MeshToonMaterial({color: 0xe8e2d0, gradientMap: toonRamp})); name.position.set(-0.07, TORSO - 0.1, TR * 0.85); chest.add(name); }
  if (O.belt) { const belt = new THREE.Mesh(new THREE.TorusGeometry(TR * 1.02, 0.012, 6, 24), new THREE.MeshToonMaterial({color: 0x4a3322, gradientMap: toonRamp})); belt.rotation.x = Math.PI / 2; belt.scale.set(1.08, 0.82, 1); belt.position.y = 0.04; chest.add(belt); }
  const neck = new THREE.Group(); neck.position.y = TORSO + 0.035; chest.add(neck);
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 10), toonBody); neck.add(m); }
  const head = new THREE.Group(); head.position.y = HR + 0.01; neck.add(head);
  const skullG = inked(new THREE.SphereGeometry(HR, 40, 30), toonWhite, INK, head); skullG.scale.set(1, 1.04, 0.96); skullG.userData.ol.scale.setScalar((HR + INK) / HR);
  const EZ = HR * 0.93; const eyeMat = new THREE.MeshBasicMaterial({color: 0x0a0a0a});
  const eyes = [-0.045, 0.045].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 12), eyeMat); e.position.set(x, 0.02, EZ); head.add(e); return e; });
  const pupils = eyes.map(e => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), new THREE.MeshBasicMaterial({color: 0xffffff})); p.position.set(0.006, 0.01, 0.02); e.add(p); return p; });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), eyeMat); mouth.position.set(0, -0.055, EZ - 0.006); head.add(mouth);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.005, 6, 16), eyeMat); mouthO.position.set(0, -0.058, EZ - 0.004); head.add(mouthO);
  const mouthF = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 16, Math.PI * 0.8), eyeMat); mouthF.position.set(0, -0.075, EZ - 0.012); mouthF.rotation.z = Math.PI * 0.1; head.add(mouthF);
  const brows = [-0.045, 0.045].map(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.01), eyeMat); b.position.set(x, 0.062, EZ - 0.01); head.add(b); return b; });
  if (O.cap) { const capMat = new THREE.MeshToonMaterial({color: 0x1f2d4f, gradientMap: toonRamp});
    const cap = inked(new THREE.CylinderGeometry(HR * 0.98, HR * 1.06, 0.09, 28), capMat, INK, head); cap.position.y = HR * 0.72; cap.userData.ol.scale.set(1.07, 1.12, 1.07);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(HR * 0.8, HR * 0.8, 0.014, 20, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshToonMaterial({color: 0x121b33, gradientMap: toonRamp})); brim.rotation.y = Math.PI; brim.position.set(0, HR * 0.5, HR * 0.55); head.add(brim);
    const emb = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), new THREE.MeshStandardMaterial({color: 0xd9b44a, metalness: 0.6, roughness: 0.4})); emb.position.set(0, HR * 0.75, HR * 1.02); head.add(emb); }
  if (O.mustache) { const ms = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.055, 4, 8), eyeMat); ms.rotation.z = Math.PI / 2; ms.position.set(0, -0.032, EZ + 0.002); ms.scale.set(1, 1, 0.6); head.add(ms); }
  const mkArm = side => { const sh = new THREE.Group(); sh.position.set(side * TR * 1.08, TORSO - 0.06, 0); chest.add(sh);
    const up = capsuleInked(UPPER, LR); sh.add(up); const el = new THREE.Group(); el.position.y = -UPPER; up.add(el);
    const fo = capsuleInked(FORE, LR * 0.95); el.add(fo); const wr = new THREE.Group(); wr.position.y = -FORE; fo.add(wr);
    const glove = new THREE.Group(); wr.add(glove);
    const palm = inked(new THREE.SphereGeometry(0.062, 18, 14), toonWhite, INK, glove); palm.position.y = -0.045; palm.scale.set(1, 1.1, 0.8); palm.userData.ol.scale.setScalar(1.17);
    const th = inked(new THREE.SphereGeometry(0.023, 10, 8), toonWhite, INK, glove); th.position.set(side * -0.05, -0.03, 0.022); th.userData.ol.scale.setScalar(1.45);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 16), toonWhite); cuff.rotation.x = Math.PI / 2; glove.add(cuff);
    const finger = inked(new THREE.CapsuleGeometry(0.016, 0.05, 4, 8), toonWhite, INK, glove); finger.position.set(0, -0.115, 0.0); finger.userData.ol.scale.setScalar(1.6); finger.visible = false;
    return {sh, el, wr, glove, finger}; };
  const L = mkArm(1), R = mkArm(-1);
  const mkLeg = side => { const hp = new THREE.Group(); hp.position.set(side * TR * 0.62, 0, 0); hips.add(hp);
    const th = capsuleInked(THIGH, LR * 1.08); hp.add(th); const kn = new THREE.Group(); kn.position.y = -THIGH; th.add(kn);
    const sh = capsuleInked(SHIN, LR); kn.add(sh);
    const ank = new THREE.Group(); ank.position.y = -SHIN; sh.add(ank);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.07, 4, 10), toonBody); foot.rotation.x = Math.PI / 2; foot.scale.set(1.15, 1, 0.75); foot.position.set(0, -0.02, 0.045); foot.castShadow = true; ank.add(foot);
    return {hp, kn, ank}; };
  const LL = mkLeg(1), RL = mkLeg(-1);
  let blinkSeed = Math.random() * 10;
  function pose(p, t = 0) {
    const P = Object.assign({la: [0.05, 0.1], le: 0.15, ra: [0.05, 0.1], re: 0.15, ll: [0, 0.02], lk: 0, rl: [0, 0.02], rk: 0,
      head: [0, 0], roll: 0, lean: 0, twist: 0, eyes: 1, look: [0, 0], mouth: 'flat', brow: 0, hipY: 0, point: 0, blink: true, breathe: 1}, p);
    L.sh.rotation.set(-P.la[0], 0, P.la[1]); L.el.rotation.set(-P.le, 0, 0);
    R.sh.rotation.set(-P.ra[0], 0, -P.ra[1]); R.el.rotation.set(-P.re, 0, 0);
    LL.hp.rotation.set(-P.ll[0], 0, P.ll[1]); LL.kn.rotation.set(P.lk, 0, 0); LL.ank.rotation.set(P.ll[0] - P.lk * 0.6, 0, 0);
    RL.hp.rotation.set(-P.rl[0], 0, -P.rl[1]); RL.kn.rotation.set(P.rk, 0, 0); RL.ank.rotation.set(P.rl[0] - P.rk * 0.6, 0, 0);
    const br = Math.sin(t * 1.7) * P.breathe;
    torso.rotation.set(P.lean + br * 0.012, P.twist, 0); hips.position.y = HIP_Y + P.hipY; chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.015);
    neck.rotation.set(-P.head[1], P.head[0], P.roll);
    // blink: ~every 3.2 s, 0.13 s long (deterministic in t)
    const cyc = (t + blinkSeed) % 3.2, bl = P.blink && cyc < 0.13 ? Math.sin(cyc / 0.13 * Math.PI) : 0;
    eyes.forEach(e => { e.scale.set(0.8 * (0.85 + 0.15 * P.eyes), Math.max(0.08, 1.15 * P.eyes * (1 - bl)), 0.45); e.position.x = Math.sign(e.position.x) * 0.045 + P.look[0] * 0.015; e.position.y = 0.02 + P.look[1] * 0.015; });
    pupils.forEach(p => p.visible = P.eyes > 1.15 && bl < 0.5);
    mouth.visible = P.mouth === 'flat'; mouthO.visible = P.mouth === 'o'; mouthF.visible = P.mouth === 'frown';
    brows.forEach((b, i) => { b.visible = Math.abs(P.brow) > 0.01; b.rotation.z = (i ? -1 : 1) * P.brow * 0.5; b.position.y = 0.062 + Math.abs(P.brow) * 0.012; });
    L.finger.visible = P.point > 0.5;
  }
  pose({});
  return {root, pose, head, torso, chest, L, R, LL, RL, extras, setBlinkSeed: s => blinkSeed = s};
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

// ---------- MINIMARKET SET ----------
// Layout (metres, y up): interior x -4..4, z -5.8 (back fridges) .. 4 (front glass).
// Aisles run along z at x = -2.4, -0.6, 1.2 (z -4.6..0.4). Counter front-left, self-checkout kiosk front-right facing -z.
const STORE = new THREE.Group(); scene.add(STORE);
const X0 = -4, X1 = 4, Z0 = -5.8, Z1 = 4, CEIL = 3.0;

function tileTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 205 + Math.floor(hash(i * 7 + j * 13) * 18); g.fillStyle = `rgb(${v},${v - 2},${v - 8})`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
    for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(60,55,45,${0.03 + hash(k) * 0.05})`; g.fillRect(hash(k * 3.3) * w, hash(k * 5.1) * h, 3, 3); }
    g.fillStyle = 'rgba(70,64,55,.55)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 2, 0, 4, h); g.fillRect(0, i * 128 - 2, w, 4); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 10); return t;
}
const floorMat = new THREE.MeshStandardMaterial({map: tileTex(), roughness: 0.35, metalness: 0.0});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); floor.receiveShadow = true; STORE.add(floor);
const wallMat = std(0xcfd3cf, {r: 0.9});
const ceilMat = std(0xbfc3c0, {r: 0.95});
box(X1 - X0, 0.05, Z1 - Z0, ceilMat, 0, CEIL, (Z0 + Z1) / 2, STORE, false);
box(0.1, CEIL, Z1 - Z0, wallMat, X0 - 0.05, CEIL / 2, (Z0 + Z1) / 2, STORE, false);
box(0.1, CEIL, Z1 - Z0, wallMat, X1 + 0.05, CEIL / 2, (Z0 + Z1) / 2, STORE, false);
box(X1 - X0, CEIL, 0.1, wallMat, 0, CEIL / 2, Z0 - 0.05, STORE, false);
// red brand stripe along walls (generic, no real brand)
const stripeMat = std(0xb3262a, {r: 0.7});
box(0.02, 0.22, Z1 - Z0, stripeMat, X0 + 0.01, 2.55, (Z0 + Z1) / 2, STORE, false);
box(0.02, 0.22, Z1 - Z0, stripeMat, X1 - 0.01, 2.55, (Z0 + Z1) / 2, STORE, false);

// fluorescent fixtures: rows along x; one tube (index FLICK) flickers
const tubeOn = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xf2f7ff, emissiveIntensity: 1.3});
const tubeOff = std(0x9aa0a3, {r: 0.4});
const tubes = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.16), tubeOn.clone()); m.position.set(-2.6 + c * 2.6, CEIL - 0.04, -4.6 + r * 2.4); STORE.add(m); tubes.push(m);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.04, 0.26), std(0xe8e8e4)); housing.position.copy(m.position); housing.position.y += 0.025; STORE.add(housing);
}
const FLICK = 10; // front-right tube near the kiosk
const storeHemi = new THREE.HemisphereLight(0xcfdcff, 0x3a3833, 0.16); STORE.add(storeHemi);
const ceilLights = [];
for (const [x, z] of [[-2.6, -3.4], [0, -3.4], [2.6, -3.4], [-2.6, 0.2], [0, 0.2], [2.6, 0.2], [-2.0, 2.8], [2.6, 2.6]]) {
  const p = new THREE.PointLight(0xeef4ff, 3.2, 6.5, 1.7); p.position.set(x, CEIL - 0.25, z); STORE.add(p); ceilLights.push(p);
}
const keyLight = new THREE.SpotLight(0xf4f7ff, 13, 12, 0.9, 0.6, 1.4); keyLight.position.set(1.2, CEIL - 0.1, 1.0); keyLight.target.position.set(2.2, 0, 2.6);
keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.bias = -0.0004; STORE.add(keyLight, keyLight.target);

// ---- shelves with product faces ----
const PROD_COLS = ['#c8322f', '#f2c230', '#2e7bc4', '#3a9b4a', '#e8742a', '#7b3fa0', '#f4f1e8', '#1d1d1d', '#d94c8a', '#2fb3b0'];
function productTex(seed) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#3c3f44'; g.fillRect(0, 0, w, h); let x = 4;
    while (x < w - 10) { const pw = 24 + Math.floor(hash(seed * 31 + x) * 30), ph = 60 + Math.floor(hash(seed * 17 + x * 3) * 58);
      const col = PROD_COLS[Math.floor(hash(seed * 7 + x * 1.3) * PROD_COLS.length)];
      const n = 1 + Math.floor(hash(seed + x) * 3);
      for (let k = 0; k < n && x < w - 10; k++) { g.fillStyle = col; g.fillRect(x, h - ph, pw, ph - 2);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, h - ph + 8, pw - 6, 6); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + pw - 4, h - ph, 4, ph - 2); x += pw + 2; }
      x += 3; }
    g.fillStyle = '#e9e4d6'; g.fillRect(0, h - 12, w, 12); // price rail
    g.fillStyle = '#d23a2f'; for (let i = 0; i < 6; i++) g.fillRect(20 + i * 86, h - 11, 26, 9);
  });
}
const shelfMetal = std(0xd8dad8, {r: 0.6, m: 0.2});
function gondola(x, z0, z1, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, (z0 + z1) / 2); STORE.add(g); const L = z1 - z0;
  box(0.08, 1.75, L, shelfMetal, 0, 0.875, 0, g); box(0.62, 0.12, L, std(0x8e9296), 0, 0.06, 0, g);
  for (const side of [-1, 1]) for (let lv = 0; lv < 4; lv++) {
    const y = 0.18 + lv * 0.4; box(0.27, 0.025, L, shelfMetal, side * 0.17, y, 0, g, false);
    const tex = productTex(seed * 10 + lv * 2 + (side > 0 ? 1 : 0)); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(L / 1.6, 1);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.36), new THREE.MeshStandardMaterial({map: tex, roughness: 0.7}));
    face.rotation.y = side * Math.PI / 2; face.position.set(side * 0.29, y + 0.19, 0); g.add(face);
    box(0.24, 0.3, L - 0.05, std(0x6a6e73), side * 0.15, y + 0.17, 0, g, false); // product mass behind faces
  }
  // end cap sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({map: canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#b3262a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 44px Nunito'; c.textAlign = 'center'; c.fillText(['MAKANAN', 'MINUMAN', 'SNACK'][seed % 3], w / 2, 64); })}));
  sign.position.set(0, 2.0, L / 2 + 0.01); g.add(sign); sign.userData.redraw = true;
  return g;
}
const gondolas = [gondola(-2.4, -4.6, 0.4, 1), gondola(-0.6, -4.6, 0.4, 2), gondola(1.2, -4.6, 0.4, 3)];
// right wall shelf
{ const g = new THREE.Group(); g.position.set(X1 - 0.2, 0, -2.1); STORE.add(g);
  for (let lv = 0; lv < 5; lv++) { const y = 0.2 + lv * 0.38; box(0.32, 0.025, 4.8, shelfMetal, 0, y, 0, g, false);
    const tex = productTex(70 + lv); tex.repeat.set(3, 1); const f = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.34), new THREE.MeshStandardMaterial({map: tex, roughness: 0.7}));
    f.rotation.y = -Math.PI / 2; f.position.set(-0.16, y + 0.18, 0); g.add(f); } }

// ---- drinks fridges (back wall) ----
const fridgeTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#0f1a24'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 5; r++) { const y = 20 + r * 98; g.fillStyle = '#d6e6f2'; g.fillRect(0, y + 86, w, 4);
    for (let i = 0; i < 9; i++) { const col = ['#c8322f', '#2e7bc4', '#3a9b4a', '#f2c230', '#e8e8e8', '#e8742a'][Math.floor(hash(r * 9 + i) * 6)];
      const bx = 8 + i * 27; g.fillStyle = col; g.fillRect(bx, y + 22, 18, 64); g.beginPath(); g.moveTo(bx + 4, y + 22); g.lineTo(bx + 7, y + 6); g.lineTo(bx + 11, y + 6); g.lineTo(bx + 14, y + 22); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(bx + 3, y + 30, 3, 48); } }
});
const fridgeGlow = new THREE.MeshStandardMaterial({map: fridgeTex, emissive: 0xffffff, emissiveMap: fridgeTex, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1});
for (let i = 0; i < 6; i++) { const x = -3.3 + i * 1.32;
  box(1.28, 2.25, 0.7, std(0x2a2e33, {r: 0.5, m: 0.3}), x, 1.125, Z0 + 0.35, STORE);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.95), fridgeGlow); d.position.set(x, 1.12, Z0 + 0.71); STORE.add(d);
  box(0.03, 0.5, 0.04, steel, x + 0.48, 1.15, Z0 + 0.74, STORE, false); }
const fridgeFill = new THREE.PointLight(0x9fd0ff, 3, 6, 1.5); fridgeFill.position.set(0, 1.3, Z0 + 1.4); STORE.add(fridgeFill);

// ---- front glass + night outside ----
const nightTex = canvasTex(512, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05070d'); gr.addColorStop(0.7, '#0b1220'); gr.addColorStop(1, '#16181a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,190,90,.8)'; g.beginPath(); g.arc(380, 120, 5, 0, 7); g.fill(); // distant street lamp
  const lg = g.createRadialGradient(380, 120, 2, 380, 120, 60); lg.addColorStop(0, 'rgba(255,180,90,.35)'); lg.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = lg; g.fillRect(300, 50, 160, 140);
  g.fillStyle = '#0a0c0f'; g.fillRect(0, 200, w, 56);
});
const glassMat = new THREE.MeshStandardMaterial({map: nightTex, emissive: 0xffffff, emissiveMap: nightTex, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.4});
const frontWall = new THREE.Group(); frontWall.position.z = Z1; STORE.add(frontWall);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 2.4), glassMat); glass.rotation.y = Math.PI; glass.position.set(0, 1.3, 0.02); frontWall.add(glass);
box(X1 - X0, 0.1, 0.1, steelDark, 0, 0.05, 0, frontWall, false); box(X1 - X0, 0.5, 0.1, wallMat, 0, CEIL - 0.25, 0, frontWall, false);
for (const x of [-4, -2.4, -0.4, 0.8, 2.4, 4]) box(0.07, 2.5, 0.08, steelDark, x, 1.25, 0, frontWall, false);
// auto door (two leaves, x -0.4..0.8)
const doorL = box(0.6, 2.3, 0.03, new THREE.MeshStandardMaterial({color: 0x223344, transparent: true, opacity: 0.35, roughness: 0.05}), -0.1, 1.15, -0.05, frontWall, false);
const doorR = box(0.6, 2.3, 0.03, doorL.material, 0.5, 1.15, -0.05, frontWall, false);
const openSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({map: canvasTex(300, 100, (g, w, h) => { g.fillStyle = '#120404'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3b30'; g.shadowColor = '#ff3b30'; g.shadowBlur = 14; g.font = '900 52px Nunito'; g.textAlign = 'center'; g.fillText('BUKA 24 JAM', w / 2, 68); })}));
openSign.position.set(-2.0, 2.15, -0.06); openSign.rotation.y = Math.PI; frontWall.add(openSign);

// ---- counter (front-left), cashier stands at z≈3.25 facing -z ----
const COUNTER = new THREE.Group(); COUNTER.position.set(-2.3, 0, 2.6); STORE.add(COUNTER);
box(2.0, 0.95, 0.6, std(0xb3262a, {r: 0.6}), 0, 0.475, 0, COUNTER); box(2.1, 0.05, 0.7, std(0xe9e6de, {r: 0.4}), 0, 0.975, 0, COUNTER);
box(0.36, 0.12, 0.3, std(0x2b2d30), 0.8, 1.06, 0.1, COUNTER); // register base
const regScreen = box(0.3, 0.2, 0.03, new THREE.MeshStandardMaterial({color: 0x10243a, emissive: 0x2a6fb0, emissiveIntensity: 0.6}), 0.8, 1.25, 0.02, COUNTER); regScreen.rotation.x = -0.25;
// cigarette/back shelf behind cashier
box(2.0, 1.4, 0.3, std(0x3b3e43), 0, 1.5, 1.2, COUNTER); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.34), new THREE.MeshStandardMaterial({map: productTex(90 + i), roughness: 0.7})); f.rotation.y = Math.PI; f.position.set(0, 1.0 + i * 0.42, 1.04); COUNTER.add(f); }
// CCTV monitor on the counter (render-target feed assigned in 25-cctv)
const monBody = box(0.46, 0.34, 0.08, std(0x1a1b1d, {r: 0.5}), -0.55, 1.2, 0.12, COUNTER); monBody.rotation.y = 0.35;
box(0.05, 0.2, 0.05, std(0x1a1b1d), -0.55, 1.05, 0.15, COUNTER);
const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({color: 0x222222})); monScreen.position.set(0, 0, -0.041); monScreen.rotation.y = Math.PI; monBody.add(monScreen);

// ---- digital wall clock (above counter, on left wall) ----
const clockTex = canvasTex(256, 96, () => {});
function drawClock(s) { if (clockTex.userData.s === s) return; clockTex.userData.s = s; const g = clockTex.userData.g, w = 256, h = 96;
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.font = '700 70px "Courier New"'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,40,30,.12)'; g.fillText('88:88', w / 2, 72);
  g.fillStyle = '#ff3a2a'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 12; g.fillText(s, w / 2, 72); g.shadowBlur = 0; clockTex.needsUpdate = true; }
const wallClock = new THREE.Group(); wallClock.position.set(X0 + 0.06, 2.25, 1.4); wallClock.rotation.y = Math.PI / 2; STORE.add(wallClock);
box(0.62, 0.26, 0.05, std(0x141414), 0, 0, 0, wallClock, false);
const clockFace = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.2), new THREE.MeshBasicMaterial({map: clockTex})); clockFace.position.z = 0.03; wallClock.add(clockFace);
const clockGlow = new THREE.PointLight(0xff3020, 0, 1.4, 2); clockGlow.position.set(X0 + 0.3, 2.25, 1.4); STORE.add(clockGlow);
// ceiling CCTV dome above kiosk area (visible prop; the feed camera sits here)
const camDome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x222428, {r: 0.2, m: 0.3})); camDome.rotation.x = Math.PI; camDome.position.set(3.6, CEIL - 0.02, 3.6); STORE.add(camDome);

// ---------- SELF-CHECKOUT KIOSK ----------
// World position (2.7, 0, 2.5), front faces -z. Local +x = bagging area (customer's right).
const KIOSK = new THREE.Group(); KIOSK.position.set(2.7, 0, 2.5); KIOSK.rotation.y = Math.PI; STORE.add(KIOSK);
const kWhite = std(0xeeeeea, {r: 0.45}), kGrey = std(0x34373b, {r: 0.5, m: 0.2}), kRed = std(0xb3262a, {r: 0.55});
box(0.56, 0.92, 0.46, kWhite, 0, 0.46, 0, KIOSK); box(0.56, 0.12, 0.47, kRed, 0, 0.82, 0.001, KIOSK, false);
box(0.6, 0.05, 0.5, kGrey, 0, 0.945, 0, KIOSK); // scanner deck
const scanGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({color: 0x101418, emissive: 0xff2010, emissiveIntensity: 0.25, roughness: 0.05})); scanGlass.rotation.x = -Math.PI / 2; scanGlass.position.set(0, 0.972, 0.02); KIOSK.add(scanGlass);
box(0.08, 0.42, 0.08, kGrey, 0, 1.17, -0.17, KIOSK); // screen neck
const head = new THREE.Group(); head.position.set(0, 1.42, -0.12); head.rotation.x = -0.32; KIOSK.add(head);
box(0.52, 0.4, 0.06, kGrey, 0, 0, 0, head);
const screenTex = canvasTex(512, 384, () => {});
const screenMat = new THREE.MeshStandardMaterial({color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.0, roughness: 0.25});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.345), screenMat); screen.position.z = 0.031; head.add(screen);
const screenGlow = new THREE.PointLight(0xffd28a, 0, 2.2, 1.8); screenGlow.position.set(0, 1.45, 0.35); KIOSK.add(screenGlow);
// status lamp pole
box(0.025, 0.5, 0.025, kGrey, -0.22, 1.85, -0.18, KIOSK, false);
const lampMat = new THREE.MeshStandardMaterial({color: 0x330808, emissive: 0xff2010, emissiveIntensity: 0});
const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 16), lampMat); lamp.position.set(-0.22, 2.14, -0.18); KIOSK.add(lamp);
const lampLight = new THREE.PointLight(0xff2a1a, 0, 3.2, 1.6); lampLight.position.set(-0.22, 2.1, 0); KIOSK.add(lampLight);
// "BARU!" sticker
const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffd400'; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 54 : 64; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#b3262a'; g.font = '900 34px Nunito'; g.textAlign = 'center'; g.fillText('BARU!', w / 2, h / 2 + 12); }), roughness: 0.6}));
sticker.position.set(-0.13, 0.62, 0.232); sticker.rotation.z = 0.2; KIOSK.add(sticker);
// receipt slot + paper
box(0.16, 0.03, 0.03, std(0x111111), 0.13, 1.06, 0.15, KIOSK, false);
const receiptTex = canvasTex(160, 400, () => {});
const receipt = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.275), new THREE.MeshStandardMaterial({map: receiptTex, roughness: 0.8, side: THREE.DoubleSide}));
const receiptPivot = new THREE.Group(); receiptPivot.position.set(0.13, 1.07, 0.16); KIOSK.add(receiptPivot); receiptPivot.add(receipt); receipt.visible = false;
function setReceipt(k) { // k 0..1 = how far it has printed out
  receipt.visible = k > 0.01; const L = 0.275 * k; receipt.scale.y = Math.max(0.001, k); receipt.position.set(0, L / 2, 0.005); receipt.rotation.x = -0.15 - 0.25 * k;
  receipt.material.map.offset.y = 1 - k; receipt.material.map.repeat.y = k; }
receiptTex.wrapT = THREE.ClampToEdgeWrapping;
function drawReceipt() { const g = receiptTex.userData.g, w = 160, h = 400; g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#222'; g.textAlign = 'center'; g.font = '700 15px "Courier New"'; g.fillText('MINIMARKET 24 JAM', w / 2, 30); g.font = '12px "Courier New"'; g.fillText('KASIR MANDIRI #01', w / 2, 48); g.fillText('03:07', w / 2, 64);
  g.fillText('- - - - - - - - - -', w / 2, 86); g.textAlign = 'left'; g.font = '700 14px "Courier New"'; g.fillText('1 x PENJAGA', 12, 118); g.fillText('    MALAM', 12, 136);
  g.textAlign = 'right'; g.fillText('68,0 kg', w - 10, 160); g.textAlign = 'center'; g.font = '12px "Courier New"'; g.fillText('- - - - - - - - - -', w / 2, 186);
  g.font = '900 30px "Courier New"'; g.fillText('LUNAS', w / 2, 232); g.font = '12px "Courier New"'; g.fillText('TERIMA KASIH', w / 2, 270); g.fillText('JANGAN LUPA', w / 2, 300); g.fillText('BARANG ANDA', w / 2, 316);
  for (let i = 0; i < 36; i++) g.fillRect(24 + i * 3.2, 340, hash(i) > 0.4 ? 2 : 1, 34); receiptTex.needsUpdate = true; }
// bagging area (customer's right) with scale plate, bag rack and LED weight display
const BAG = new THREE.Group(); BAG.position.set(0.58, 0, 0); KIOSK.add(BAG);
box(0.56, 0.74, 0.46, kWhite, 0, 0.37, 0, BAG); box(0.56, 0.05, 0.46, kRed, 0, 0.72, 0, BAG, false);
const scalePlate = box(0.5, 0.03, 0.4, std(0xb9bec2, {r: 0.3, m: 0.6}), 0, 0.77, 0, BAG);
for (const x of [-0.24, 0.24]) box(0.02, 0.5, 0.02, steel, x, 1.02, -0.18, BAG, false);
box(0.5, 0.02, 0.02, steel, 0, 1.27, -0.18, BAG, false);
const ledTex = canvasTex(256, 80, () => {});
function drawScale(kg, alert = false) { const s = kg == null ? '--,- kg' : kg.toFixed(1).replace('.', ',') + ' kg'; const key = s + alert; if (ledTex.userData.k === key) return; ledTex.userData.k = key;
  const g = ledTex.userData.g, w = 256, h = 80; g.fillStyle = '#0b0606'; g.fillRect(0, 0, w, h); g.font = '700 50px "Courier New"'; g.textAlign = 'right';
  g.fillStyle = kg == null ? '#2a3a2e' : alert ? '#ff3a2a' : '#7dff9a'; g.shadowColor = g.fillStyle; g.shadowBlur = 10; g.fillText(s, w - 12, 58); g.shadowBlur = 0; ledTex.needsUpdate = true; }
const led = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.075), new THREE.MeshBasicMaterial({map: ledTex})); led.position.set(0, 0.6, 0.232); BAG.add(led);
box(0.27, 0.1, 0.01, std(0x111111), 0, 0.6, 0.228, BAG, false);

// ---- screen states ----
// state: off | idle | alert | weight | continue | next | paid ; p = {kg, blink, k}
function drawScreen(state, p = {}) {
  const key = state + JSON.stringify(p); if (screenTex.userData.key === key) return; screenTex.userData.key = key;
  const g = screenTex.userData.g, w = 512, h = 384; g.textAlign = 'center'; g.shadowBlur = 0;
  if (state === 'off') { g.fillStyle = '#050607'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); screenTex.needsUpdate = true; return; }
  g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3262a'; g.fillRect(0, 0, w, 54); g.fillStyle = '#fff'; g.font = '900 26px Nunito'; g.fillText('KASIR MANDIRI', w / 2, 37);
  const wrap = (txt, y, size, col, lh = 1.18) => { g.fillStyle = col; g.font = `900 ${size}px Nunito`; const words = txt.split(' '); let line = '', ly = y;
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 60) { g.fillText(line, w / 2, ly); line = wd; ly += size * lh; } else line = t; } g.fillText(line, w / 2, ly); };
  if (state === 'idle') { wrap('Selamat datang', 150, 44, '#222'); wrap('Sentuh layar untuk mulai', 220, 28, '#666'); }
  if (state === 'alert' || state === 'weight') {
    const on = p.blink === undefined || p.blink; g.fillStyle = on ? '#ffb300' : '#f7d27a'; g.fillRect(0, 54, w, 64); g.fillStyle = '#2a1a00'; g.font = '900 30px Nunito'; g.fillText('⚠ PERHATIAN', w / 2, 98);
    if (state === 'alert') { wrap('Ada barang tidak dikenal di area kemasan.', 180, 38, '#222');
      g.strokeStyle = '#b3262a'; g.lineWidth = 6; g.strokeRect(196, 270, 120, 70); g.fillStyle = '#b3262a'; g.font = '900 54px Nunito'; g.fillText('!', w / 2, 325); }
    else { g.fillStyle = '#555'; g.font = '800 24px Nunito'; g.fillText('BERAT DI AREA KEMASAN', w / 2, 162);
      g.fillStyle = '#b3262a'; g.font = '900 96px Nunito'; g.fillText(p.kg.toFixed(1).replace('.', ',') + ' kg', w / 2, 262);
      g.fillStyle = p.press ? '#7a1a1c' : '#b3262a'; g.fillRect(40, 300, 200, 60); g.fillStyle = '#d9d6cf'; g.fillRect(272, 300, 200, 60);
      g.fillStyle = '#fff'; g.font = '900 28px Nunito'; g.fillText('BATAL', 140, 340); g.fillStyle = '#333'; g.fillText('BANTUAN', 372, 340); }
  }
  if (state === 'continue') { wrap('Silakan lanjutkan belanja Anda.', 170, 44, '#222'); g.fillStyle = '#3a9b4a'; g.font = '900 64px Nunito'; g.fillText('✓', w / 2, 320); }
  if (state === 'next') { wrap('Pelanggan berikutnya', 160, 46, '#222'); g.fillStyle = '#555'; g.font = '800 26px Nunito'; g.fillText(`Antrean: ${p.n ?? 0}`, w / 2, 290); }
  if (state === 'paid') { g.fillStyle = '#3a9b4a'; g.fillRect(0, 54, w, 64); g.fillStyle = '#fff'; g.font = '900 34px Nunito'; g.fillText('LUNAS', w / 2, 98);
    wrap('1 × Penjaga malam', 178, 40, '#222'); g.fillStyle = '#b3262a'; g.font = '900 64px Nunito'; g.fillText('68,0 kg', w / 2, 300); }
  screenTex.needsUpdate = true;
}
function kioskLamp(v) { lampMat.emissiveIntensity = 3 * v; lampLight.intensity = 3.5 * v; }

// ---------- CAST ----------
// Bayu: night clerk — red store vest over dark body, name tag, no tie.
function addVest(actor, color = 0xb3262a) {
  const vm = new THREE.MeshToonMaterial({color, gradientMap: toonRamp});
  const geo = new THREE.CylinderGeometry(0.074, 0.068, 0.32, 20);
  const v = new THREE.Mesh(geo, vm); v.position.y = 0.26; v.scale.set(1.08, 1, 0.84); actor.chest.add(v);
  const ol = new THREE.Mesh(geo.clone(), inkMat); ol.position.copy(v.position); ol.scale.set(1.1, 1.02, 0.9); actor.chest.add(ol);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.006), new THREE.MeshToonMaterial({color: 0xf2efe6, gradientMap: toonRamp})); tag.position.set(0.05, 0.34, 0.066); actor.chest.add(tag);
  return v;
}
const bayu = makeStick({tie: false, card: false}); scene.add(bayu.root); addVest(bayu); bayu.setBlinkSeed(1.3);
// queue ghosts (seen only through CCTV): three shoppers + one in Bayu's vest
const ghosts = [0, 1, 2, 3].map(i => { const a = makeStick({tie: i === 1, card: i === 1}); if (i === 3) addVest(a); a.setBlinkSeed(i * 0.7); scene.add(a.root); a.root.visible = false; return a; });
ghosts[0].chest.children[0].material = new THREE.MeshToonMaterial({color: 0x3b4a5c, gradientMap: toonRamp});

// ---------- CCTV FEED (render target shown on the counter monitor and as full-frame CCTV shots) ----------
const cctvCam = new THREE.PerspectiveCamera(62, 4 / 3, 0.05, 40); cctvCam.position.set(3.55, CEIL - 0.12, 3.55); cctvCam.lookAt(2.2, 0.6, 0.6);
const cctvRT = new THREE.WebGLRenderTarget(320, 240, {colorSpace: THREE.SRGBColorSpace});
monScreen.material = new THREE.ShaderMaterial({uniforms: {map: {value: cctvRT.texture}, uTime: {value: 0}, uOn: {value: 1}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D map; uniform float uTime, uOn; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(.3,.59,.11)); l = (l-.5)*1.3+.55; l *= .85+.15*sin(vUv.y*480.0);
      l += (h(vUv*vec2(320.,240.)+floor(uTime*24.))-.5)*.12; gl_FragColor = vec4(vec3(l*.9,l*1.05,l*.92)*uOn, 1.0); }`});
// what the CCTV sees can differ from reality: ghosts are visible only to cctvCam (layer 1)
for (const gh of ghosts) gh.root.traverse(o => o.layers.set(1));
cctvCam.layers.enable(0); cctvCam.layers.enable(1);
let cctvLive = false;
function renderCCTV() { if (!cctvLive) return; const fog = scene.fog; renderer.setRenderTarget(cctvRT); renderer.render(scene, cctvCam); renderer.setRenderTarget(null); scene.fog = fog; }

// ---------- SHOTS ----------
function cam(pos, look, fov = 45, shake = 0.006, t = 0) {
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos);
  if (shake) camera.position.add(V((noise1(t * 0.7) - 0.5) * shake, (noise1(t * 0.6 + 40) - 0.5) * shake, (noise1(t * 0.5 + 80) - 0.5) * shake));
  camera.lookAt(look);
}
const CTR_POS = V(-2.0, 0, 3.25); // Bayu behind the counter (faces -z)
const BAG_SPOT = V(2.12, 0, 1.93); // standing in front of the bagging area (faces +z)
let fx = {cctv: 0, ca: 1, vig: 1};
const TUBE_OFF = [1, 3, 5, 8], LIGHT_OFF = [1, 3]; // night mode: half the store is dark
function resetAll() {
  fx = {cctv: 0, ca: 1, vig: 1}; cctvLive = false; cctvEl.style.display = 'none'; fadeEl.style.opacity = 0; endEl.style.opacity = 0;
  ghosts.forEach(g => g.root.visible = false); bayu.root.visible = true; bayu.root.position.copy(CTR_POS); bayu.root.rotation.set(0, Math.PI, 0);
  drawScreen('off'); kioskLamp(0); screenGlow.intensity = 0; drawScale(null); setReceipt(0);
  tubes.forEach((m, i) => m.material.emissiveIntensity = TUBE_OFF.includes(i) ? 0.04 : 1.3); ceilLights.forEach((l, i) => l.intensity = LIGHT_OFF.includes(i) ? 0.4 : 3.2); keyLight.intensity = 13; storeHemi.intensity = 0.16;
  drawClock('02:59'); clockGlow.intensity = 0.4; doorL.position.x = -0.1; doorR.position.x = 0.5;
  scene.background.set(0x07080a); scene.fog.color.set(0x0b0d10); scene.fog.density = 0.05;
}
// one tube near the kiosk buzzes/flickers on a deterministic pattern
function flicker(t, amt = 1) { const n = noise1(t * 9) > 0.78 || (t % 4.1) < 0.12 ? 0.15 : 1; tubes[FLICK].material.emissiveIntensity = lerp(1.3, 1.3 * n, amt); ceilLights[7].intensity = lerp(3.2, 3.2 * n, amt); }
const blink = (t, rate = 2) => Math.floor(t * rate) % 2 === 0;

const shots = [
  {name: 'kiosk-alert', t0: 0, t1: 3.95, f(t) { flicker(t);
    drawScreen('alert', {blink: blink(t, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(blink(t, 2.4) ? 1 : 0.25); bayu.root.visible = false;
    const k = seg(t, 0, 3.95); cam(V(2.0, 1.2, 0.85).lerp(V(2.15, 1.22, 1.15), k), V(2.62, 1.5, 2.45), 44, 0.008, t); }},
  {name: 'aisle-empty', t0: 3.95, t1: 7.5, f(t) { flicker(t, 1);
    drawScreen('off'); bayu.root.visible = false;
    const k = seg(t, 3.95, 7.5); cam(V(0.3, 1.55, -4.9).lerp(V(0.3, 1.45, -3.6), k), V(0.3, 1.05, 3.5), 50, 0.006, t); }},
  {name: 'bayu-counter', t0: 7.5, t1: 10.4, f(t) { cctvLive = true;
    const yawn = seg(t, 8.0, 8.5) * (1 - seg(t, 9.2, 9.7));
    bayu.pose({la: [lerp(0.6, 2.6, yawn), lerp(0.35, 0.5, yawn)], le: lerp(1.3, 0.4, yawn), ra: [lerp(0.6, 2.6, yawn), lerp(0.35, 0.5, yawn)], re: lerp(1.3, 0.4, yawn),
      head: [0, -0.1 - 0.25 * yawn], mouth: yawn > 0.3 ? 'o' : 'flat', eyes: lerp(0.75, 0.35, yawn), lean: 0.12 * (1 - yawn)}, t);
    cam(V(-2.3, 1.45, 1.45).lerp(V(-2.25, 1.43, 1.7), seg(t, 7.5, 10.4)), V(-2.0, 1.3, 3.15), 42, 0.006, t); }},
  {name: 'kiosk-new', t0: 10.4, t1: 13.4, f(t) { flicker(t, 0.4); drawScreen('idle'); screenGlow.intensity = 0.9; bayu.root.visible = false;
    const k = seg(t, 10.4, 13.4); cam(V(1.75, 0.95, 1.05).lerp(V(2.25, 1.0, 1.45), k), V(2.82, 0.85, 2.3).lerp(V(2.74, 1.1, 2.45), k), 42, 0.005, t); }},
  {name: 'clock', t0: 13.4, t1: 16.4, f(t) { const on = t >= 15.15; drawClock(on ? '03:00' : '02:59'); clockGlow.intensity = on ? 0.9 : 0.4;
    const k = seg(t, 13.4, 16.4); cam(V(-2.55, 2.0, 1.85).lerp(V(-2.85, 2.1, 1.6), k), V(-3.94, 2.2, 1.4), 44, 0.004, t); }},
  {name: 'kiosk-wake', t0: 16.4, t1: 18.4, f(t) { drawClock('03:00'); flicker(t); cctvLive = true;
    const on = t >= 16.62; drawScreen(on ? 'alert' : 'off', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = on ? 1.6 : 0; kioskLamp(on ? (blink(t - 16.62, 2.4) ? 1 : 0.25) : 0);
    const turn = seg(t, 16.9, 17.4);
    bayu.pose({la: [0.6, 0.35], le: 1.3, ra: [0.6, 0.35], re: 1.3, head: [lerp(0, 0.85, turn), -0.05], eyes: lerp(0.8, 1.35, turn), brow: 0.4 * turn, lean: 0.1}, t);
    cam(V(-3.25, 1.98, 2.95), V(1.6, 1.25, 2.55), 48, 0.005, t); }},
  {name: 'bayu-walk', t0: 18.4, t1: 20.25, f(t) { drawClock('03:00'); flicker(t);
    drawScreen('alert', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(blink(t - 16.62, 2.4) ? 1 : 0.25);
    const p0 = V(0.05, 0, 1.95), p1 = BAG_SPOT.clone(); const k = clamp((t - 18.4) / (19.85 - 18.4));
    const p = p0.clone().lerp(p1, k); bayu.root.position.copy(p);
    const strength = ease(k / 0.12) * ease((1 - k) / 0.12);
    const yaw = lerp(Math.PI / 2, 0, seg(t, 19.75, 20.2)); bayu.root.rotation.y = yaw;
    bayu.pose({...walkPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, 0.85 * strength), head: [0.35 * (1 - seg(t, 19.75, 20.2)), 0.05], eyes: 1.2, brow: 0.3}, t);
    cam(V(p.x - 0.35, 1.3, 0.62), V(p.x + 0.25, 1.0, 1.95), 60, 0.006, t); }},
  {name: 'bag-empty', t0: 20.25, t1: 21.65, f(t) { drawClock('03:00');
    drawScreen('alert', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(blink(t - 16.62, 2.4) ? 1 : 0.25);
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0;
    const wave = Math.sin((t - 20.3) * 7) * seg(t, 20.35, 20.6);
    bayu.pose({ra: [1.15, 0.15 + 0.25 * wave], re: 0.35, la: [0.1, 0.1], head: [0, 0.55], eyes: 1.25, brow: 0.35, lean: 0.22}, t);
    cam(V(2.3, 2.0, 3.25), V(2.12, 0.95, 2.1), 50, 0.004, t); }},
  {name: 'scale-12', t0: 21.65, t1: 24.6, f(t) { drawClock('03:00'); flicker(t, 0.6);
    const kg = 12 * ease((t - 22.55) / 0.75); const alertOn = t > 23.25;
    drawScreen('weight', {kg: Math.round(kg * 10) / 10}); drawScale(kg, alertOn); screenGlow.intensity = 1.7; kioskLamp(alertOn ? (blink(t, 3) ? 1 : 0.2) : 0.25);
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0; bayu.pose({ra: [0.3, 0.12], la: [0.1, 0.1], head: [-0.35, 0.25], eyes: 1.4, brow: 0.6, mouth: alertOn ? 'o' : 'flat'}, t);
    if (t < 23.6) { const k = seg(t, 21.65, 23.6); cam(V(2.6, 1.66, 1.74).lerp(V(2.64, 1.62, 1.88), k), V(2.7, 1.38, 2.62), 44, 0.003, t); }
    else { const k = seg(t, 23.6, 24.6); cam(V(2.45, 1.62, 3.15).lerp(V(2.4, 1.6, 3.0), k), V(2.12, 1.42, 1.93), 42, 0.004, t); } }},
];

// ---------- post-processing: bloom + chromatic aberration/vignette + CCTV mode ----------
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.26, 0.45, 0.93); composer.addPass(bloom);
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
setupEl.textContent = 'MINIMARKET KOSONG.';
payEl.innerHTML = 'TAPI ADA<span class="l2" style="font-size:96px;color:#f3ead8">YANG ANTRE.</span>';
let captions = [];
function overlay(t) {
  const showT = t < 3.9; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, 3.6, 3.88); setupEl.style.opacity = seg(t, 0.1, 0.35) * out;
    const pk = t - 1.6; payEl.style.opacity = (pk >= 0 ? 1 : 0) * out; payEl.style.transform = `scale(${pk >= 0 ? lerp(1.035, 1, clamp(pk / 0.2)) : 1.035})`;
    ruleEl.style.width = `${clamp((t - 1.7) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : ''; capEl.className = c && c.machine ? 'machine' : ''; capEl.style.opacity = c ? 1 : 0;
}
{ const g = $('grain').getContext('2d'); const im = g.createImageData(360, 640); let s = 7; for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '800 40px Nunito', '700 40px Nunito'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  // redraw canvas textures now that fonts are loaded
  scene.traverse(o => { const m = o.material; for (const mat of Array.isArray(m) ? m : m ? [m] : []) for (const k of ['map', 'emissiveMap']) { const t = mat[k]; if (t && t.userData && t.userData.draw && !t.userData.dynamic) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; } } });
  drawReceipt(); screenTex.userData.key = null; ledTex.userData.k = null; clockTex.userData.s = null;
  scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  resetAll();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  scene.updateMatrixWorld(true);
  monScreen.material.uniforms.uTime.value = t; renderCCTV();
  lookPass.uniforms.uCCTV.value = fx.cctv; lookPass.uniforms.uTime.value = t; lookPass.uniforms.uCA.value = fx.ca; lookPass.uniforms.uVig.value = fx.vig;
  composer.render();
  overlay(t);
  return s.name;
};
window.sceneReady = true;
