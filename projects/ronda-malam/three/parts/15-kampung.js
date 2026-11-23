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
