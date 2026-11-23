import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// RONDA MALAM — Three.js horror stickman renderer (rig shared with ABSEN / LANTAI 4 / KASIR MANDIRI).
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

// ---------- KAMPUNG SET ----------
// Gang runs along z: entrance/pos ronda near z=+4, "ujung gang" street lamp at z=-22. Path x -1.3..1.3.
const KAMPUNG = new THREE.Group(); scene.add(KAMPUNG);
const GZ0 = -26, GZ1 = 9;
function noiseTex(base, seed, w = 512, h = 512, specks = 900, rep = [1, 1]) {
  const t = concreteTex(base, w, h, seed); t.repeat.set(rep[0], rep[1]); t.anisotropy = 16; return t; }
// path (cor beton) + drains + ground
const pathMat = new THREE.MeshStandardMaterial({map: noiseTex('#6d6a63', 3, 512, 512, 900, [2, 14]), roughness: 0.92});
const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, GZ1 - GZ0), pathMat); path.rotation.x = -Math.PI / 2; path.position.set(0, 0, (GZ0 + GZ1) / 2); path.receiveShadow = true; KAMPUNG.add(path);
const soilMat = new THREE.MeshStandardMaterial({map: noiseTex('#3b3426', 7, 512, 512, 900, [6, 30]), roughness: 1});
for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(14, GZ1 - GZ0), soilMat); g.rotation.x = -Math.PI / 2; g.position.set(s * 8.3, -0.02, (GZ0 + GZ1) / 2); g.receiveShadow = true; KAMPUNG.add(g);
  box(0.25, 0.12, GZ1 - GZ0, std(0x2d2b27), s * 1.42, -0.04, (GZ0 + GZ1) / 2, KAMPUNG, false); } // drain gutters

// houses: plastered walls, tile roof, door, window (some with dim warm curtain)
const plaster = ['#b9b2a2', '#a7b0a8', '#c2b59b', '#9fa6ad', '#b8a89a'];
function house(side, z, w, seed, lit = false) {
  const g = new THREE.Group(); const x = side * (1.6 + 2.2); g.position.set(x, 0, z); KAMPUNG.add(g);
  const wallM = new THREE.MeshStandardMaterial({map: noiseTex(plaster[seed % plaster.length], seed, 512, 512, 900, [1, 1]), roughness: 0.95});
  const body = box(4.4, 2.7, w, wallM, 0, 1.35, 0, g); body.receiveShadow = true;
  // gable roof
  const roofM = std(0x5a2a1c, {r: 0.8});
  for (const s of [-1, 1]) { const r = box(2.6, 0.08, w + 0.5, roofM, s * 1.1, 3.2, 0, g); r.rotation.z = s * -0.5; }
  // facade facing the gang (local -side*x)
  const fx = -side * 2.205;
  const door = box(0.05, 1.95, 0.85, std(0x3a2a1e, {r: 0.7}), fx, 0.975, -w * 0.22, g, false);
  const winLit = lit ? new THREE.MeshStandardMaterial({color: 0x2a1a08, emissive: 0xffa040, emissiveIntensity: 0.55}) : std(0x0c0f14, {r: 0.2, m: 0.3});
  const win = box(0.04, 0.8, 1.0, winLit, fx, 1.55, w * 0.18, g, false);
  for (const dz of [-0.5, 0, 0.5]) box(0.06, 0.86, 0.04, std(0x3a2a1e), fx - side * 0.01, 1.55, w * 0.18 + dz, g, false);
  box(0.06, 0.04, 1.06, std(0x3a2a1e), fx - side * 0.01, 1.55, w * 0.18, g, false);
  // low fence/wall (pagar) in front
  box(0.12, 0.7, w, std(0x8f8a80), -side * 2.55, 0.35, 0, g);
  return g;
}
const houses = [];
let z = 7.5, k = 0;
while (z > GZ0 + 3) { const w = 4 + hash(k * 3) * 2.2; if (!(z < 6.5 && z > 1.5)) houses.push(house(-1, z - w / 2, w, k, hash(k * 7) > 0.7)); z -= w + 0.6; k++; }
z = 0.5; k = 20;
while (z > -14) { const w = 4 + hash(k * 3) * 2; houses.push(house(1, z - w / 2, w, k, hash(k * 5) > 0.75)); z -= w + 0.6; k++; }

// banana grove (kebun pisang) on the right near the end of the gang
const trunkM = new THREE.MeshStandardMaterial({color: 0x3c4a2a, roughness: 0.9});
const leafM = new THREE.MeshStandardMaterial({color: 0x2e4d22, roughness: 0.8, side: THREE.DoubleSide});
const leafDryM = new THREE.MeshStandardMaterial({color: 0x5a4a26, roughness: 0.9, side: THREE.DoubleSide});
const bananas = [];
function banana(x, z, h, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = hash(seed) * 6.28; KAMPUNG.add(g);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, h, 8), trunkM); tr.position.y = h / 2; tr.castShadow = true; g.add(tr);
  const n = 6 + Math.floor(hash(seed + 1) * 3);
  for (let i = 0; i < n; i++) { const piv = new THREE.Group(); piv.position.y = h; piv.rotation.y = i / n * 6.28 + hash(seed + i); g.add(piv);
    const dry = hash(seed * 3 + i) > 0.75; const L = 1.3 + hash(seed + i * 2) * 0.6;
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.42, 4, 1), dry ? leafDryM : leafM); lf.position.x = L / 2; lf.castShadow = true;
    const pos = lf.geometry.attributes.position; for (let v = 0; v < pos.count; v++) { const px = pos.getX(v) + L / 2; pos.setY(v, pos.getY(v) - px * px * (dry ? 0.5 : 0.22)); } lf.geometry.computeVertexNormals();
    const tilt = new THREE.Group(); tilt.rotation.z = dry ? -0.9 : 0.25 + hash(seed + i * 5) * 0.35; tilt.add(lf); lf.rotation.x = Math.PI / 2; piv.add(tilt); }
  bananas.push(g); return g;
}
for (let i = 0; i < 16; i++) banana(2.4 + hash(i * 9) * 5.5, -15 - hash(i * 4) * 10, 2.0 + hash(i * 2) * 1.4, i + 3);
for (let i = 0; i < 8; i++) banana(-2.6 - hash(i * 5) * 4, -23 - hash(i * 6) * 3, 2.0 + hash(i * 8) * 1.2, i + 40);
// bamboo fence along the grove
for (let zz = -14.5; zz > -25.5; zz -= 0.14) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0 + hash(zz * 10) * 0.15, 6), std(0x6b5a35)); b.position.set(1.75, 0.5, zz); b.castShadow = true; KAMPUNG.add(b); }

