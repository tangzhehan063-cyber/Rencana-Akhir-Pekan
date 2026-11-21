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

