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
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.92; root.add(hips);
  const limb = (len, r = 0.034) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), black);
    m.position.y = -len / 2; m.castShadow = true; g.add(m); const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), black); g.add(j); return g; };
  // torso
  const torso = new THREE.Group(); hips.add(torso);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.52, 12), black); spine.position.y = 0.26; spine.castShadow = true; torso.add(spine);
  // tie + id card
  const tieMat = std(0x8c1c1c, {r: 0.7});
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.03), tieMat); knot.position.set(0, 0.46, 0.045); torso.add(knot);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.3, 0.014), tieMat); tie.position.set(0, 0.29, 0.05); tie.rotation.x = -0.06; tie.castShadow = true; torso.add(tie);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.008), std(0x2f6fb5, {r: 0.5})); card.position.set(0.075, 0.31, 0.045); torso.add(card);
  const lan = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.004, 4, 16, Math.PI), black); lan.position.set(0.03, 0.42, 0.02); lan.rotation.z = Math.PI; torso.add(lan);
  // head
  const neck = new THREE.Group(); neck.position.y = 0.52; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.155; neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.155, 40, 30), white); skull.castShadow = true; head.add(skull);
  const ol = new THREE.Mesh(new THREE.SphereGeometry(0.155 * 1.06, 32, 24), outlineMat); head.add(ol);
  const eyeGeo = new THREE.SphereGeometry(0.02, 14, 12);
  const eyes = [-0.05, 0.05].map(x => { const e = new THREE.Mesh(eyeGeo, black); e.position.set(x, 0.025, 0.146); e.scale.set(0.8, 1.15, 0.45); head.add(e); return e; });
  const pupils = eyes.map(e => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({color: 0xffffff})); p.position.set(0.006, 0.01, 0.02); e.add(p); return p; });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.01), black); mouth.position.set(0, -0.062, 0.142); head.add(mouth);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.005, 6, 16), black); mouthO.position.set(0, -0.066, 0.143); head.add(mouthO);
  const brows = [-0.05, 0.05].map((x, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.01), black); b.position.set(x, 0.068, 0.14); head.add(b); return b; });
  // arms (pivot at shoulder on spine)
  const mkArm = side => { const sh = new THREE.Group(); sh.position.set(side * 0.01, 0.42, 0); torso.add(sh);
    const up = limb(0.31); sh.add(up); const el = new THREE.Group(); el.position.y = -0.31; up.add(el);
    const fo = limb(0.29); el.add(fo); const wr = new THREE.Group(); wr.position.y = -0.29; fo.add(wr);
    const glove = new THREE.Group(); wr.add(glove);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 14), white); palm.scale.set(1, 1.12, 0.78); palm.position.y = -0.04; palm.castShadow = true; glove.add(palm);
    const pol = new THREE.Mesh(new THREE.SphereGeometry(0.06 * 1.1, 14, 10), outlineMat); pol.scale.copy(palm.scale); pol.position.copy(palm.position); glove.add(pol);
    const th = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), white); th.position.set(side * -0.045, -0.025, 0.02); glove.add(th);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.013, 8, 16), white); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.0; glove.add(cuff);
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), white); finger.position.set(0, -0.1, 0.0); finger.visible = false; glove.add(finger);
    return {sh, el, wr, finger}; };
  const L = mkArm(1), R = mkArm(-1);
  const mkLeg = side => { const hp = new THREE.Group(); hp.position.set(side * 0.04, 0, 0); hips.add(hp);
    const th = limb(0.44); hp.add(th); const kn = new THREE.Group(); kn.position.y = -0.44; th.add(kn);
    const sh = limb(0.44); kn.add(sh); const foot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), black); foot.scale.set(0.85, 0.5, 1.6); foot.position.set(0, -0.455, 0.04); foot.castShadow = true; sh.add(foot);
    return {hp, kn}; };
  const LL = mkLeg(1), RL = mkLeg(-1);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  function pose(p) {
    const P = Object.assign({la: [0.05, 0.12], le: 0.15, ra: [0.05, 0.12], re: 0.15, ll: [0, 0.03], lk: 0, rl: [0, 0.03], rk: 0,
      head: [0, 0], lean: 0, eyes: 1, look: [0, 0], mouth: 'flat', brow: 0, hipY: 0, point: 0}, p);
    L.sh.rotation.set(-P.la[0], 0, P.la[1]); L.el.rotation.set(-P.le, 0, 0);
    R.sh.rotation.set(-P.ra[0], 0, -P.ra[1]); R.el.rotation.set(-P.re, 0, 0);
    LL.hp.rotation.set(-P.ll[0], 0, P.ll[1]); LL.kn.rotation.set(P.lk, 0, 0);
    RL.hp.rotation.set(-P.rl[0], 0, -P.rl[1]); RL.kn.rotation.set(P.rk, 0, 0);
    torso.rotation.set(P.lean, 0, 0); hips.position.y = 0.92 + P.hipY;
    neck.rotation.set(-P.head[1], P.head[0], 0);
    eyes.forEach(e => { e.scale.set(0.8 * (0.85 + 0.15 * P.eyes), 1.15 * P.eyes, 0.45); e.position.x = Math.sign(e.position.x) * 0.05 + P.look[0] * 0.016; e.position.y = 0.025 + P.look[1] * 0.016; });
    pupils.forEach(p => p.visible = P.eyes > 1.15);
    mouth.visible = P.mouth === 'flat'; mouthO.visible = P.mouth === 'o';
    mouthO.scale.setScalar(P.mouth === 'o' ? 1 : 1);
    brows.forEach((b, i) => { b.visible = Math.abs(P.brow) > 0.01; b.rotation.z = (i ? -1 : 1) * P.brow * 0.5; b.position.y = 0.068 + Math.abs(P.brow) * 0.012; });
    L.finger.visible = P.point > 0.5;
  }
  pose({});
  return {root, pose, head, torso, L, R};
}
function walkPose(ph, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.42 * s * amt, 0.03], lk: Math.max(0, -c) * 0.7 * amt + 0.05, rl: [-0.42 * s * amt, 0.03], rk: Math.max(0, c) * 0.7 * amt + 0.05,
    la: [-0.35 * s * amt, 0.1], ra: [0.35 * s * amt, 0.1], le: 0.3, re: 0.3, hipY: -0.025 * Math.abs(Math.cos(ph)) * amt};
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
box(3.9, 3.2, 0.25, lw, -2.55, 1.6, -0.12, F4); box(3.9, 3.2, 0.25, lw, 2.55, 1.6, -0.12, F4); box(1.2, 1.0, 0.25, lw, 0, 2.7, -0.12, F4);
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
const plMat = new THREE.MeshStandardMaterial({color: 0xe3ecf0, emissive: 0x2a3036, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.45, depthWrite: false});
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
box(1.62, 0.1, 0.25, steelDark, 0, 2.27, -0.12, CAB, false); // header inside
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
  doorL.position.x = -0.3; doorR.position.x = 0.3; cabLight.intensity = 5.5; cabLightPanel.material.color.set(0xfff3d6); cabSpill.intensity = 45;
  redLight.intensity = 0; drawLedIf(inLedTex, '5'); tapeGlow.intensity = 0; tapeGlowPlane.material.opacity = 0;
  for (const k in btn) setBtn(k, false); monScreen.visible = true; monLight.intensity = 4.5; workLight.intensity = 300; workFill.intensity = 14; coldFill.intensity = 4;
  rudi.root.rotation.set(0, 0, 0); rudi.root.scale.setScalar(1); cabLight.castShadow = true; swayPlastic(0, 1); renderer.toneMappingExposure = 1.0;
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
    const fl = flicker(t, 1.55, 0.45); cabLight.intensity = 5.5 * fl; cabLightPanel.material.color.setScalar(fl > .5 ? 1 : 0.45);
    cam(V(-0.45, 1.25, -1.52), V(0.0, 2.45, -0.2), 64, shake(t, four ? 0.03 * (1 - seg(t, 1.6, 2.2)) : 0.002));
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
    const fl = flicker(t, 13.55, 0.6); cabLight.intensity = 5.5 * fl; cabLightPanel.material.color.setScalar(fl > .5 ? 1 : 0.45);
    const jolt = stop ? 0.05 * Math.exp(-(t - 13.55) * 5) : 0;
    cam(V(-0.62, 1.55, -0.12), V(0.0, 1.55, -1.0), 50, shake(t, jolt + 0.002, 26));
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

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '700 40px Caveat', '800 40px Nunito'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  // redraw font-dependent textures now that fonts are loaded
  for (const t of [tapeTex, deskClockTex, ...Object.values(btnTex).flat()]) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; }
  drawLed(inLedTex, '5'); drawLed(outLedTex, '4');
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  resetState();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  renderer.render(scene, camera);
  overlay(t);
  return s.name;
};
window.sceneReady = true;
