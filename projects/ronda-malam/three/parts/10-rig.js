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
