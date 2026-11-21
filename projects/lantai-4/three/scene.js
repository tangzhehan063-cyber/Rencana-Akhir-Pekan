// LANTAI 4 — Three.js liminal-horror stickman renderer.
// Deterministic: window.renderAt(t) draws the frame for absolute video time t (seconds).
import * as THREE from 'three';

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

// ---------- STICKMAN RIG ----------
function makeStick() {
  // Rebuilt rig v3: capsule limbs, short shoulders/hips, head ~1/6 of height.
  const HR = 0.14, LR = 0.043, TR = 0.062;          // head radius, limb radius, torso radius
  const UPPER = 0.28, FORE = 0.27, THIGH = 0.42, SHIN = 0.42, TORSO = 0.46;
  const HIP_Y = THIGH + SHIN + 0.035;
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);
  const capsule = (len, r) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), black);
    m.position.y = -len / 2; g.add(m); return g; };
  // torso: slightly tapered capsule (wider chest)
  const torso = new THREE.Group(); hips.add(torso);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(TR, TORSO - TR, 8, 18), black); body.position.y = TORSO / 2; body.scale.set(1.05, 1, 0.8); torso.add(body);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(TR * 0.95, 16, 12), black); pelvis.scale.set(1.2, 0.8, 0.85); torso.add(pelvis);
  // tie + id card
  const tieMat = std(0x8c1c1c, {r: 0.7});
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.03), tieMat); knot.position.set(0, TORSO - 0.02, TR * 0.8); torso.add(knot);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.27, 0.014), tieMat); tie.position.set(0, TORSO - 0.18, TR * 0.85); tie.rotation.x = -0.05; torso.add(tie);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.043, 0.05, 4), tieMat); tip.rotation.set(Math.PI, Math.PI / 4, 0); tip.scale.set(1, 1, 0.3); tip.position.set(0, TORSO - 0.335, TR * 0.86); torso.add(tip);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.008), std(0x2f6fb5, {r: 0.5})); card.position.set(0.075, TORSO - 0.17, TR * 0.8); card.rotation.y = 0.15; torso.add(card);
  // head
  const neck = new THREE.Group(); neck.position.y = TORSO + 0.035; torso.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 10), black); neckM.position.y = 0.0; neck.add(neckM);
  const head = new THREE.Group(); head.position.y = HR + 0.01; neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HR, 40, 30), white); skull.scale.set(1, 1.04, 0.96); head.add(skull);
  const ol = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.06, 32, 24), outlineMat); ol.scale.copy(skull.scale); head.add(ol);
  const eyeGeo = new THREE.SphereGeometry(0.019, 14, 12);
  const EZ = HR * 0.93;
  const eyes = [-0.045, 0.045].map(x => { const e = new THREE.Mesh(eyeGeo, black); e.position.set(x, 0.02, EZ); e.scale.set(0.8, 1.15, 0.45); head.add(e); return e; });
  const pupils = eyes.map(e => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshBasicMaterial({color: 0xffffff})); p.position.set(0.006, 0.01, 0.02); e.add(p); return p; });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), black); mouth.position.set(0, -0.055, EZ - 0.006); head.add(mouth);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.005, 6, 16), black); mouthO.position.set(0, -0.058, EZ - 0.004); head.add(mouthO);
  const brows = [-0.045, 0.045].map(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.008, 0.01), black); b.position.set(x, 0.062, EZ - 0.01); head.add(b); return b; });
  // arms: shoulders sit at the top corners of the chest
  const mkArm = side => { const sh = new THREE.Group(); sh.position.set(side * (TR * 1.05), TORSO - 0.06, 0); torso.add(sh);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(LR * 1.15, 12, 10), black); sh.add(ball);
    const up = capsule(UPPER, LR); sh.add(up); const el = new THREE.Group(); el.position.y = -UPPER; up.add(el);
    const fo = capsule(FORE, LR * 0.95); el.add(fo); const wr = new THREE.Group(); wr.position.y = -FORE; fo.add(wr);
    const glove = new THREE.Group(); wr.add(glove);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 18, 14), white); palm.scale.set(1, 1.1, 0.8); palm.position.y = -0.045; glove.add(palm);
    const pol = new THREE.Mesh(new THREE.SphereGeometry(0.062 * 1.1, 14, 10), outlineMat); pol.scale.copy(palm.scale); pol.position.copy(palm.position); glove.add(pol);
    const th = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), white); th.position.set(side * -0.05, -0.03, 0.022); glove.add(th);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 16), white); cuff.rotation.x = Math.PI / 2; glove.add(cuff);
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.05, 4, 8), white); finger.position.set(0, -0.115, 0.0); finger.visible = false; glove.add(finger);
    return {sh, el, wr, finger}; };
  const L = mkArm(1), R = mkArm(-1);
  const mkLeg = side => { const hp = new THREE.Group(); hp.position.set(side * TR * 0.62, 0, 0); hips.add(hp);
    const th = capsule(THIGH, LR * 1.08); hp.add(th); const kn = new THREE.Group(); kn.position.y = -THIGH; th.add(kn);
    const sh = capsule(SHIN, LR); kn.add(sh);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.07, 4, 10), black); foot.rotation.x = Math.PI / 2; foot.scale.set(1.15, 1, 0.75); foot.position.set(0, -SHIN - 0.02, 0.045); sh.add(foot);
    return {hp, kn}; };
  const LL = mkLeg(1), RL = mkLeg(-1);
  root.traverse(o => { if (o.isMesh && o.material !== outlineMat) o.castShadow = true; });
  function pose(p) {
    const P = Object.assign({la: [0.05, 0.1], le: 0.15, ra: [0.05, 0.1], re: 0.15, ll: [0, 0.02], lk: 0, rl: [0, 0.02], rk: 0,
      head: [0, 0], lean: 0, eyes: 1, look: [0, 0], mouth: 'flat', brow: 0, hipY: 0, point: 0}, p);
    L.sh.rotation.set(-P.la[0], 0, P.la[1]); L.el.rotation.set(-P.le, 0, 0);
    R.sh.rotation.set(-P.ra[0], 0, -P.ra[1]); R.el.rotation.set(-P.re, 0, 0);
    LL.hp.rotation.set(-P.ll[0], 0, P.ll[1]); LL.kn.rotation.set(P.lk, 0, 0);
    RL.hp.rotation.set(-P.rl[0], 0, -P.rl[1]); RL.kn.rotation.set(P.rk, 0, 0);
    torso.rotation.set(P.lean, 0, 0); hips.position.y = HIP_Y + P.hipY;
    neck.rotation.set(-P.head[1], P.head[0], 0);
    eyes.forEach(e => { e.scale.set(0.8 * (0.85 + 0.15 * P.eyes), 1.15 * P.eyes, 0.45); e.position.x = Math.sign(e.position.x) * 0.045 + P.look[0] * 0.015; e.position.y = 0.02 + P.look[1] * 0.015; });
    pupils.forEach(p => p.visible = P.eyes > 1.15);
    mouth.visible = P.mouth === 'flat'; mouthO.visible = P.mouth === 'o';
    brows.forEach((b, i) => { b.visible = Math.abs(P.brow) > 0.01; b.rotation.z = (i ? -1 : 1) * P.brow * 0.5; b.position.y = 0.062 + Math.abs(P.brow) * 0.012; });
    L.finger.visible = P.point > 0.5;
  }
  pose({});
  return {root, pose, head, torso, L, R, extras: [knot, tie, tip, card]};
}
function walkPose(ph, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.42 * s * amt, lerp(0.02, 0.03, amt)], lk: (Math.max(0, -c) * 0.7 + 0.05) * amt, rl: [-0.42 * s * amt, lerp(0.02, 0.03, amt)], rk: (Math.max(0, c) * 0.7 + 0.05) * amt,
    la: [lerp(0.05, -0.35 * s, amt), 0.1], ra: [lerp(0.05, 0.35 * s, amt), 0.1], le: lerp(0.15, 0.3, amt), re: lerp(0.15, 0.3, amt), hipY: -0.025 * Math.abs(Math.cos(ph)) * amt};
}

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