// street lamps: one near the pos, one at the end of the gang (the counting spot)
function lampPost(x, z, intensity) {
  const g = new THREE.Group(); g.position.set(x, 0, z); KAMPUNG.add(g);
  box(0.09, 4.2, 0.09, std(0x2b2b2b, {r: 0.6, m: 0.4}), 0, 2.1, 0, g); box(0.9, 0.06, 0.06, std(0x2b2b2b), -Math.sign(x) * 0.45, 4.15, 0, g);
  const bulbM = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffc070, emissiveIntensity: 2.0});
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), bulbM); bulb.position.set(-Math.sign(x) * 0.85, 4.05, 0); g.add(bulb);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.14, 16, 1, true), std(0x333333, {extra: {side: THREE.DoubleSide}})); shade.position.set(-Math.sign(x) * 0.85, 4.12, 0); g.add(shade);
  const L = new THREE.SpotLight(0xffc98a, intensity, 16, 1.05, 0.55, 1.5); L.position.set(x - Math.sign(x) * 0.85, 4.0, z); L.target.position.set(x - Math.sign(x) * 0.85, 0, z);
  KAMPUNG.add(L, L.target); return {g, L, bulbM};
}
const lampPos = lampPost(-1.55, 2.0, 26);
const lampEnd = lampPost(1.55, -21.0, 34); lampEnd.L.castShadow = true; lampEnd.L.shadow.mapSize.set(2048, 2048); lampEnd.L.shadow.bias = -0.0005; lampEnd.L.shadow.radius = 2;
lampPos.L.castShadow = true; lampPos.L.shadow.mapSize.set(1024, 1024); lampPos.L.shadow.bias = -0.0005;
const moon = new THREE.DirectionalLight(0x8fa6d8, 0.35); moon.position.set(-8, 14, 6); KAMPUNG.add(moon);
const nightHemi = new THREE.HemisphereLight(0x405070, 0x15120e, 0.22); KAMPUNG.add(nightHemi);
// sky dome + moon disc
const skyTex = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05070d'); gr.addColorStop(0.6, '#0c1424'); gr.addColorStop(1, '#141b27'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + hash(i) * 0.5})`; g.fillRect(hash(i * 3) * w, hash(i * 7) * h * 0.6, 1, 1); } });
const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.MeshBasicMaterial({map: skyTex, side: THREE.BackSide, fog: false})); KAMPUNG.add(sky);
const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({color: 0xdfe6f2, fog: false})); moonDisc.position.set(-14, 22, -40); moonDisc.lookAt(0, 0, 0); KAMPUNG.add(moonDisc);

// ---------- POS RONDA (wooden hut, right side of the entrance; door faces the gang, -x) ----------
const POS = new THREE.Group(); POS.position.set(2.75, 0, 4.0); KAMPUNG.add(POS);
const woodTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5b4026'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { const y = i * 32; g.fillStyle = `rgb(${80 + hash(i) * 30},${55 + hash(i) * 20},${32 + hash(i) * 10})`; g.fillRect(0, y + 1, w, 30);
    g.strokeStyle = 'rgba(30,18,8,.35)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, y + 4 + k * 4 + hash(i * 9 + k) * 3); g.bezierCurveTo(w * .3, y + hash(k) * 28, w * .6, y + 28 - hash(k + 3) * 20, w, y + 6 + k * 4); g.stroke(); } }
  g.fillStyle = 'rgba(10,6,2,.7)'; for (let i = 0; i <= 16; i++) g.fillRect(0, i * 32 - 1, w, 2); });
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
const woodM = new THREE.MeshStandardMaterial({map: woodTex, roughness: 0.85});
const PW = 1.9, PD = 2.3, PH = 2.25; // hut width (x), depth (z), wall height
box(PW + 0.3, 0.35, PD + 0.3, std(0x4a4640), 0, 0.175, 0, POS); // stone base
const floorY = 0.35;
box(0.06, PH, PD, woodM, PW / 2, floorY + PH / 2, 0, POS);                 // back wall (+x)
box(PW, PH, 0.06, woodM, 0, floorY + PH / 2, -PD / 2, POS); box(PW, PH, 0.06, woodM, 0, floorY + PH / 2, PD / 2, POS); // side walls
// front wall (-x) with door opening (z -0.95..-0.15) and a window (z 0.35..0.95, y 1.2..1.8)
const fwx = -PW / 2;
box(0.06, PH, 0.2, woodM, fwx, floorY + PH / 2, -1.05, POS);
box(0.06, PH - 2.0, 0.8, woodM, fwx, floorY + 2.0 + (PH - 2.0) / 2, -0.55, POS);
box(0.06, 0.85, 1.3, woodM, fwx, floorY + 0.425, 0.5, POS);
box(0.06, PH - 1.45, 1.3, woodM, fwx, floorY + 1.45 + (PH - 1.45) / 2, 0.5, POS);
box(0.06, 0.6, 0.12, woodM, fwx, floorY + 1.15, -0.09, POS); box(0.06, 0.6, 0.1, woodM, fwx, floorY + 1.15, 1.1, POS);
// roof (seng/zinc) single slope
const roof = box(PW + 0.9, 0.04, PD + 0.6, std(0x5c6166, {r: 0.5, m: 0.5}), -0.1, floorY + PH + 0.2, 0, POS); roof.rotation.z = 0.18;
// door: hinged on the z=-0.95 edge, opens outward (angle >0 = open)
const doorPivot = new THREE.Group(); doorPivot.position.set(fwx - 0.02, floorY, -0.95); POS.add(doorPivot);
const doorLeaf = box(0.045, 1.98, 0.8, woodM, 0, 0.99, 0.4, doorPivot);
const bolt = box(0.03, 0.03, 0.14, steel, 0.04, 1.0, 0.72, doorPivot, false); // inside latch
// bench (bale) inside
box(1.5, 0.06, 0.7, woodM, 0.1, floorY + 0.45, 0.55, POS); for (const dx of [-0.55, 0.75]) for (const dz of [0.3, 0.8]) box(0.06, 0.45, 0.06, woodM, dx, floorY + 0.225, dz, POS);
// interior bulb (off by default) + glass of tea + radio for life
const posBulbM = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffb060, emissiveIntensity: 0}); const posBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), posBulbM); posBulb.position.set(0, floorY + PH - 0.12, 0); POS.add(posBulb);
const posLight = new THREE.PointLight(0xffb060, 0, 4, 1.6); posLight.position.set(0, floorY + PH - 0.25, 0); POS.add(posLight);
box(0.3, 0.16, 0.12, std(0x2c2c2c), 0.5, floorY + 0.56, 0.75, POS);
// kentongan: bamboo log hanging at the door post outside
const KENT = new THREE.Group(); KENT.position.set(fwx - 0.18, floorY + 1.45, -1.22); POS.add(KENT);
{ const bam = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.75, 14), new THREE.MeshStandardMaterial({color: 0x9c7a3e, roughness: 0.7})); bam.castShadow = true; KENT.add(bam);
  box(0.02, 0.5, 0.03, std(0x1a120a), -0.08, 0, 0, KENT, false); // slit
  for (const y of [-0.3, 0.3]) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.087, 0.012, 6, 16), std(0x6b5226)); n.rotation.x = Math.PI / 2; n.position.y = y; KENT.add(n); }
  box(0.01, 0.3, 0.01, std(0x222222), 0, 0.5, 0, KENT, false); }
