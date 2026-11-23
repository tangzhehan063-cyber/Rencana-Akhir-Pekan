// ---------- CAST ----------
const toonM = c => new THREE.MeshToonMaterial({color: c, gradientMap: toonRamp});
function inkedMesh(geo, mat, parent, inkScale = 1.12) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; const o = new THREE.Mesh(geo.clone(), inkMat); o.scale.setScalar(inkScale); m.add(o); parent.add(m); return m; }
function addTorsoWrap(actor, color, h = 0.3, y = 0.24) { // jacket/shirt shell over the torso
  const geo = new THREE.CylinderGeometry(0.074, 0.068, h, 20); const v = new THREE.Mesh(geo, toonM(color)); v.position.y = y; v.scale.set(1.08, 1, 0.84); v.castShadow = true; actor.chest.add(v);
  const ol = new THREE.Mesh(geo.clone(), inkMat); ol.position.copy(v.position); ol.scale.set(1.1, 1.02, 0.9); actor.chest.add(ol); return v; }
function addFlashlight(actor, withLight = false) { // held in the right glove, beam along the forearm direction
  const f = new THREE.Group(); f.position.set(0, -0.06, 0.02); f.rotation.x = Math.PI / 2; actor.R.glove.add(f);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 10), std(0x2c2c2e, {r: 0.4, m: 0.5})); body.position.y = 0.06; f.add(body);
  const lensM = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 0}); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), lensM); lens.position.y = 0.161; lens.rotation.x = -Math.PI / 2; f.add(lens);
  let L = null; if (withLight) { L = new THREE.SpotLight(0xfff0c8, 0, 12, 0.32, 0.5, 1.4); L.position.y = 0.17; const tgt = new THREE.Object3D(); tgt.position.y = 3; f.add(L, tgt); L.target = tgt; }
  return {f, lensM, L, set(on) { lensM.emissiveIntensity = on ? 1.6 : 0; if (L) L.intensity = on ? 7 : 0; }};
}
// Dimas: young, green checked sarung over the shoulder
const dimas = makeStick({tie: false, card: false}); scene.add(dimas.root); addTorsoWrap(dimas, 0x2d3440); dimas.setBlinkSeed(0.4);
{ const sar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 24), toonM(0x3f6b3a)); sar.scale.set(1, 1.7, 0.75); sar.rotation.z = 0.7; sar.position.set(0, 0.26, 0); dimas.chest.add(sar); }
// Pak Harjo: older, black peci + mustache, brown jacket
const harjo = makeStick({tie: false, card: false, mustache: true}); scene.add(harjo.root); addTorsoWrap(harjo, 0x5a4330); harjo.setBlinkSeed(1.7);
{ const peci = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.13, 0.085, 24), toonM(0x111111)); peci.position.y = 0.105; harjo.head.add(peci); const o = new THREE.Mesh(peci.geometry.clone(), inkMat); o.scale.set(1.08, 1.12, 1.08); peci.add(o); }
// Udin: orange kupluk (beanie)
const udin = makeStick({tie: false, card: false}); scene.add(udin.root); addTorsoWrap(udin, 0x3b4b5c); udin.setBlinkSeed(2.3);
{ const k = new THREE.Mesh(new THREE.SphereGeometry(0.146, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), toonM(0xc4612a)); k.position.y = 0.012; udin.head.add(k); const o = new THREE.Mesh(k.geometry.clone(), inkMat); o.scale.setScalar(1.07); k.add(o); }
// Bambang: dark blue hooded jacket
const bambang = makeStick({tie: false, card: false}); scene.add(bambang.root); addTorsoWrap(bambang, 0x1f2a48, 0.34, 0.22); bambang.setBlinkSeed(3.1);
{ const hood = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), toonM(0x1f2a48)); hood.rotation.x = Math.PI / 2; hood.position.set(0, 0.47, -0.03); bambang.chest.add(hood); }
const crew = [dimas, harjo, udin, bambang];
const lights = {dimas: addFlashlight(dimas, true), harjo: addFlashlight(harjo, true), udin: addFlashlight(udin), bambang: addFlashlight(bambang)};
function torches(on) { Object.values(lights).forEach(l => l.set(on)); }

// The fifth: never rendered to the camera, only casts a shadow (and later shows as a hand on the door).
const fifth = makeStick({tie: false, card: false}); scene.add(fifth.root); fifth.root.visible = false;
const ghostMat = new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false});
fifth.root.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = true; } });
// a pale hand for the final shot (the only visible part)
const ghostHand = new THREE.Group(); scene.add(ghostHand); ghostHand.visible = false;
{ const pm = new THREE.MeshToonMaterial({color: 0xcfd3cc, gradientMap: toonRamp});
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), pm); palm.scale.set(1, 1.15, 0.7); ghostHand.add(palm); const o = new THREE.Mesh(palm.geometry.clone(), inkMat); o.scale.setScalar(1.15); palm.add(o);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.07, 4, 8), pm); f.position.set(-0.03 + i * 0.03, 0.085, 0); palm.add(f); }
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.4, 4, 10), new THREE.MeshToonMaterial({color: 0x15161a, gradientMap: toonRamp})); arm.position.set(0, -0.28, -0.02); ghostHand.add(arm); }
