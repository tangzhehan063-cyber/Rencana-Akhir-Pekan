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
