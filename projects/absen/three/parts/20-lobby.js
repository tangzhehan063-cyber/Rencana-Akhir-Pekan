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