const mallet = box(0.03, 0.32, 0.03, std(0x6b4a2a), fwx - 0.3, floorY + 1.25, -1.0, POS); mallet.rotation.z = 0.4;

// ---------- the rules sheet (selebaran) + duty roster on the inside back wall ----------
const sheetTex = canvasTex(640, 900, () => {}); sheetTex.userData.dynamic = true;
function drawSheet(rule4 = 0, wet = 1) { // rule4: 0..1 handwritten reveal amount
  const focus = typeof sheetFocus === 'number' ? sheetFocus : -1; const key = Math.round(rule4 * 30) + ':' + wet + ':' + focus; if (sheetTex.userData.k === key) return; sheetTex.userData.k = key;
  const g = sheetTex.userData.g, w = 640, h = 900; g.fillStyle = '#e9e3d2'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,100,60,.10)'; for (let i = 0; i < 300; i++) g.fillRect(hash(i) * w, hash(i * 3) * h, 6, 6);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); // lamination edge
  if (focus >= 0 && focus < 3) { g.fillStyle = 'rgba(255,214,0,.42)'; g.fillRect(44, 172 + focus * 120, w - 88, 96); }
  if (focus === 3 && rule4 > 0.99) { g.fillStyle = 'rgba(180,20,10,.14)'; g.fillRect(40, 560, w - 80, 250); }
  g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.font = '900 46px Nunito'; g.fillText('PERATURAN RONDA', w / 2, 80); g.font = '800 30px Nunito'; g.fillText('RT 04 / RW 07', w / 2, 122);
  g.fillRect(60, 142, w - 120, 4);
  g.textAlign = 'left'; const rules = [['1.', 'Ronda harus berempat.', 'Jangan pernah berjalan sendirian.'], ['2.', 'Kentongan 2x = aman.', '3x = masuk pos, matikan senter.'], ['3.', 'Tepat pukul 01.00,', 'hitung jumlah peronda.']];
  rules.forEach((r, i) => { const y = 210 + i * 120; g.font = '900 36px Nunito'; g.fillText(r[0], 60, y); g.font = '800 33px Nunito'; g.fillText(r[1], 110, y); g.font = '600 29px Nunito'; g.fillText(r[2], 110, y + 42); });
  g.font = '700 24px Nunito'; g.textAlign = 'right'; g.fillText('Ketua RT 04', w - 70, 840); g.strokeStyle = 'rgba(60,60,160,.55)'; g.lineWidth = 4; g.beginPath(); g.arc(w - 140, 790, 44, 0, 7); g.stroke();
  if (rule4 > 0) { // handwritten 4th rule, wet ink running
    g.save(); g.beginPath(); g.rect(0, 560, 60 + (w - 60) * rule4, 260); g.clip();
    g.fillStyle = '#1a0c08'; g.font = '700 44px Caveat'; g.textAlign = 'left'; g.save(); g.translate(56, 600); g.rotate(-0.03);
    g.fillText('4. Jika jumlahnya 5,', 0, 0); g.fillText('jangan pernah hitung ulang.', 0, 50); g.font = '700 36px Caveat'; g.fillText('Yang kelima pulang bersama', 0, 104); g.fillText('orang terakhir yang masuk pos.', 0, 146); g.restore();
    if (wet) { g.fillStyle = 'rgba(26,12,8,.85)'; for (let i = 0; i < 9; i++) { const x = 80 + hash(i * 7) * 460, y0 = 600 + hash(i * 3) * 150, L = (20 + hash(i * 5) * 80) * (0.6 + 0.12 * wet); g.fillRect(x, y0, 3, L); g.beginPath(); g.arc(x + 1.5, y0 + L, 4, 0, 7); g.fill(); } }
    g.restore(); }
  sheetTex.needsUpdate = true;
}
const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.59), new THREE.MeshStandardMaterial({map: sheetTex, roughness: 0.35})); sheet.position.set(PW / 2 - 0.035, floorY + 1.45, -0.35); sheet.rotation.y = -Math.PI / 2; POS.add(sheet);
const rosterTex = canvasTex(512, 380, (g, w, h) => { g.fillStyle = '#1d2a22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9c4b5'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#eae6dc'; g.font = '700 40px Caveat'; g.textAlign = 'center'; g.fillText('JADWAL RONDA', w / 2, 56); g.textAlign = 'left'; g.font = '700 32px Caveat';
  [['Senin', 'Harjo, Udin, Bambang, Dimas'], ['Selasa', 'Slamet, Joko, Agus, Rudi'], ['Rabu', 'Wawan, Heri, Sugeng, Yanto']].forEach((r, i) => { g.fillText(r[0], 30, 120 + i * 80); g.fillText(r[1], 150, 120 + i * 80); }); });
const roster = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshStandardMaterial({map: rosterTex, roughness: 0.6})); roster.position.set(PW / 2 - 0.035, floorY + 1.55, 0.45); roster.rotation.y = -Math.PI / 2; POS.add(roster);
// small sign over the pos
const posSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.26), new THREE.MeshStandardMaterial({map: canvasTex(480, 104, (g, w, h) => { g.fillStyle = '#e8e1cf'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a1c14'; g.font = '900 52px Nunito'; g.textAlign = 'center'; g.fillText('POS RONDA RT 04', w / 2, 72); }), roughness: 0.7}));
posSign.position.set(fwx - 0.04, floorY + PH - 0.08, 0.05); posSign.rotation.y = -Math.PI / 2; POS.add(posSign);

// porch bulb outside the pos door (typical pos ronda lamp)
const porchBulbM = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffb868, emissiveIntensity: 2.2});
const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), porchBulbM); porchBulb.position.set(fwx - 0.28, floorY + PH - 0.05, -0.3); POS.add(porchBulb);
box(0.3, 0.02, 0.02, std(0x222222), fwx - 0.14, floorY + PH + 0.02, -0.3, POS, false);
const porchLight = new THREE.PointLight(0xffb868, 4.5, 6, 1.6); porchLight.position.set(fwx - 0.32, floorY + PH - 0.12, -0.3); porchLight.castShadow = true; porchLight.shadow.mapSize.set(512, 512); porchLight.shadow.bias = -0.002; POS.add(porchLight);

// ---------- CAST ----------
const toonM = c => new THREE.MeshToonMaterial({color: c, gradientMap: toonRamp});
function inkedMesh(geo, mat, parent, inkScale = 1.12) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; const o = new THREE.Mesh(geo.clone(), inkMat); o.scale.setScalar(inkScale); m.add(o); parent.add(m); return m; }
function addTorsoWrap(actor, color, h = 0.3, y = 0.24) { // jacket/shirt shell over the torso
  const geo = new THREE.CylinderGeometry(0.074, 0.068, h, 20); const v = new THREE.Mesh(geo, toonM(color)); v.position.y = y; v.scale.set(1.08, 1, 0.84); v.castShadow = true; actor.chest.add(v);
  const ol = new THREE.Mesh(geo.clone(), inkMat); ol.position.copy(v.position); ol.scale.set(1.1, 1.02, 0.9); actor.chest.add(ol); return v; }
