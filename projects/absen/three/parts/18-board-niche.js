// schedule board near the work light
const boardTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f2f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
  g.fillStyle = '#1d2a5c'; g.font = '700 82px Caveat'; g.fillText('JADWAL TUKANG — LT. 4', 60, 120);
  g.font = '700 62px Caveat'; g.fillStyle = '#26324f';
  g.fillText('Rabu: plester  ✓', 70, 220); g.fillText('Kamis 07.00: tutup dinding  ✓', 70, 300); g.strokeStyle = '#26324f'; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 282); g.lineTo(760, 290); g.stroke();
  g.fillStyle = '#b3201a'; g.font = '700 74px Caveat'; g.fillText('BESOK 07.00 →', 70, 420); g.fillText('TUTUP DINDING', 70, 505); g.font = '700 96px Caveat'; g.fillText('SATPAM', 520, 595);
});
const boardRed = canvasTex(1024, 640, (g, w, h) => { g.clearRect(0, 0, w, h); });
function drawBoardCircle(k) { const {g, c} = boardRed.userData; g.clearRect(0, 0, c.width, c.height); if (k <= 0) return;
  g.strokeStyle = '#c4231b'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.ellipse(680, 565, 205, 70, -0.04, -Math.PI * 0.9, -Math.PI * 0.9 + Math.PI * 2.1 * k); g.stroke(); boardRed.needsUpdate = true; }
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

