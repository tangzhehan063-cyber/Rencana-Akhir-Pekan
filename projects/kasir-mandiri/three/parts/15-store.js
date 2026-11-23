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
    g.fillStyle = 'rgba(70,64,55,.22)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 3, 0, 6, h); g.fillRect(0, i * 128 - 3, w, 6); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 10); t.anisotropy = 16; return t;
}
const floorMat = new THREE.MeshStandardMaterial({map: tileTex(), roughness: 0.72, metalness: 0.0});
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
const monBody = box(0.46, 0.34, 0.08, std(0x1a1b1d, {r: 0.5}), -0.55, 1.2, 0.12, COUNTER); monBody.rotation.y = 0.9;
box(0.05, 0.2, 0.05, std(0x1a1b1d), -0.55, 1.05, 0.15, COUNTER);
const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({color: 0x222222})); monScreen.position.set(0, 0, 0.041); monBody.add(monScreen);

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