// ---------- SET: OFFICE FLOOR 5 (x offset 40) ----------
const OF = new THREE.Group(); OF.position.set(40, 0, 0); scene.add(OF);
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), std(0x2b3036)); carpet.rotation.x = -Math.PI / 2; carpet.receiveShadow = true; OF.add(carpet);
const offWall = std(0x4d5560); box(10, 3, 0.1, offWall, 0, 1.5, -3.2, OF, false); box(0.1, 3, 10, offWall, -3.5, 1.5, 0, OF, false); box(0.1, 3, 10, offWall, 3.5, 1.5, 0, OF, false);
box(10, 0.1, 10, std(0x3a3f45), 0, 3, 0, OF, false);
const win = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.8), new THREE.MeshBasicMaterial({map: cityTex, color: 0x9aa6c0})); win.position.set(0.6, 1.6, -3.14); OF.add(win);
for (let i = 0; i <= 4; i++) box(0.06, 1.85, 0.06, black, -1.5 + i * 1.05, 1.6, -3.1, OF, false);
const clock = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), new THREE.MeshStandardMaterial({map: clockTex, roughness: 0.6})); clock.position.set(-2.4, 2.15, -3.13); OF.add(clock);
// desk + monitor + lamp
const deskMat = std(0x8b6a4a, {r: 0.7}); box(1.5, 0.05, 0.75, deskMat, 0, 0.76, -1.6, OF); for (const x of [-0.7, 0.7]) box(0.05, 0.76, 0.7, std(0x444444), x, 0.38, -1.6, OF);
box(0.06, 0.25, 0.06, black, 0.05, 0.9, -1.8, OF); box(0.25, 0.02, 0.18, black, 0.05, 0.79, -1.8, OF);
const monFrame = box(0.62, 0.4, 0.03, black, 0.05, 1.18, -1.82, OF);
const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({map: monitorTex})); monScreen.position.set(0.05, 1.18, -1.8); OF.add(monScreen);
const monLight = new THREE.PointLight(0x9cc0ff, 4.5, 3.5, 1.4); monLight.position.set(0.05, 1.2, -1.4); OF.add(monLight);
const dClock = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({map: deskClockTex})); dClock.position.set(-0.5, 0.82, -1.45); dClock.rotation.x = -0.4; OF.add(dClock);
box(0.04, 0.4, 0.04, black, 0.55, 0.98, -1.75, OF); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 20, 1, true), std(0x2b6b4f, {extra: {side: THREE.DoubleSide}})); shade.position.set(0.55, 1.2, -1.7); OF.add(shade);
const deskLamp = new THREE.SpotLight(0xffd59a, 16, 4, 0.95, 0.6, 1.4); deskLamp.position.set(0.55, 1.18, -1.7); deskLamp.target.position.set(0.3, 0.76, -1.5); deskLamp.castShadow = true; deskLamp.shadow.mapSize.set(1024, 1024); deskLamp.shadow.bias = -0.001; deskLamp.shadow.normalBias = 0.02; OF.add(deskLamp, deskLamp.target);
const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), std(0xe8e2d0)); mug.position.set(-0.3, 0.83, -1.4); OF.add(mug);
// dark cubicles
for (let i = 0; i < 4; i++) { box(1.4, 1.2, 0.05, std(0x3d4650), -2.2 + (i % 2) * 4.0, 0.6, 0.6 + Math.floor(i / 2) * 1.8, OF); box(1.2, 0.04, 0.6, deskMat, -2.2 + (i % 2) * 4.0, 0.74, 0.25 + Math.floor(i / 2) * 1.8, OF); }
const moon = new THREE.SpotLight(0x8fa8d8, 25, 9, 0.9, 0.7, 1.2); moon.position.set(0.6, 2.2, -2.9); moon.target.position.set(-1.2, 1.2, 0.5); OF.add(moon, moon.target);
const clockLight = new THREE.PointLight(0xaabbe0, 1.6, 2.2, 1.5); clockLight.position.set(-2.3, 2.1, -2.6); OF.add(clockLight);
const offAmb = new THREE.PointLight(0x5a6c90, 3.5, 9, 1.2); offAmb.position.set(0.6, 2.4, -2.2); OF.add(offAmb);