function addFlashlight(actor, withLight = false) { // held in the right glove, beam along the forearm direction
  const f = new THREE.Group(); f.position.set(0, -0.06, 0.02); f.rotation.x = Math.PI / 2; actor.R.glove.add(f);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 10), std(0x2c2c2e, {r: 0.4, m: 0.5})); body.position.y = 0.06; f.add(body);
  const lensM = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 0}); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), lensM); lens.position.y = 0.161; lens.rotation.x = -Math.PI / 2; f.add(lens);
  let L = null; if (withLight) { L = new THREE.SpotLight(0xfff0c8, 0, 12, 0.32, 0.5, 1.4); L.position.y = 0.17; const tgt = new THREE.Object3D(); tgt.position.y = 3; f.add(L, tgt); L.target = tgt; }
  return {f, lensM, L, set(on) { lensM.emissiveIntensity = on ? 1.6 : 0; if (L) L.intensity = on ? 7 : 0; }};
}
// Dimas: young, green checked sarung over the shoulder
const dimas = makeStick({tie: false, card: false}); scene.add(dimas.root); addTorsoWrap(dimas, 0x2d3440); dimas.setBlinkSeed(0.4);
{ const sar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 24), toonM(0x3f6b3a)); sar.scale.set(1, 1.7, 0.75); sar.rotation.z = 0.7; sar.position.set(0, 0.26, 0); dimas.chest.add(sar); }
// Pak Harjo: older, black peci + mustache, brown jacket
const harjo = makeStick({tie: false, card: false, mustache: true}); scene.add(harjo.root); addTorsoWrap(harjo, 0x5a4330); harjo.setBlinkSeed(1.7);
{ const peci = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.13, 0.085, 24), toonM(0x111111)); peci.position.y = 0.105; harjo.head.add(peci); const o = new THREE.Mesh(peci.geometry.clone(), inkMat); o.scale.set(1.08, 1.12, 1.08); peci.add(o); }
// Udin: orange kupluk (beanie)
const udin = makeStick({tie: false, card: false}); scene.add(udin.root); addTorsoWrap(udin, 0x3b4b5c); udin.setBlinkSeed(2.3);
{ const k = new THREE.Mesh(new THREE.SphereGeometry(0.146, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), toonM(0xc4612a)); k.position.y = 0.012; udin.head.add(k); const o = new THREE.Mesh(k.geometry.clone(), inkMat); o.scale.setScalar(1.07); k.add(o); }
// Bambang: dark blue hooded jacket
const bambang = makeStick({tie: false, card: false}); scene.add(bambang.root); addTorsoWrap(bambang, 0x1f2a48, 0.34, 0.22); bambang.setBlinkSeed(3.1);
{ const hood = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), toonM(0x1f2a48)); hood.rotation.x = Math.PI / 2; hood.position.set(0, 0.47, -0.03); bambang.chest.add(hood); }
const crew = [dimas, harjo, udin, bambang];
const lights = {dimas: addFlashlight(dimas, true), harjo: addFlashlight(harjo, true), udin: addFlashlight(udin), bambang: addFlashlight(bambang)};
function torches(on) { Object.values(lights).forEach(l => l.set(on)); }

// The fifth: never rendered to the camera, only casts a shadow (and later shows as a hand on the door).
const fifth = makeStick({tie: false, card: false}); scene.add(fifth.root); fifth.root.visible = false;
const ghostMat = new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false});
fifth.root.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = true; } });
// a pale hand for the final shot (the only visible part)
const ghostHand = new THREE.Group(); scene.add(ghostHand); ghostHand.visible = false;
{ const pm = new THREE.MeshToonMaterial({color: 0xcfd3cc, gradientMap: toonRamp});
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), pm); palm.scale.set(1, 1.15, 0.7); ghostHand.add(palm); const o = new THREE.Mesh(palm.geometry.clone(), inkMat); o.scale.setScalar(1.15); palm.add(o);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.07, 4, 8), pm); f.position.set(-0.03 + i * 0.03, 0.085, 0); palm.add(f); }
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.4, 4, 10), new THREE.MeshToonMaterial({color: 0x15161a, gradientMap: toonRamp})); arm.position.set(0, -0.28, -0.02); ghostHand.add(arm); }

// ---------- SHOTS ----------
function cam(pos, look, fov = 45, shake = 0.004, t = 0) {
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos);
  if (shake) camera.position.add(V((noise1(t * 0.7) - 0.5) * shake, (noise1(t * 0.6 + 40) - 0.5) * shake, (noise1(t * 0.5 + 80) - 0.5) * shake));
  camera.lookAt(look);
}
const PX = 2.75, PZ = 4.0, FLOOR = 0.35;
const SHEET = V(PX + 0.95 - 0.035, FLOOR + 1.45, PZ - 0.35);            // rules sheet centre (faces -x)
const RULE_Y = [0.148, 0.069, -0.01, -0.138];                            // rule row offsets on the sheet
const sheetAt = (i, dx = 1.05, fov = 34) => [V(SHEET.x - dx, SHEET.y + RULE_Y[i] + 0.01, SHEET.z), V(SHEET.x, SHEET.y + RULE_Y[i], SHEET.z), fov];
let fx = {cctv: 0, ca: 0.25, vig: 1};
const malletHand = box(0.03, 0.3, 0.03, std(0x6b4a2a), 0, -0.12, 0.05, harjo.R.glove, false); malletHand.rotation.x = Math.PI / 2;
let sheetFocus = -1;
function resetAll() {
  fx = {cctv: 0, ca: 0.25, vig: 1}; fadeEl.style.opacity = 0; endEl.style.opacity = 0; cctvEl.style.display = 'none';
  crew.forEach(a => { a.root.visible = true; a.root.rotation.set(0, 0, 0); }); fifth.root.visible = false; ghostHand.visible = false;
  malletHand.visible = false; mallet.visible = true; torches(false); doorPivot.rotation.y = 0; KENT.rotation.set(0, 0, 0);
  posLight.intensity = 3.2; posBulbM.emissiveIntensity = 2.2; porchLight.intensity = 4.5; porchBulbM.emissiveIntensity = 2.2; lampPos.L.intensity = 26; lampEnd.L.intensity = 34; lampPos.bulbM.emissiveIntensity = 2; lampEnd.bulbM.emissiveIntensity = 2;
  moon.intensity = 0.35; nightHemi.intensity = 0.22; sheetFocus = -1; drawSheet(0, 1);
  winShaft.intensity = 0; insideFill.intensity = 0; winShaft.target.position.copy(SHEET).add(V(0, -0.1, 0.1)); bolt.position.z = 0.72; mallet.rotation.z = 0.4; endEl.textContent = 'RONDA MALAM'; KENT.rotation.z = 0;
  scene.background.set(0x05070c); scene.fog.color.set(0x070a10); scene.fog.density = 0.055;
  // default staging: the four men in front of the pos
  dimas.root.position.set(0.55, 0, 3.0); dimas.root.rotation.y = 1.9;
  harjo.root.position.set(1.15, 0, 2.7); harjo.root.rotation.y = -1.3;
  udin.root.position.set(0.25, 0, 3.9); udin.root.rotation.y = 2.6;
  bambang.root.position.set(1.0, 0, 4.4); bambang.root.rotation.y = -2.5;
  crew.forEach(a => a.pose({}, 0));
}
const idle = (a, t, extra = {}) => a.pose({la: [0.12, 0.12], ra: [0.12, 0.12], le: 0.25, re: 0.25, ...extra}, t);
function sheetShot(t, i, t0, t1) { sheetFocus = i; drawSheet(0, 1); dimas.root.visible = false; const [p, l, f] = sheetAt(i); const k = seg(t, t0, t1); const dn = V(0, -0.09, 0); cam(p.clone().add(dn).add(V(0.05 * (1 - k), 0, 0.02 * k)), l.clone().add(dn), f, 0.002, t); }
function dimasReading(t) { dimas.root.position.set(PX - 0.15, FLOOR, PZ - 0.3); dimas.root.rotation.y = Math.PI / 2; idle(dimas, t, {head: [0, 0.05], eyes: 1.2}); }

