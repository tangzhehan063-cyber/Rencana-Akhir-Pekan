// ---------- DEMO SET: a small dark room (replace with the film's own sets) ----------
// Conventions: one THREE.Group per set, hidden by reset(), shown by the shots that use it. Matte surfaces (roughness 1)
// avoid the specular hotspots ABSEN got from a glossy floor under a strong spot.
const ROOM = new THREE.Group(); scene.add(ROOM);
{ const floorTex = concreteTex('#5f6162', 512, 512, 3); floorTex.repeat.set(3, 4);
  const wallTex = concreteTex('#6e706f', 512, 512, 7); wallTex.repeat.set(3, 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({map: floorTex, roughness: 1})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; ROOM.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, color: 0x8a8a8a})); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3; ROOM.add(ceil);
  const wm = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1});
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), wm); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 3, 1.5, 0); w.receiveShadow = true; ROOM.add(w); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wm); back.position.set(0, 1.5, -4); back.receiveShadow = true; ROOM.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wm); front.rotation.y = Math.PI; front.position.set(0, 1.5, 4); ROOM.add(front); }
// door on the back wall
const roomDoor = box(0.95, 2.05, 0.06, std(0x4f585c, {r: 0.8}), 0.9, 1.025, -3.97, ROOM);
box(0.08, 0.04, 0.04, steel, 0.5, 1.0, -3.93, ROOM, false);
// table + chair
const tableMat = new THREE.MeshToonMaterial({color: 0x5a4636, gradientMap: toonRamp});
box(1.2, 0.05, 0.7, tableMat, -1.1, 0.76, -2.4, ROOM); for (const [x, z] of [[-1.65, -2.7], [-0.55, -2.7], [-1.65, -2.1], [-0.55, -2.1]]) box(0.05, 0.74, 0.05, black, x, 0.37, z, ROOM, false);
// chair faces +z (toward the usual camera side); seat centre (-1.1, -0.88)
const SEAT_TOP = 0.485, SEAT_AT = V(-1.1, 0, -0.88); // SEAT_TOP feeds actor.metrics.sitHipY(SEAT_TOP)
box(0.46, 0.05, 0.44, tableMat, -1.1, 0.46, -0.88, ROOM); box(0.46, 0.5, 0.05, tableMat, -1.1, 0.72, -1.12, ROOM);
for (const [x, z] of [[-1.3, -0.7], [-0.9, -0.7], [-1.3, -1.08], [-0.9, -1.08]]) box(0.03, 0.44, 0.03, black, x, 0.22, z, ROOM, false);
// wall clock: an unlit screen, capped below the bloom threshold by screenMat()
const clockTex = canvasTex(256, 96, () => {});
function drawClock(s) { const {g, c} = clockTex.userData; if (clockTex.userData.s === s) return; clockTex.userData.s = s;
  g.fillStyle = '#080404'; g.fillRect(0, 0, c.width, c.height); g.font = 'bold 80px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff3020'; g.shadowBlur = 14; g.fillStyle = '#ff4433'; g.fillText(s, c.width / 2, c.height / 2 + 4); g.shadowBlur = 0; clockTex.needsUpdate = true; }
const wallClock = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), screenMat(clockTex)); wallClock.position.set(-2.98, 2.2, -1.6); wallClock.rotation.y = Math.PI / 2; ROOM.add(wallClock);
// ceiling lamp: small deliberate glow (bulb) + a warm point light with physical falloff
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glowMat(0xffe9c0, 1.4)); bulb.position.set(0, 2.55, -1); ROOM.add(bulb);
box(0.01, 0.45, 0.01, black, 0, 2.8, -1, ROOM, false);
const lamp = new THREE.PointLight(0xffd9a8, 6, 9, 2); lamp.position.set(0, 2.45, -1); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; lamp.shadow.normalBias = 0.02; ROOM.add(lamp);
// cool window light from the right wall + a weak sky fill
const moon = new THREE.SpotLight(0x9fb4d8, 20, 14, 0.5, 0.7, 1.5); moon.position.set(2.8, 2.6, 1.0); moon.target.position.set(-0.5, 0, -1.5); ROOM.add(moon, moon.target);
const roomFill = new THREE.HemisphereLight(0x3c4a5e, 0x101010, 0.5); ROOM.add(roomFill);
