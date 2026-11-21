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
const receiptTex = canvasTex(320, 800, () => {}); receiptTex.userData.dynamic = true;
const receipt = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.275), new THREE.MeshStandardMaterial({map: receiptTex, roughness: 0.8, side: THREE.DoubleSide}));
const receiptPivot = new THREE.Group(); receiptPivot.position.set(0.13, 1.07, 0.16); KIOSK.add(receiptPivot); receiptPivot.add(receipt); receipt.visible = false;
function setReceipt(k) { // k 0..1 = how far it has printed out
  receipt.visible = k > 0.01; const L = 0.275 * k; receipt.scale.y = Math.max(0.001, k); receipt.position.set(0, L / 2, 0.005); receipt.rotation.x = -0.15 - 0.25 * k;
  receipt.material.map.offset.y = 1 - k; receipt.material.map.repeat.y = k; }
receiptTex.wrapT = THREE.ClampToEdgeWrapping;
function drawReceipt() { const g = receiptTex.userData.g, w = 160, h = 400; g.setTransform(2, 0, 0, 2, 0, 0); g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#222'; g.textAlign = 'center'; g.font = '700 15px "Courier New"'; g.fillText('MINIMARKET 24 JAM', w / 2, 30); g.font = '12px "Courier New"'; g.fillText('KASIR MANDIRI #01', w / 2, 48); g.fillText('03:07', w / 2, 64);
  g.fillText('- - - - - - - - - -', w / 2, 86); g.textAlign = 'left'; g.font = '700 14px "Courier New"'; g.fillText('1 x PENJAGA', 12, 118); g.fillText('    MALAM', 12, 136);
  g.textAlign = 'right'; g.fillText('68,0 kg', w - 10, 160); g.textAlign = 'center'; g.font = '12px "Courier New"'; g.fillText('- - - - - - - - - -', w / 2, 186);
  g.font = '900 30px "Courier New"'; g.fillText('LUNAS', w / 2, 232); g.font = '12px "Courier New"'; g.fillText('TERIMA KASIH', w / 2, 270); g.fillText('JANGAN LUPA', w / 2, 300); g.fillText('BARANG ANDA', w / 2, 316);
  for (let i = 0; i < 36; i++) g.fillRect(24 + i * 3.2, 340, hash(i) > 0.4 ? 2 : 1, 34); g.setTransform(1, 0, 0, 1, 0, 0); receiptTex.needsUpdate = true; }
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
      g.fillStyle = p.press ? '#7a1a1c' : '#b3262a'; g.fillRect(272, 300, 200, 60); g.fillStyle = '#d9d6cf'; g.fillRect(40, 300, 200, 60);
      g.fillStyle = '#fff'; g.font = '900 28px Nunito'; g.fillText('BATAL', 372, 340); g.fillStyle = '#333'; g.fillText('BANTUAN', 140, 340); }
  }
  if (state === 'continue') { wrap('Silakan lanjutkan belanja Anda.', 170, 44, '#222'); g.fillStyle = '#3a9b4a'; g.font = '900 64px Nunito'; g.fillText('✓', w / 2, 320); }
  if (state === 'next') { wrap('Pelanggan berikutnya', 160, 46, '#222'); g.fillStyle = '#555'; g.font = '800 26px Nunito'; g.fillText(`Antrean: ${p.n ?? 0}`, w / 2, 290); }
  if (state === 'paid') { g.fillStyle = '#3a9b4a'; g.fillRect(0, 54, w, 64); g.fillStyle = '#fff'; g.font = '900 34px Nunito'; g.fillText('LUNAS', w / 2, 98);
    wrap('1 × Penjaga malam', 178, 40, '#222'); g.fillStyle = '#b3262a'; g.font = '900 64px Nunito'; g.fillText('68,0 kg', w / 2, 300); }
  screenTex.needsUpdate = true;
}
function kioskLamp(v) { lampMat.emissiveIntensity = 3 * v; lampLight.intensity = 3.5 * v; }

// ---- ending prop: plastic shopping bag on the scale with Bayu's red vest sticking out ----
const bagProp = new THREE.Group(); bagProp.position.set(0, 0.785, 0); BAG.add(bagProp); bagProp.visible = false;
{ const pm = new THREE.MeshStandardMaterial({color: 0xf1f0ea, roughness: 0.55, transparent: true, opacity: 0.93});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.32, 18), pm); body.scale.set(1.25, 1, 0.8); body.position.y = 0.16; body.castShadow = true; bagProp.add(body);
  for (const x of [-0.1, 0.1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14, Math.PI), pm); h.position.set(x, 0.32, 0); bagProp.add(h); }
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.06), new THREE.MeshToonMaterial({color: 0xb3262a, gradientMap: toonRamp})); vest.position.set(0.02, 0.33, 0.01); vest.rotation.set(0.3, 0.4, 0.5); bagProp.add(vest);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.006), new THREE.MeshToonMaterial({color: 0xf2efe6, gradientMap: toonRamp})); tag.position.set(0.04, 0.36, -0.03); tag.rotation.copy(vest.rotation); bagProp.add(tag); }