const shots = [
  {name: 'kentongan', t0: 0, t1: 1.7, f(t) { // two knocks: aman
    harjo.root.position.set(1.25, 0, 2.45); harjo.root.rotation.y = 0.85; malletHand.visible = true; mallet.visible = false;
    const hit = k0 => Math.max(0, 1 - Math.abs(t - k0) / 0.12); const sw = Math.max(hit(0.2), hit(0.75));
    harjo.pose({ra: [1.0 + 0.45 * sw, -0.1], re: 0.9 - 0.4 * sw, la: [0.1, 0.1], head: [0.2, 0.1], eyes: 1.1}, t);
    KENT.rotation.z = 0.06 * Math.sin((t - 0.2) * 22) * Math.exp(-Math.max(0, t - 0.2) * 5) * (t > 0.2 ? 1 : 0);
    dimas.root.visible = udin.root.visible = bambang.root.visible = false;
    cam(V(2.35, 1.6, 0.75), V(1.45, 1.45, 2.65), 46, 0.003, t); }},
  {name: 'pos-wide', t0: 1.7, t1: 5.4, f(t) { crew.forEach((a, i) => idle(a, t + i));
    const arrive = seg(t, 1.9, 4.2); dimas.root.position.set(lerp(-0.3, 0.55, arrive), 0, lerp(1.2, 3.0, arrive)); dimas.root.rotation.y = 0.45;
    dimas.pose({...walkPose(arrive * 2.0 / STRIDE * Math.PI, 0.8 * ease(arrive / 0.1) * ease((1 - arrive) / 0.1)), head: [0.3, 0], eyes: 1.1}, t);
    const k = seg(t, 1.7, 5.4); cam(V(-0.6, 1.7, -2.2).lerp(V(-0.4, 1.65, -1.4), k), V(1.6, 1.1, 3.8), 50, 0.004, t); }},
  {name: 'sheet-reveal', t0: 5.4, t1: 10.6, f(t) { dimasReading(t);
    const k = seg(t, 5.4, 10.6); cam(V(PX - 0.95, 1.95, PZ - 0.65).lerp(V(PX - 0.35, 1.85, PZ - 0.45), k), SHEET.clone().add(V(0, 0.05, 0)), 44, 0.003, t); }},
  {name: 'rule1', t0: 10.6, t1: 13.8, f(t) { dimasReading(t); sheetShot(t, 0, 10.6, 13.8); }},
  {name: 'four-together', t0: 13.8, t1: 16.3, f(t) { torches(true); lights.dimas.L.intensity = lights.harjo.L.intensity = 0;
    [harjo, udin, bambang, dimas].forEach((a, i) => { a.root.position.set(0.0 + (i % 2) * 0.75, 0, 1.4 - Math.floor(i / 2) * 0.7); a.root.rotation.y = Math.PI; idle(a, t + i, {ra: [0.55, 0.12], re: 0.4}); });
    cam(V(0.4, 1.45, -1.9), V(0.4, 1.05, 1.0), 46, 0.004, t); }},
  {name: 'rule2', t0: 16.3, t1: 19.9, f(t) { dimasReading(t); sheetShot(t, 1, 16.3, 19.9); }},
  {name: 'kentongan-door', t0: 19.9, t1: 24.6, f(t) { crew.forEach(a => a.root.visible = false); doorPivot.rotation.y = -0.5; posLight.intensity = 0; posBulbM.emissiveIntensity = 0;
    const k = seg(t, 19.9, 24.6); cam(V(-0.2, 1.55, 0.6).lerp(V(0.2, 1.55, 1.1), k), V(1.75, 1.35, 3.3), 46, 0.004, t); }},
  {name: 'rule3', t0: 24.6, t1: 28.1, f(t) { dimasReading(t); sheetShot(t, 2, 24.6, 28.1); }},
  {name: 'four-overhead', t0: 28.1, t1: 30.3, f(t) { torches(true);
    const C = V(0.4, 0, 2.6); [harjo, udin, bambang, dimas].forEach((a, i) => { const ang = i / 4 * Math.PI * 2 + 0.3; a.root.position.set(C.x + Math.cos(ang) * 0.55, 0, C.z + Math.sin(ang) * 0.55); a.root.rotation.y = Math.atan2(C.x - a.root.position.x, C.z - a.root.position.z); idle(a, t + i, {head: [0, 0.3]}); });
    const k = seg(t, 28.1, 30.3); cam(V(C.x + 0.01, lerp(5.2, 4.7, k), C.z + 0.02), V(C.x, 0, C.z), 50, 0.002, t); }},
];

// ---------- SHOTS, part B (30.3 s → end) ----------
// moonlight shaft through the pos window, for the dark interior scenes
const winShaft = new THREE.SpotLight(0x9db6e8, 0, 6, 0.32, 0.6, 1.2); winShaft.position.set(PX - 0.95 - 0.6, 2.4, PZ + 0.65); winShaft.target.position.copy(SHEET).add(V(0, -0.1, 0.1)); scene.add(winShaft, winShaft.target);
const insideFill = new THREE.PointLight(0x7f97c8, 0, 3.2, 1.4); insideFill.position.set(PX + 0.1, FLOOR + 1.9, PZ - 0.2); scene.add(insideFill);
const LAMP_END = V(0.7, 0, -21.0);
const CIRCLE = V(0.62, 0, -19.7);           // where the four stop (offset from the lamp so shadows stretch toward +z)
const FIFTH_AT = V(0.42, 0, -18.55);         // the fifth stands just behind Dimas
const ORDER = [harjo, udin, bambang, dimas]; // walking order; Dimas walks last
const runPose = (ph, s = 1) => ({...walkPose(ph, 1.3 * s), lean: 0.22 * s, le: lerp(0.15, 1.1, s), re: lerp(0.15, 1.1, s)});
function circlePos(i) { const ang = [-2.3, -0.75, 0.75, 2.2][i]; return V(CIRCLE.x + Math.sin(ang) * 0.62, 0, CIRCLE.z + Math.cos(ang) * 0.62); }
function placeCircle(t, extra = () => ({})) {
  ORDER.forEach((a, i) => { const p = circlePos(i); a.root.position.copy(p); a.root.rotation.y = Math.atan2(CIRCLE.x - p.x, CIRCLE.z - p.z); idle(a, t + i, {ra: [0.4, 0.12], re: 0.4, ...extra(a, i)}); }); }