// ---------- cast ----------
const rudi = makeStick(); scene.add(rudi.root);

// ---------- overlay ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), setupEl = $('setup'), payEl = $('payoff'), ruleEl = $('rule'), fadeEl = $('fade');
setupEl.textContent = 'GEDUNG INI PUNYA 5 LANTAI.';
payEl.innerHTML = '<span class="l2" style="font-size:70px">LIFT BERHENTI DI</span>LANTAI 4<span class="l2" style="font-size:70px">YANG BELUM JADI?</span>';
let captions = [];
const grain = $('grain').getContext('2d'); const gimg = grain.createImageData(360, 640);
let grainDone = false;
function drawGrain(t) { if (grainDone) return; grainDone = true; const f = 7; let s = f * 9301 + 49297; const d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } grain.putImageData(gimg, 0, 0); }
function overlay(t) {
  // hook title 0..2.9
  const showT = t < 2.95; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, 2.7, 2.92);
    setupEl.style.opacity = seg(t, 0.1, 0.32) * out;
    const pk = t - 1.5; payEl.style.opacity = (pk >= 0 ? 1 : 0) * out; payEl.style.transform = `scale(${pk >= 0 ? lerp(1.035, 1, clamp(pk / 0.2)) : 1.035})`;
    ruleEl.style.width = `${clamp((t - 1.6) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : '';
  capEl.style.opacity = c ? 1 : 0;
  drawGrain(t);
}

// ---------- SHOTS ----------
function shake(t, amp, freq = 18) { return V((noise1(t * freq) - .5) * amp, (noise1(t * freq + 40) - .5) * amp, 0); }
function cam(pos, look, fov = 45, sh = null) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos); if (sh) camera.position.add(sh); camera.lookAt(look); }
function resetState() {
  F4.visible = true; CAB.visible = true; OF.visible = true; rudi.root.visible = true; scene.fog.density = 0.045;
  doorL.position.x = -0.3; doorR.position.x = 0.3; cabLight.intensity = 5.5; cabLightPanel.material.color.set(0xfff3d6).multiplyScalar(0.62); cabSpill.intensity = 45;
  redLight.intensity = 0; drawLedIf(inLedTex, '5'); tapeGlow.intensity = 0; tapeGlowPlane.material.opacity = 0;
  for (const k in btn) setBtn(k, false); monScreen.visible = true; monLight.intensity = 4.5; workLight.intensity = 300; workFill.intensity = 14; coldFill.intensity = 4;
  rudi.root.rotation.set(0, 0, 0); rudi.root.scale.setScalar(1); cabLight.castShadow = true; swayPlastic(0, 1); renderer.toneMappingExposure = 1.0;
  resetPart2();
}
function drawLedIf(tex, s, col) { if (tex.userData.text !== s || tex.userData.col !== col) { drawLed(tex, s, col); tex.userData.col = col; } }
function doors(open) { doorL.position.x = -0.3 - 0.6 * open; doorR.position.x = 0.3 + 0.6 * open; cabSpill.intensity = 45 * clamp(open * 1.4); }
function flicker(t, t0, dur) { if (t < t0 || t > t0 + dur) return 1; const k = (t - t0) / dur; return hash(Math.floor(t * 12)) > 0.4 + 0.35 * k ? 1 : 0.42; }
function rudiInCab(x = -0.12, z = -0.95, yaw = 0) { rudi.root.position.set(x, 0.02, z); rudi.root.rotation.y = yaw; }

const shots = [
  {name: 'hook-display', t0: 0, t1: 2.9, f(t) {
    rudiInCab(0.3, -0.72, 0); const up = seg(t, 1.55, 1.85);
    rudi.pose({head: [0.05, lerp(0.25, 0.45, up)], eyes: lerp(1, 1.35, up), mouth: up > .5 ? 'o' : 'flat', brow: up * 0.6});
    const four = t >= 1.55; drawLedIf(inLedTex, four ? '4' : '5'); redLight.intensity = four ? 1.6 : 0.25;
    const fl = flicker(t, 1.55, 0.45); cabLight.intensity = 5.5 * fl; cabLightPanel.material.color.setScalar(fl > .5 ? 0.62 : 0.3);
    cam(V(-0.45, 1.25, -1.52), V(0.0, 2.45, -0.2), 64, four ? shake(t, 0.03 * (1 - seg(t, 1.6, 2.2))) : null);
  }},
  {name: 'office-clock', t0: 2.9, t1: 6.2, f(t) {
    rudi.root.position.set(40 + 0.0, 0, -1.0); rudi.root.rotation.y = Math.PI;
    const reach = seg(t, 4.55, 4.95) * (1 - seg(t, 5.35, 5.8)); const off = t >= 4.95;
    rudi.pose({la: [lerp(0.05, 1.25, reach), lerp(0.12, 0.05, reach)], le: lerp(0.15, 0.25, reach), lean: 0.12 * reach, head: [0, -0.1]});
    monScreen.visible = !off; monLight.intensity = off ? 0 : 4.5;
    const k = seg(t, 2.9, 4.1);
    const p = V(40 - 1.6, 1.55, 1.6).lerp(V(40 - 0.9, 1.35, 0.9), seg(t, 3.6, 6.2));
    const look = V(40 - 2.4, 2.15, -3.1).lerp(V(40 + 0.0, 1.15, -1.5), k);
    cam(p, look, lerp(32, 42, k));
  }},
  {name: 'press-G', t0: 6.2, t1: 8.6, f(t) {
    rudiInCab(0.16, -0.72, 0);
    const r = seg(t, 6.7, 7.45) * (1 - seg(t, 7.85, 8.4)); const pressed = t >= 7.45;
    rudi.pose({la: [lerp(0.05, 0.7, r), lerp(0.12, 1.15, r)], le: lerp(0.15, 0.1, r), head: [lerp(0, 0.75, seg(t, 6.4, 6.9)), -0.15], point: r, look: [0.6, -0.3]});
    setBtn('G', pressed); cabLight.castShadow = false;
    cam(V(-0.68, 1.45, -0.12), V(0.55, 1.05, -0.6), 52);
  }},
  {name: 'tape-wide', t0: 8.6, t1: 10.5, f(t) {
    rudiInCab(-0.1, -0.85, 0); rudi.pose({head: [0.75, -0.2]}); setBtn('G', true);
    const k = seg(t, 8.6, 10.5);
    cam(V(0.3, 1.3, -0.3).lerp(V(0.42, 1.3, -0.31), k), V(0.8, 1.24, -0.32), 46);
  }},
  {name: 'tape-close', t0: 10.5, t1: 12.9, f(t) {
    setBtn('G', true); rudi.root.visible = false;
    const g = seg(t, 11.3, 12.6); tapeGlow.intensity = 0.03 * g; tapeGlowPlane.material.opacity = 0.75 * g * (0.85 + 0.15 * Math.sin(t * 9));
    const k = seg(t, 10.5, 12.9);
    cam(V(0.42, 1.34, -0.31).lerp(V(0.49, 1.345, -0.32), k), V(0.8, 1.345, -0.32), 36);
  }},
  {name: 'stop-at-4', t0: 12.9, t1: 15.6, f(t) {
    rudiInCab(-0.05, -1.0, 0); setBtn('G', true);
    const stop = t >= 13.55, up = seg(t, 13.6, 13.85);
    rudi.pose({head: [lerp(0.1, 0.0, up), lerp(0, 0.38, up)], eyes: lerp(1, 1.4, up), mouth: up > .5 ? 'o' : 'flat', brow: up * 0.7, la: [0.05, 0.25 * up], ra: [0.05, 0.25 * up]});
    drawLedIf(inLedTex, stop ? '4' : '5'); redLight.intensity = stop ? 2.4 : 0.2;
    const fl = flicker(t, 13.55, 0.6); cabLight.intensity = 5.5 * fl; cabLightPanel.material.color.setScalar(fl > .5 ? 0.62 : 0.3);
    const jolt = stop ? 0.05 * Math.exp(-(t - 13.55) * 5) : 0;
    cam(V(-0.62, 1.55, -0.12), V(0.0, 1.55, -1.0), 50, jolt > 0.0005 ? shake(t, jolt, 26) : null);
  }},
  {name: 'doors-open-pov', t0: 15.6, t1: 19.6, f(t) {
    rudiInCab(0.05, -0.9, 0); drawLedIf(inLedTex, '4'); redLight.intensity = 1.2; setBtn('G', true);
    const o = seg(t, 15.8, 17.1); doors(o); swayPlastic(t, 0.6);
    rudi.pose({head: [0, 0.05], eyes: 1.25, la: [0.05, 0.18], ra: [0.05, 0.18]});
    const k = seg(t, 16.6, 19.6);
    cam(V(-0.32, 1.65, -1.52).lerp(V(-0.22, 1.62, -1.25), k), V(0.05, 1.3, 6), 46);
  }},
  {name: 'corridor-plastic', t0: 19.6, t1: 22.3, f(t) {
    rudi.root.visible = false; doors(1); swayPlastic(t, 1.0);
    const k = seg(t, 19.6, 22.3);
    cam(V(0.55, 1.5, 0.6).lerp(V(0.5, 1.48, 1.6), k), V(0.1, 1.45, 12), 34);
  }},
  {name: 'tie-still', t0: 22.3, t1: 24.2, f(t) {
    rudiInCab(0.0, -0.35, 0); doors(1); swayPlastic(t, 1.0);
    const w = seg(t, 22.7, 23.1);
    rudi.pose({head: [0.0, -0.05], eyes: lerp(1.15, 1.5, w), mouth: w > .5 ? 'o' : 'flat', brow: 0.4 + w * 0.5, look: [0, -0.3]});
    cam(V(0.32, 1.38, 1.35), V(0.0, 1.42, -0.35), 34);
  }},
  {name: 'step-out-doors-close', t0: 24.2, t1: 27.4, f(t) {
    const w = clamp((t - 24.3) / 1.2); const z = lerp(-0.6, 1.5, ease(w));
    rudi.root.position.set(0.0, 0.02, z); rudi.root.rotation.y = 0;
    const wp = w < 1 && t > 24.3 ? walkPose((t - 24.3) * 7.5, 1) : {};
    const look = seg(t, 25.55, 26.0);
    rudi.pose({...wp, head: [lerp(0, 2.35, look), 0], eyes: lerp(1.1, 1.4, look), brow: 0.5, look: [0, 0]});
    const close = seg(t, 25.8, 26.75); doors(1 - close);
    cabLight.intensity = 5.5; swayPlastic(t, 0.8);
    const dark = seg(t, 26.6, 27.2); workLight.intensity = lerp(300, 170, dark);
    cam(V(0.9, 1.25, 5.2).lerp(V(0.75, 1.3, 4.6), seg(t, 24.2, 27.4)), V(0.0, 1.25, 0.0), 40);
  }},
];

// ================= PART 2: stairwell loop, plastic double, schedule board, body niche, exterior =================
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
// near plastic sheet (it has "moved" a few steps from the stair door)
const nearG = new THREE.PlaneGeometry(2.4, 2.95, 24, 24); const nearPl = new THREE.Mesh(nearG, plMat); nearPl.position.set(-2.55, 1.6, 6.5); nearPl.rotation.y = Math.PI / 2; F4.add(nearPl);
plastics.push({m: nearPl, base: Float32Array.from(nearG.attributes.position.array), x: 3.1});
const nearRod = box(0.05, 0.05, 2.6, steelDark, -2.55, 3.1, 6.5, F4, false);
const ghost = makeStick(); scene.add(ghost.root);
const ghostLight = new THREE.PointLight(0xffe9c0, 0, 3, 1.5); scene.add(ghostLight);
// schedule board near the work light
const boardTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f2f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
  g.fillStyle = '#1d2a5c'; g.font = '700 82px Caveat'; g.fillText('JADWAL TUKANG — LT. 4', 60, 120);
  g.font = '700 62px Caveat'; g.fillStyle = '#26324f';
  g.fillText('Senin: tarik kabel  ✓', 70, 230); g.fillText('Selasa: pasang bata  ✓', 70, 310); g.fillText('Rabu: plester  ✓', 70, 390);
  g.fillStyle = '#b3201a'; g.font = '700 74px Caveat'; g.fillText('BESOK 07.00 →', 70, 500); g.fillText('TUTUP DINDING LT. 4', 70, 585);
});
const boardRed = canvasTex(1024, 640, (g, w, h) => { g.clearRect(0, 0, w, h); });
function drawBoardCircle(k) { const {g, c} = boardRed.userData; g.clearRect(0, 0, c.width, c.height); if (k <= 0) return;
  g.strokeStyle = '#c4231b'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.ellipse(390, 545, 350, 72, -0.03, -Math.PI * 0.9, -Math.PI * 0.9 + Math.PI * 2.1 * k); g.stroke(); boardRed.needsUpdate = true; }
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

// ---------- EXTERIOR (x = -100): 4-storey building, morning ----------
const EXT = new THREE.Group(); EXT.position.set(-100, 0, 0); scene.add(EXT);
const facadeTex = concreteTex('#cbbfa6', 512, 512, 21); facadeTex.repeat.set(3, 3);
box(12, 13.2, 8, new THREE.MeshStandardMaterial({map: facadeTex, roughness: 0.95}), 0, 6.6, -4, EXT);
box(12.3, 0.5, 8.3, std(0xb5aa92), 0, 13.3, -4, EXT); // roof parapet
box(1.2, 1.4, 1.2, std(0x9a927f), 3.5, 14.2, -5, EXT); // roof hut
const glassMat = std(0x2a3b4e, {r: 0.15, m: 0.3});
const winMeshes = [];
for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) {
  const wx = -4.4 + c * 2.2, wy = (f === 0 ? 1.7 : 1.9) + f * 3.2;
  if (f === 0 && c === 2) continue;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.5), glassMat.clone()); m.position.set(wx, wy, 0.02); EXT.add(m);
  box(1.55, 0.1, 0.18, std(0xe6dccb), wx, wy - 0.8, 0.07, EXT, false);
  winMeshes.push({m, f, c});
}
// lobby door + sign
box(2.0, 2.5, 0.1, std(0x34485a, {r: 0.2, m: 0.4}), 0, 1.25, 0.05, EXT);
const gedungTex = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, w, h); g.font = 'bold 54px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f0e6cf'; g.fillText('WISMA KENANGA', w / 2, h / 2 + 3); });
const gsign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshBasicMaterial({map: gedungTex})); gsign.position.set(0, 2.85, 0.1); EXT.add(gsign);
// the top-row window with Rudi's lamp (floor 4, column 3)
const topWin = winMeshes.find(w => w.f === 3 && w.c === 3);
const winTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2a2219'; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(170, 120, 5, 170, 120, 150); r.addColorStop(0, 'rgba(255,200,120,.85)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.fillStyle = '#5a4330'; g.fillRect(60, 175, 180, 14); g.fillStyle = '#1f4f3a'; g.beginPath(); g.moveTo(150, 120); g.lineTo(190, 120); g.lineTo(205, 150); g.lineTo(135, 150); g.closePath(); g.fill();
  g.fillStyle = '#111'; g.fillRect(168, 150, 5, 26); g.fillStyle = '#fff1c8'; g.beginPath(); g.arc(170, 156, 9, 0, 7); g.fill();
  g.strokeStyle = '#d9cfbd'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); });
topWin.m.material = new THREE.MeshBasicMaterial({map: winTex});
const extLamp = {intensity: 0};
const lampGlowSprite = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,214,140,.9)'); r.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
lampGlowSprite.position.set(topWin.m.position.x + 0.3, topWin.m.position.y + 0.1, 0.05); EXT.add(lampGlowSprite);
// counting highlight frames
const hlMat = new THREE.MeshBasicMaterial({color: 0xffe08a, transparent: true, opacity: 0, side: THREE.DoubleSide});
const hls = [0, 1, 2, 3].map(f => { const r = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.0, 4), hlMat.clone());
  const fr = new THREE.Group(); const w = 1.75, hh = 1.85, th = 0.11; const yy = (f === 0 ? 1.7 : 1.9) + f * 3.2;
  for (const [x, y, ww, hhh] of [[0, hh / 2, w, th], [0, -hh / 2, w, th], [-w / 2, 0, th, hh], [w / 2, 0, th, hh]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, hhh), hlMat.clone()); m.position.set(x, y, 0); fr.add(m); }
  fr.position.set(-2.2, yy, 0.3); EXT.add(fr); return fr; });
// street
box(30, 0.2, 3, std(0x9c9a93), 0, 0.1, 1.6, EXT); // sidewalk
const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), std(0x3b3d40)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 9); road.receiveShadow = true; EXT.add(road);
for (let i = -6; i < 7; i++) box(1.4, 0.02, 0.15, std(0xe8e2c8), i * 3, 0.03, 9, EXT, false);
for (const x of [-13, 13]) box(10, 10 + (x > 0 ? 3 : 0), 8, std(0x9fa7ad), x, 5 + (x > 0 ? 1.5 : 0), -4, EXT);
const pole = box(0.12, 6, 0.12, std(0x3c4146), 5.5, 3, 2.6, EXT);
const sun = new THREE.DirectionalLight(0xffe2b8, 0); sun.position.set(-100 + 12, 20, 18); sun.target.position.set(-100, 4, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 18, bottom: -4}); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);
const guard = makeStick(); scene.add(guard.root); guard.extras.forEach(e => e.visible = false);
{ const capMat = std(0x1d2b4a, {r: 0.6}); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.08, 24), capMat); cap.position.y = 0.11; guard.head.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 20, 1, false, -Math.PI / 2, Math.PI), capMat); brim.position.set(0, 0.075, 0.1); brim.rotation.y = Math.PI; guard.head.add(brim);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), std(0xd9b44a, {m: 0.6, r: 0.4})); badge.position.set(0.06, 0.32, 0.06); guard.torso.add(badge); }

function resetPart2() {
  STW.visible = true; EXT.visible = true; ghost.root.visible = false; guard.root.visible = false; ghostLight.intensity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); sun.intensity = 0; ambient.intensity = 0.7; ambient.color.set(0x46566c);
  nearPl.visible = false; nearRod.visible = false; drawBoardCircleIf(0); nicheLight.intensity = 0; print.material.opacity = 0; pushGlove.position.z = 0.08; ghost.head.rotation.z = 0; fadeEl.style.opacity = 0;
  hls.forEach(h => h.children.forEach(m => m.material.opacity = 0)); f4StairDoor.rotation.y = 0; f4StairDoor.position.set(-4.47, 1.02, 6.5);
  ghost.root.rotation.set(0, 0, 0);
}
let _bc = -1; function drawBoardCircleIf(k) { k = Math.round(k * 40) / 40; if (k !== _bc) { _bc = k; drawBoardCircle(k); } }
function stairPos(k, floorOff = 0) { // k 0..1 along flight A (0 top) ; returns pos in STW local + world
  return V(-40 + 0.6, -0.16 * 10 * k + 0.02 + floorOff, -0.1 - 2.6 * k); }
function stairPosC(k, floorOff = 0) { return V(-40 + 2.0, -1.6 - 1.6 * k + 0.02 + floorOff, -2.6 + 2.6 * k); }
// Drive the cycle from distance, and ease into a planted pose at each landing.
function stairGait(progress, distance, cycle, strength = 1) {
  const blend = ease(progress / 0.08) * ease((1 - progress) / 0.08);
  return cycle(progress * distance * Math.PI / 0.62, strength * blend);
}
const FLIGHT_LENGTH = Math.hypot(2.6, 1.6);
function rudiAt(p, yaw) { rudi.root.position.copy(p); rudi.root.rotation.y = yaw; }
function runPose(phase, strength = 1) {
  return {
    ...walkPose(phase, 1.35 * strength),
    lean: 0.25 * strength,
    le: lerp(0.15, 1.1, strength),
    re: lerp(0.15, 1.1, strength),
  };
}
const st = (t, t0, rate = 8) => (t - t0) * rate;

shots.push(
  {name: 'stairs-down-1', t0: 27.4, t1: 30.6, f(t) {
    const k = seg(t, 27.9, 30.3);
    const position = stairPos(lerp(0.17, 1, k)); rudiAt(position, Math.PI);
    rudi.pose({...stairGait(k, 0.83 * FLIGHT_LENGTH, walkPose, 0.8), head: [0, -0.25], eyes: 1.1, brow: 0.3});
    cam(position.clone().add(V(0.34, 1.2, -1.57)), position.clone().add(V(0, 0.9, 0)), 65);
  }},
  {name: 'door-4-a', t0: 30.6, t1: 32.7, f(t) {
    const k = seg(t, 30.6, 31.7); rudiAt(stairPosC(k), 0);
    const stop = t > 31.7; rudi.pose(stop ? {head: [-0.5, 0.05], eyes: 1.2, brow: 0.4} : stairGait(k, FLIGHT_LENGTH, walkPose, 0.8));
    const push = seg(t, 31.9, 32.7);
    cam(V(-38.9, -1.7, -1.6).lerp(V(-38.6, -1.85, -0.2), push), V(-38.25, -1.9, 1.6), lerp(48, 40, push));
  }},
  {name: 'stairs-down-2', t0: 32.7, t1: 33.9, f(t) {
    const k = seg(t, 32.7, 33.85); rudiAt(stairPos(k, 0), Math.PI);
    rudi.pose({...stairGait(k, FLIGHT_LENGTH, runPose), head: [0, -0.2], eyes: 1.2, brow: 0.5});
    cam(V(-39.6, -0.15, -4.1), V(-39.4, 0.5, -0.6), 54);
  }},
  {name: 'door-4-b', t0: 33.9, t1: 35.0, f(t) {
    rudi.root.visible = false; const p = seg(t, 33.9, 34.4);
    cam(V(-38.25, -1.9, -1.0).lerp(V(-38.25, -1.9, 0.6), p), V(-38.25, -1.9, 1.6), 46);
  }},
  {name: 'stairs-run-3', t0: 35.0, t1: 36.2, f(t) {
    const k = seg(t, 35.0, 36.15); rudiAt(stairPosC(k), 0);
    rudi.pose({...stairGait(k, FLIGHT_LENGTH, runPose), head: [0, -0.15], eyes: 1.3, brow: 0.6});
    cam(V(-37.0, -0.9, -3.8), V(-38.0, -2.4, -0.5), 54);
  }},
  {name: 'still-4', t0: 36.2, t1: 37.4, f(t) {
    rudiAt(V(-37.95, -3.18, 0.85), Math.PI); const turn = seg(t, 36.25, 36.6);
    rudi.pose({head: [lerp(0.4, 0, turn), 0.1], eyes: 1.4, mouth: 'o', brow: 0.8, la: [0.1, 0.35], ra: [0.1, 0.35]});
    cam(V(-38.3, -1.7, -1.3), V(-38.1, -1.95, 1.4), 44);
  }},
  {name: 'plastic-near', t0: 37.4, t1: 40.8, f(t) {
    nearPl.visible = nearRod.visible = true; swayPlastic(t, 1.0);
    const op = seg(t, 37.45, 38.0), r = -1.3 * op; f4StairDoor.rotation.y = r; f4StairDoor.position.set(-4.47 - 0.475 * Math.sin(r), 1.02, 6.975 - 0.475 * Math.cos(r));
    const w = seg(t, 37.8, 38.7); rudiAt(V(lerp(-4.6, -3.7, w), 0.02, 6.5), Math.PI / 2);
    rudi.pose({...(w > 0 && w < 1 ? walkPose(st(t, 37.8), 0.7) : {}), head: [0, 0], eyes: lerp(1.1, 1.45, seg(t, 38.9, 39.3)), mouth: t > 39.3 ? 'o' : 'flat', brow: 0.6});
    cam(V(-1.3, 1.55, 5.2).lerp(V(-1.55, 1.52, 5.6), seg(t, 38, 40.8)), V(-4.3, 1.25, 6.6), 46);
  }},
  {name: 'ghost-behind', t0: 40.8, t1: 43.6, f(t) {
    nearPl.visible = nearRod.visible = true; swayPlastic(t, 0.5);
    rudiAt(V(-3.7, 0.02, 6.5), Math.PI / 2); rudi.pose({eyes: 1.4, brow: 0.7, mouth: 'flat'});
    ghost.root.visible = true; const g = seg(t, 41.1, 42.6); ghost.root.position.set(lerp(-1.2, -2.15, g), 0.02, 6.55); ghost.root.rotation.y = -Math.PI / 2;
    ghost.pose({eyes: 1.0, head: [0, 0], mouth: 'none'}); ghostLight.position.set(-2.4, 1.7, 6.2); ghostLight.intensity = 1.2 * g;
    cam(V(-4.2, 1.98, 5.75), V(-2.2, 1.45, 6.6), 40);
  }},
  {name: 'ghost-face', t0: 43.6, t1: 44.9, f(t) {
    nearPl.visible = nearRod.visible = true; swayPlastic(t, 0.4);
    rudi.root.visible = false; ghost.root.visible = true; ghost.root.position.set(-2.15, 0.02, 6.55); ghost.root.rotation.y = -Math.PI / 2;
    const tilt = seg(t, 44.0, 44.6); ghost.pose({head: [0, 0], eyes: 1.0, mouth: 'none'}); ghost.head.rotation.z = 0.25 * tilt; ghostLight.position.set(-2.42, 1.65, 6.3); ghostLight.intensity = 2.2;
    cam(V(-3.05, 1.56, 6.55), V(-2.15, 1.55, 6.55), 34);
  }},
  {name: 'rudi-terror', t0: 44.9, t1: 46.2, f(t) {
    nearPl.visible = nearRod.visible = true; swayPlastic(t, 0.4);
    rudiAt(V(-3.7, 0.02, 6.5), Math.PI / 2); const back = seg(t, 45.4, 46.0);
    rudi.root.position.x = -3.7 - 0.25 * back;
    rudi.pose({eyes: 1.6, mouth: 'o', brow: 1.0, la: [0.5 * back, 0.3], ra: [0.5 * back, 0.3], lean: -0.15 * back});
    cam(V(-2.75, 1.5, 6.55), V(-3.7, 1.52, 6.5), 36);
  }},
  {name: 'run-front', t0: 46.2, t1: 48.3, f(t) {
    const k = clamp((t - 46.2) / 4.0); rudiAt(V(lerp(-3.4, 0.4, k), 0.02, lerp(7.0, 16.0, k)), Math.atan2(3.8, 9.0));
    rudi.pose({...runPose(st(t, 46.2, 12)), eyes: 1.4, mouth: 'o', brow: 0.8});
    swayPlastic(t, 0.6); const c = V(lerp(-1.0, 0.6, k) + 0.4, 1.5, lerp(10.8, 18.5, k) + 2.0);
    cam(c, V(rudi.root.position.x, 1.2, rudi.root.position.z), 46);
  }},
  {name: 'run-to-light', t0: 48.3, t1: 50.3, f(t) {
    const k = clamp((t - 46.2) / 4.0); rudiAt(V(lerp(-3.4, 0.4, k), 0.02, lerp(7.0, 16.0, k)), Math.atan2(3.8, 9.0));
    rudi.pose({...runPose(st(t, 46.2, 12)), eyes: 1.4, mouth: 'o', brow: 0.8});
    swayPlastic(t, 0.6); boardLight.intensity = 3;
    cam(V(rudi.root.position.x - 0.8, 1.45, rudi.root.position.z - 2.6), V(1.0, 1.4, 18.5), 50);
  }},
  {name: 'board-wide', t0: 50.3, t1: 52.7, f(t) {
    rudiAt(V(1.6, 0.02, 17.4), 0.35); rudi.pose({head: [0, 0.05], eyes: 1.2, brow: 0.5, lean: 0.05});
    cam(V(0.35, 1.7, 16.0), V(2.55, 1.35, 19.2), 44);
  }},
  {name: 'board-besok', t0: 52.7, t1: 54.7, f(t) {
    rudi.root.visible = false; const p = seg(t, 52.7, 54.7);
    const tgt = BOARD.localToWorld(V(-0.18, 1.32, 0));
    const from = BOARD.localToWorld(V(-0.1, 1.33, 1.05)), to = BOARD.localToWorld(V(-0.12, 1.32, 0.85));
    cam(from.lerp(to, p), tgt, 30);
  }},
  {name: 'board-tutup', t0: 54.7, t1: 57.2, f(t) {
    rudi.root.visible = false; drawBoardCircleIf(seg(t, 55.1, 56.1));
    const tgt = BOARD.localToWorld(V(-0.12, 1.23, 0)); const from = BOARD.localToWorld(V(-0.08, 1.25, 0.95)), to = BOARD.localToWorld(V(-0.1, 1.24, 0.78));
    cam(from.lerp(to, seg(t, 54.7, 57.2)), tgt, 30);
  }},
  {name: 'wall-pan', t0: 57.2, t1: 59.3, f(t) {
    drawBoardCircleIf(1); nicheLight.intensity = 40; rudiAt(V(1.4, 0.02, 18.0), -0.6); rudi.pose({head: [-0.4, 0], eyes: 1.25, brow: 0.5});
    const p = seg(t, 57.2, 59.3);
    cam(V(0.5, 1.6, 16.3), V(lerp(2.4, -1.0, p), 1.2, lerp(19.3, 21.6, p)), 46);
  }},
  {name: 'niche', t0: 59.3, t1: 61.9, f(t) {
    drawBoardCircleIf(1); nicheLight.intensity = 40; rudi.root.visible = false;
    const p = seg(t, 59.3, 61.9);
    cam(V(-1.0, 1.1, 18.4).lerp(V(-1.0, 1.05, 19.4), p), V(-1.0, 0.95, 21.6), 46);
  }},
  {name: 'niche-match', t0: 61.9, t1: 63.5, f(t) {
    drawBoardCircleIf(1); nicheLight.intensity = 40;
    rudiAt(V(-1.0, 0.0, 20.75), Math.PI); rudi.pose({head: [0, 0], eyes: 1.3, brow: 0.6, la: [0.04, 0.12], ra: [0.04, 0.12]});
    cam(V(-1.0, 1.0, 17.0), V(-1.0, 0.95, 21.0), 36);
  }},
  {name: 'cement-wet', t0: 63.5, t1: 65.0, f(t) {
    nicheLight.intensity = 40; rudi.root.visible = false; const p = seg(t, 63.5, 65.0);
    cam(V(-0.75, 1.25, 19.9).lerp(V(-0.85, 1.2, 20.3), p), V(-1.0, 1.0, 21.48), 32);
  }},
  {name: 'glove-print', t0: 65.0, t1: 67.7, f(t) {
    nicheLight.intensity = 40; rudi.root.visible = false; print.material.opacity = seg(t, 65.4, 66.1);
    const tgt = NICHE.localToWorld(V(0.22, 0.82, 0.12));
    cam(NICHE.localToWorld(V(0.16, 0.86, 0.62)).lerp(NICHE.localToWorld(V(0.2, 0.82, 0.46)), seg(t, 65, 67.7)), tgt, 38);
  }},
  {name: 'push-from-inside', t0: 67.7, t1: 69.9, f(t) {
    nicheLight.intensity = 40; rudi.root.visible = false; print.material.opacity = 1;
    pushGlove.position.z = lerp(0.08, 0.138, seg(t, 68.0, 68.9));
    const tgt = NICHE.localToWorld(V(-0.05, 1.12, 0.1));
    cam(NICHE.localToWorld(V(-0.1, 1.04, 0.55)), tgt, 36, t > 68.0 && t < 68.9 ? shake(t, 0.006, 20) : null);
    fadeTo(seg(t, 69.55, 69.9));
  }},
  {name: 'morning-count', t0: 69.9, t1: 74.4, f(t) {
    morning(); rudi.root.visible = false; guard.root.visible = true; guard.root.position.set(-101.0, 0.2, 3.0); guard.root.rotation.y = Math.PI + 0.1;
    const ct = clamp((t - 70.9) / 2.8) * 4; const cur = Math.min(3, Math.floor(ct));
    guard.pose({la: [lerp(0.2, 1.6, seg(t, 70.4, 70.9)) + 0.25 * cur, 0.25], le: 0.1, head: [0, lerp(0, 0.45, seg(t, 70.2, 70.9)) + 0.12 * cur], eyes: 1.1});
    guard.L.finger.visible = t > 70.9;
    hls.forEach((h, i) => h.children.forEach(m => m.material.opacity = ct > i ? 0.85 : 0));
    cam(V(-98.6, 1.4, 9.2), V(-101.6, 4.8, 0), 54);
    fadeTo(1 - seg(t, 69.9, 70.4));
  }},
  {name: 'facade-tilt', t0: 74.4, t1: 77.8, f(t) {
    morning(); guard.root.visible = true; guard.root.position.set(-101.0, 0.2, 3.0); guard.root.rotation.y = Math.PI + 0.1;
    guard.pose({la: [0.3, 0.2], head: [0, 0.6], eyes: 1.25, mouth: 'o'});
    hls.forEach(h => h.children.forEach(m => m.material.opacity = 0.85 * (1 - seg(t, 75.5, 76.5))));
    const p = seg(t, 74.4, 77.6);
    cam(V(-100 + 0.5, lerp(3.0, 9.0, p), 16), V(-100, lerp(6.0, 14.5, p), 0), 48);
  }},
  {name: 'lamp-window', t0: 77.8, t1: 83.6, f(t) {
    morning(); const p = seg(t, 77.8, 82.6);
    const w = topWin.m.position; const wp = V(-100 + w.x, w.y, 0);
    extLamp.intensity = 5 + Math.sin(t * 3) * 0.3;
    cam(V(wp.x - 1.5, wp.y - 2.5, 14).lerp(V(wp.x + 0.15, wp.y - 0.05, 2.4), p), V(wp.x + 0.2, wp.y - 0.05, -0.5), lerp(40, 30, p));
    fadeTo(seg(t, 82.4, 83.4));
  }},
);
function morning() {
  scene.background.set(0xc9d6e2); scene.fog.color.set(0xc9d6e2); scene.fog.density = 0.008; sun.intensity = 2.6; ambient.intensity = 1.1; ambient.color.set(0xdbe7f2);
  rudi.root.visible = false;
}
function fadeTo(k) { fadeEl.style.opacity = clamp(k); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '700 40px Caveat', '800 40px Nunito'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  // redraw font-dependent textures now that fonts are loaded
  for (const t of [tapeTex, deskClockTex, ...Object.values(btnTex).flat()]) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; }
  drawLed(inLedTex, '5'); drawLed(outLedTex, '4');
  for (const t of [sign4Tex, exitTex, boardTex, gedungTex]) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; }
  scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
function setSets(name) {
  const ext = /morning|facade|lamp-window/.test(name), stw = /stairs|door-4|still-4/.test(name), off = name === 'office-clock';
  OF.visible = off; STW.visible = stw; EXT.visible = ext; sun.visible = ext; F4.visible = CAB.visible = !(ext || stw || off);
}
window.renderAt = (t) => {
  resetState();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  setSets(s.name);
  s.f(t);
  renderer.render(scene, camera);
  overlay(t);
  return s.name;
};
window.sceneReady = true;