function patrol(t, t0, t1, z0, z1) { // four in a 2x2 file walking toward -z
  const k = clamp((t - t0) / (t1 - t0)); const zc = lerp(z0, z1, k); const moving = k > 0 && k < 1 ? 1 : 0;
  const off = [[-0.35, 0], [0.35, 0.15], [-0.3, 0.85], [0.38, 1.0]];
  ORDER.forEach((a, i) => { a.root.position.set(off[i][0] + 0.15, 0, zc + off[i][1]); a.root.rotation.y = Math.PI;
    const ph = (z0 - zc) / STRIDE * Math.PI + i * 0.9; a.pose({...walkPose(ph, 0.85 * moving), ra: [0.55, 0.12], re: 0.4, head: [0.15 * Math.sin(t * 0.7 + i), 0.05]}, t); });
  return zc; }
function darkInterior() { torches(false); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; moon.intensity = 0; nightHemi.intensity = 0.05; winShaft.intensity = 5; porchLight.intensity = 0.6; insideFill.intensity = 1.1; }
function men_inside(t) { // the other three crouch in the dark corner
  [harjo, udin, bambang].forEach((a, i) => { a.root.position.set(PX + 0.2 + i * 0.12, FLOOR, PZ + 0.55 + i * 0.3); a.root.rotation.y = -Math.PI / 2 - 0.3; a.pose({lk: 1.2, rk: 1.2, ll: [1.2, 0.05], rl: [1.2, 0.05], hipY: -0.32, la: [0.6, 0.2], le: 1.2, ra: [0.6, 0.2], re: 1.2, head: [0, 0.2], eyes: 1.3}, t); }); }

shots.push(
  {name: 'patrol-walk', t0: 30.3, t1: 35.6, f(t) { torches(true); const zc = patrol(t, 30.3, 35.6, 1.0, -4.2);
    cam(V(-1.15, 1.55, zc - 1.9), V(0.35, 1.05, zc + 0.4), 50, 0.004, t); }},
  {name: 'four-names', t0: 35.6, t1: 38.4, f(t) { torches(true); const zc = patrol(t, 35.6, 38.4, -6.0, -8.0);
    cam(V(0.15, 1.5, zc - 2.6), V(0.15, 1.2, zc + 0.5), 46, 0.004, t); }},
  {name: 'gang-end', t0: 38.4, t1: 43.0, f(t) { torches(true);
    const k = clamp((t - 38.4) / (41.6 - 38.4)); ORDER.forEach((a, i) => { const tgt = circlePos(i); const st = V(tgt.x, 0, tgt.z + 3.6);
      const p = st.clone().lerp(tgt, k); a.root.position.copy(p); a.root.rotation.y = Math.PI; a.pose({...walkPose(k * 3.6 / STRIDE * Math.PI + i, 0.85 * ease(k / 0.1) * ease((1 - k) / 0.15)), ra: [0.55, 0.12], re: 0.4}, t); });
    const c = seg(t, 38.4, 43.0); cam(V(-0.8, 2.4, -14.2).lerp(V(-0.5, 2.2, -15.0), c), V(0.6, 1.2, -20.5), 46, 0.004, t); }},
  {name: 'harjo-count', t0: 43.0, t1: 45.4, f(t) { torches(true); placeCircle(t);
    const r = seg(t, 43.4, 44.2); harjo.pose({ra: [lerp(0.4, 1.3, r), 0.1], re: lerp(0.4, 0.1, r), point: r, head: [0, 0.1], eyes: 1.2, brow: 0.3}, t);
    const hp = harjo.root.position; cam(CIRCLE.clone().add(V(-0.35, 1.75, -1.45)), hp.clone().add(V(0, 1.35, 0)), 46, 0.003, t); }},
  {name: 'count', t0: 45.4, t1: 51.0, f(t) { torches(true);
    const beats = [45.5, 47.03, 48.34, 49.9]; let who = -1; beats.forEach((b, i) => { if (t >= b - 0.1) who = i; });
    placeCircle(t, (a, i) => i === 0 ? {} : {head: [0, 0.25]});
    if (who >= 0) { const tgt = circlePos(who), hp = harjo.root.position; const yaw = Math.atan2(tgt.x - hp.x, tgt.z - hp.z);
      harjo.root.rotation.y = who === 0 ? harjo.root.rotation.y : yaw; harjo.pose({ra: [who === 0 ? 0.6 : 1.35, who === 0 ? -0.6 : 0.1], re: who === 0 ? 1.4 : 0.1, point: 1, head: [0, 0.2]}, t); }
    const k = seg(t, 45.4, 51.0); cam(V(CIRCLE.x + 0.01, lerp(5.6, 5.0, k), CIRCLE.z + 0.35), V(CIRCLE.x, 0, CIRCLE.z + 0.35), 52, 0.002, t); }},
  {name: 'five-shadows', t0: 51.0, t1: 55.9, f(t) { torches(false); placeCircle(t, () => ({head: [0, 0.2], eyes: 1.3}));
    fifth.root.visible = true; const step = seg(t, 51.6, 52.6); fifth.root.position.copy(FIFTH_AT).add(V(0, 0, 0.7 * (1 - step))); fifth.root.rotation.y = Math.PI;
    fifth.pose({...walkPose(step * 0.7 / STRIDE * Math.PI, step > 0 && step < 1 ? 0.7 : 0), head: [0, 0.15]}, t);
    const k = seg(t, 51.0, 55.9); cam(V(CIRCLE.x + 0.01, lerp(5.0, 4.3, k), CIRCLE.z + 0.9), V(CIRCLE.x, 0, CIRCLE.z + 0.9), 56, 0.002, t); }},
  {name: 'lima', t0: 55.9, t1: 57.9, f(t) { placeCircle(t); fifth.root.visible = true; fifth.root.position.copy(FIFTH_AT); fifth.root.rotation.y = Math.PI; fifth.pose({head: [0.3, 0.1]}, t);
    const d = dimas.root.position; const fwd = V(Math.sin(dimas.root.rotation.y), 0, Math.cos(dimas.root.rotation.y));
    dimas.pose({ra: [0.4, 0.12], re: 0.4, la: [0.1, 0.1], eyes: lerp(1.1, 1.55, seg(t, 55.95, 56.2)), brow: 0.9, mouth: 'flat', head: [0, -0.02]}, t);
    cam(d.clone().add(fwd.clone().multiplyScalar(0.62)).add(V(0, 1.6, 0)), d.clone().add(V(0, 1.44, 0)), 40, 0.002, t); }},
  {name: 'no-look', t0: 57.9, t1: 60.8, f(t) { placeCircle(t, () => ({head: [0, 0.05], eyes: 1.4})); ORDER.forEach(a => a.root.rotation.y = Math.PI);
    fifth.root.visible = true; fifth.root.position.copy(FIFTH_AT); fifth.root.rotation.y = Math.PI; fifth.pose({head: [0.0, 0.0]}, t);
    const k = seg(t, 57.9, 60.8); cam(V(0.55, lerp(0.85, 1.0, k), -16.3), V(0.6, 0.55, -20.0), 50, 0.003, t); }},
  {name: 'pos-empty', t0: 60.8, t1: 65.9, f(t) { crew.forEach(a => a.root.visible = false); posLight.intensity = 0.0; posBulbM.emissiveIntensity = 0;
    const k = seg(t, 60.8, 65.9); cam(V(-0.6, 1.55, -1.2).lerp(V(0.2, 1.55, 0.6), k), V(1.6, 1.45, 2.9), 44, 0.003, t); }},
  {name: 'kentongan-self', t0: 65.9, t1: 68.3, f(t) { crew.forEach(a => a.root.visible = false); posLight.intensity = 0; posBulbM.emissiveIntensity = 0;
    const hits = [66.05, 66.65, 67.25]; let sw = 0; hits.forEach(h => { if (t > h) sw += Math.sin((t - h) * 24) * Math.exp(-(t - h) * 5); });
    KENT.rotation.z = 0.08 * sw; mallet.rotation.z = 0.4 + 0.5 * hits.reduce((s, h) => s + Math.max(0, 1 - Math.abs(t - h) / 0.1), 0);
    cam(V(0.55, 1.7, 1.65), V(1.6, 1.65, 2.85), 42, 0.002, t); }},
  {name: 'run-in', t0: 68.3, t1: 70.1, f(t) { torches(true); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; doorPivot.rotation.y = -1.3;
    ORDER.forEach((a, i) => { const k = clamp((t - 68.35 - i * 0.14) / 1.5); const p0 = V(-0.4 + i * 0.25, 0, -1.8 - i * 0.6), p1 = V(1.25, 0, 3.4);
      const p = p0.clone().lerp(p1, k); a.root.position.copy(p); a.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z); a.root.visible = k < 0.98;
      a.pose({...runPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, k > 0 && k < 1 ? 1 : 0), head: [0, -0.05], eyes: 1.4, mouth: 'o'}, t); });
    cam(V(-0.2, 1.55, 5.6), V(0.75, 1.15, 1.4), 52, 0.005, t); }},
  {name: 'lock', t0: 70.1, t1: 71.2, f(t) { torches(true); posLight.intensity = 0.9; insideFill.intensity = 1.2; posBulbM.emissiveIntensity = 0; men_inside(t);
    const s = seg(t, 70.25, 70.5); bolt.position.z = lerp(0.72, 0.86, s);
    dimas.root.position.set(PX - 0.55, FLOOR, PZ - 0.55); dimas.root.rotation.y = -Math.PI / 2; dimas.pose({la: [1.1, -0.2], le: 0.6, ra: [0.55, 0.12], re: 0.4, head: [0, 0.2], eyes: 1.4}, t);
    cam(V(PX - 0.25, 1.75, PZ + 0.35), V(PX - 0.92, 1.33, PZ - 0.25), 46, 0.003, t); }},
  {name: 'torches-off', t0: 71.2, t1: 73.0, f(t) { posLight.intensity = 0; posBulbM.emissiveIntensity = 0; men_inside(t); bolt.position.z = 0.86;
    const offs = [71.35, 71.6, 71.85, 72.05]; const order = ['harjo', 'udin', 'bambang', 'dimas']; order.forEach((n, i) => lights[n].set(t < offs[i])); posLight.intensity = 0.35 * offs.filter(o => t < o).length; insideFill.intensity = 1.1;
    if (t > 72.05) { moon.intensity = 0; nightHemi.intensity = 0.05; winShaft.intensity = 5 * seg(t, 72.1, 72.8); }
    dimas.root.position.set(PX - 0.45, FLOOR, PZ - 0.45); dimas.root.rotation.y = -Math.PI / 2 - 0.4; dimas.pose({ra: [0.55, 0.12], re: 0.4, head: [0, 0.1], eyes: 1.4}, t);
    cam(V(PX - 0.55, 1.62, PZ - 0.25), V(PX + 0.32, 1.35, PZ + 0.85), 54, 0.002, t); }},
  {name: 'grope', t0: 73.0, t1: 77.8, f(t) { darkInterior(); men_inside(t); bolt.position.z = 0.86;
    dimas.root.position.set(PX + 0.38, FLOOR, PZ - 0.05); dimas.root.rotation.y = Math.PI / 2;
    const g = seg(t, 73.3, 76.6); dimas.pose({ra: [lerp(0.4, 1.45, g), lerp(0.1, 0.5 - 0.35 * Math.sin(t * 3), g)], re: 0.25, la: [0.2, 0.1], head: [0, 0.05], eyes: 1.3}, t);
    const k = seg(t, 73.0, 77.8); cam(V(PX + 0.1, 1.75, PZ + 0.55).lerp(V(PX + 0.25, 1.7, PZ + 0.35), k), V(SHEET.x, 1.65, PZ - 0.1), 46, 0.002, t); }},
  {name: 'changed', t0: 77.8, t1: 82.6, f(t) { darkInterior(); dimas.root.visible = false; drawSheet(1, 1);
    const k = seg(t, 77.8, 82.6); const p0 = V(SHEET.x - 1.15, SHEET.y, SHEET.z), p1 = V(SHEET.x - 0.95, SHEET.y + RULE_Y[3] - 0.04, SHEET.z);
    cam(p0.lerp(p1, k), V(SHEET.x, lerp(SHEET.y, SHEET.y + RULE_Y[3] - 0.04, k), SHEET.z), 36, 0.002, t); }},
  {name: 'wet-ink', t0: 82.6, t1: 86.4, f(t) { darkInterior(); dimas.root.visible = false; drawSheet(1, 1 + Math.floor(seg(t, 82.6, 86.4) * 6));
    cam(V(SHEET.x - 0.42, SHEET.y + RULE_Y[3] - 0.07, SHEET.z + 0.05), V(SHEET.x, SHEET.y + RULE_Y[3] - 0.04, SHEET.z), 34, 0.0015, t); }},
  {name: 'rule4', t0: 86.4, t1: 96.6, f(t) { darkInterior(); dimas.root.visible = false; sheetFocus = 3; drawSheet(1, 7);
    const k = seg(t, 86.4, 96.4); const y = SHEET.y + RULE_Y[3] - 0.03 - 0.07 * k;
    cam(V(SHEET.x - 0.85, y - 0.05, SHEET.z), V(SHEET.x, y, SHEET.z), 34, 0.0015, t); }},
  {name: 'gulp', t0: 96.6, t1: 100.5, f(t) { darkInterior(); men_inside(t); drawSheet(1, 7);
    dimas.root.position.set(PX + 0.35, FLOOR, PZ - 0.25); dimas.root.rotation.y = Math.PI / 2;
    const gulp = Math.max(0, 1 - Math.abs(t - 97.4) / 0.25); dimas.pose({ra: [0.2, 0.1], la: [0.2, 0.1], head: [0, -0.06 + 0.08 * gulp], eyes: 1.5, brow: 0.9, mouth: gulp > 0.3 ? 'o' : 'flat'}, t);
    winShaft.target.position.set(PX + 0.35, 1.9, PZ - 0.25); winShaft.intensity = 6;
    cam(V(PX + 0.95, 1.95, PZ - 0.3), V(PX + 0.35, 1.9, PZ - 0.25), 40, 0.002, t); }},
  {name: 'last-in', t0: 100.5, t1: 103.0, f(t) { // memory: the run-in again, seen from inside — Dimas enters last
    torches(true); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; doorPivot.rotation.y = -1.3; fx.vig = 1.6; fx.cctv = 1;
    [harjo, udin, bambang].forEach((a, i) => { a.root.position.set(PX + 0.1 + i * 0.25, FLOOR, PZ + 0.4 + i * 0.25); a.root.rotation.y = -Math.PI / 2; idle(a, t + i, {eyes: 1.4}); });
    const k = clamp((t - 100.6) / 1.3); const p = V(lerp(0.6, PX - 0.6, k), lerp(0, FLOOR, seg(t, 101.4, 101.7)), PZ - 0.55); dimas.root.position.copy(p); dimas.root.rotation.y = Math.PI / 2;
    dimas.pose({...runPose(k * 1.6 / STRIDE * Math.PI, k > 0 && k < 1 ? 0.9 : 0), head: [0, 0], eyes: 1.4, mouth: 'o'}, t);
    cam(V(PX + 0.75, 1.5, PZ - 0.4), V(PX - 1.4, 1.2, PZ - 0.55), 50, 0.002, t); }},
  {name: 'behind', t0: 103.0, t1: 108.42, f(t) { darkInterior(); men_inside(t); drawSheet(1, 7); bolt.position.z = 0.86;
    winShaft.target.position.set(PX - 0.05, 1.95, PZ - 0.58); winShaft.intensity = 7; porchLight.intensity = 4.5;
    dimas.root.position.set(PX - 0.05, FLOOR, PZ - 0.58); dimas.root.rotation.y = Math.PI / 2 + 0.3; dimas.pose({ra: [0.2, 0.1], la: [0.2, 0.1], head: [0, 0.02], eyes: 1.5, brow: 0.9}, t); insideFill.intensity = 1.5;
    const open = 1 - seg(t, 106.2, 108.3); doorPivot.rotation.y = -0.32 * (t < 105.5 ? 0 : t < 105.9 ? seg(t, 105.5, 105.9) : open);
    ghostHand.visible = t > 105.9; ghostHand.position.set(PX - 0.95 + 0.06, FLOOR + 1.25, PZ - 0.15 - 0.02 + 0.2 * (1 - open) * 0); ghostHand.rotation.set(0.2, 0, -0.3);
    const hp = new THREE.Vector3(0.05, 1.0, 0.8).applyAxisAngle(V(0, 1, 0), doorPivot.rotation.y); ghostHand.position.set(PX - 0.95 - 0.02 + hp.x + 0.07, FLOOR + 1.0, PZ - 0.95 + hp.z - 0.02);
    const k = seg(t, 103.0, 108.4); cam(V(PX + 0.85, 1.85, PZ - 0.45).lerp(V(PX + 0.78, 1.83, PZ - 0.48), k), V(PX - 0.8, 1.6, PZ - 0.42), 56, 0.0015, t); }},
  {name: 'end', t0: 108.42, t1: 112.5, f(t) { crew.forEach(a => a.root.visible = false); fadeEl.style.opacity = 1; endEl.textContent = 'RONDA MALAM'; endEl.style.opacity = seg(t, 109.2, 110.0) * (1 - seg(t, 111.2, 111.9));
    cam(V(0, 1.6, 0), V(0, 1.6, -1), 45, 0, t); }},
);

// ---------- post-processing: bloom + chromatic aberration/vignette + CCTV mode ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, {samples: 8, type: THREE.HalfFloatType})); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.18, 0.4, 0.97); composer.addPass(bloom);
const lookPass = new ShaderPass({uniforms: {tDiffuse: {value: null}, uCA: {value: 1}, uVig: {value: 1}, uCCTV: {value: 0}, uTime: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig, uCCTV, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 off = c * r2 * 0.012 * uCA;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (uCCTV > 0.5) { float l = dot(col, vec3(0.3,0.59,0.11)); col = vec3(l*0.92, l*1.02, l*0.95); col = (col-0.5)*1.25+0.5;
        col *= 0.88 + 0.12*sin(vUv.y*1280.0*1.6); col += (h(vUv*vec2(720.0,1280.0) + floor(uTime*12.0)) - 0.5)*0.04; }
      col *= mix(1.0, (1.0 - smoothstep(0.25, 0.95, length(c*vec2(1.0,0.75)))), 0.55*uVig);
      gl_FragColor = vec4(col, 1.0); }`});
composer.addPass(lookPass); composer.addPass(new OutputPass());

// ---------- overlay ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), setupEl = $('setup'), payEl = $('payoff'), ruleEl = $('rule'), fadeEl = $('fade'), cctvEl = $('cctv'), endEl = $('end');
endEl.style.zIndex = 5; endEl.style.position = 'absolute';
setupEl.textContent = 'PERATURAN RONDA RT 04';
payEl.innerHTML = 'JANGAN HITUNG<span class="l2" style="font-size:96px;color:#f3ead8">ULANG.</span>';
let captions = [];
function overlay(t) {
  const showT = t < 3.9; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, 3.6, 3.88); setupEl.style.opacity = seg(t, 0.1, 0.35) * out;
    const pk = t - 1.6; payEl.style.opacity = (pk >= 0 ? 1 : 0) * out; payEl.style.transform = `scale(${pk >= 0 ? lerp(1.035, 1, clamp(pk / 0.2)) : 1.035})`;
    ruleEl.style.width = `${clamp((t - 1.7) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : ''; capEl.className = c ? c.voice : ''; capEl.style.opacity = c ? 1 : 0;
}
{ const g = $('grain').getContext('2d'); const im = g.createImageData(360, 640); let s = 7; for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '800 40px Nunito', '700 40px Nunito', '600 40px Nunito', '700 40px Caveat'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  // redraw canvas textures now that fonts are loaded
  scene.traverse(o => { const m = o.material; for (const mat of Array.isArray(m) ? m : m ? [m] : []) for (const k of ['map', 'emissiveMap']) { const t = mat[k]; if (t && t.userData && t.userData.draw && !t.userData.dynamic) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; } } });
  sheetTex.userData.k = null;
  scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  resetAll();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  scene.updateMatrixWorld(true);
    lookPass.uniforms.uCCTV.value = fx.cctv; lookPass.uniforms.uTime.value = t; lookPass.uniforms.uCA.value = fx.ca; lookPass.uniforms.uVig.value = fx.vig;
  composer.render();
  overlay(t);
  return s.name;
};
window.sceneReady = true;
