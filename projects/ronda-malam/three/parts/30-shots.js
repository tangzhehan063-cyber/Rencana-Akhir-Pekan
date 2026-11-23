// ---------- SHOTS ----------
function cam(pos, look, fov = 45, shake = 0.004, t = 0) {
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos);
  if (shake) camera.position.add(V((noise1(t * 0.7) - 0.5) * shake, (noise1(t * 0.6 + 40) - 0.5) * shake, (noise1(t * 0.5 + 80) - 0.5) * shake));
  camera.lookAt(look);
}
const PX = 2.75, PZ = 4.0, FLOOR = 0.35;
const SHEET = V(PX + 0.95 - 0.035, FLOOR + 1.45, PZ - 0.35);            // rules sheet centre (faces -x)
const RULE_Y = [0.148, 0.069, -0.01, -0.138];                            // rule row offsets on the sheet
const sheetAt = (i, dx = 1.05, fov = 34) => [V(SHEET.x - dx, SHEET.y + RULE_Y[i] + 0.01, SHEET.z), V(SHEET.x, SHEET.y + RULE_Y[i], SHEET.z), fov];
let fx = {cctv: 0, ca: 0.25, vig: 1};
const malletHand = box(0.03, 0.3, 0.03, std(0x6b4a2a), 0, -0.12, 0.05, harjo.R.glove, false); malletHand.rotation.x = Math.PI / 2;
let sheetFocus = -1;
function resetAll() {
  fx = {cctv: 0, ca: 0.25, vig: 1}; fadeEl.style.opacity = 0; endEl.style.opacity = 0; cctvEl.style.display = 'none';
  crew.forEach(a => { a.root.visible = true; a.root.rotation.set(0, 0, 0); }); fifth.root.visible = false; ghostHand.visible = false;
  malletHand.visible = false; mallet.visible = true; torches(false); doorPivot.rotation.y = 0; KENT.rotation.set(0, 0, 0);
  posLight.intensity = 3.2; posBulbM.emissiveIntensity = 2.2; porchLight.intensity = 4.5; porchBulbM.emissiveIntensity = 2.2; lampPos.L.intensity = 26; lampEnd.L.intensity = 34; lampPos.bulbM.emissiveIntensity = 2; lampEnd.bulbM.emissiveIntensity = 2;
  moon.intensity = 0.35; nightHemi.intensity = 0.22; sheetFocus = -1; drawSheet(0, 1);
  winShaft.intensity = 0; insideFill.intensity = 0; winShaft.target.position.copy(SHEET).add(V(0, -0.1, 0.1)); bolt.position.z = 0.72; mallet.rotation.z = 0.4; endEl.textContent = 'RONDA MALAM'; KENT.rotation.z = 0;
  scene.background.set(0x05070c); scene.fog.color.set(0x070a10); scene.fog.density = 0.055;
  // default staging: the four men in front of the pos
  dimas.root.position.set(0.55, 0, 3.0); dimas.root.rotation.y = 1.9;
  harjo.root.position.set(1.15, 0, 2.7); harjo.root.rotation.y = -1.3;
  udin.root.position.set(0.25, 0, 3.9); udin.root.rotation.y = 2.6;
  bambang.root.position.set(1.0, 0, 4.4); bambang.root.rotation.y = -2.5;
  crew.forEach(a => a.pose({}, 0));
}
const idle = (a, t, extra = {}) => a.pose({la: [0.12, 0.12], ra: [0.12, 0.12], le: 0.25, re: 0.25, ...extra}, t);
function sheetShot(t, i, t0, t1) { sheetFocus = i; drawSheet(0, 1); dimas.root.visible = false; const [p, l, f] = sheetAt(i); const k = seg(t, t0, t1); const dn = V(0, -0.09, 0); cam(p.clone().add(dn).add(V(0.05 * (1 - k), 0, 0.02 * k)), l.clone().add(dn), f, 0.002, t); }
function dimasReading(t) { dimas.root.position.set(PX - 0.15, FLOOR, PZ - 0.3); dimas.root.rotation.y = Math.PI / 2; idle(dimas, t, {head: [0, 0.05], eyes: 1.2}); }

const shots = [
  {name: 'kentongan', t0: 0, t1: 1.7, f(t) { // two knocks: aman
    harjo.root.position.set(1.25, 0, 2.45); harjo.root.rotation.y = 0.85; malletHand.visible = true; mallet.visible = false;
    const hit = k0 => Math.max(0, 1 - Math.abs(t - k0) / 0.12); const sw = Math.max(hit(0.2), hit(0.75));
    harjo.pose({ra: [1.0 + 0.45 * sw, -0.1], re: 0.9 - 0.4 * sw, la: [0.1, 0.1], head: [0.2, 0.1], eyes: 1.1}, t);
    KENT.rotation.z = 0.06 * Math.sin((t - 0.2) * 22) * Math.exp(-Math.max(0, t - 0.2) * 5) * (t > 0.2 ? 1 : 0);
    dimas.root.visible = udin.root.visible = bambang.root.visible = false;
    cam(V(2.35, 1.6, 0.75), V(1.45, 1.45, 2.65), 46, 0.003, t); }},
  {name: 'pos-wide', t0: 1.7, t1: 5.4, f(t) { crew.forEach((a, i) => idle(a, t + i));
    const arrive = seg(t, 1.9, 4.2); dimas.root.position.set(lerp(-0.3, 0.55, arrive), 0, lerp(1.2, 3.0, arrive)); dimas.root.rotation.y = 0.45;
    dimas.pose({...walkPose(arrive * 2.0 / STRIDE * Math.PI, 0.8 * ease(arrive / 0.1) * ease((1 - arrive) / 0.1)), head: [0.3, 0], eyes: 1.1}, t);
    const k = seg(t, 1.7, 5.4); cam(V(-0.6, 1.7, -2.2).lerp(V(-0.4, 1.65, -1.4), k), V(1.6, 1.1, 3.8), 50, 0.004, t); }},
  {name: 'sheet-reveal', t0: 5.4, t1: 10.6, f(t) { dimasReading(t);
    const k = seg(t, 5.4, 10.6); cam(V(PX - 0.95, 1.95, PZ - 0.65).lerp(V(PX - 0.35, 1.85, PZ - 0.45), k), SHEET.clone().add(V(0, 0.05, 0)), 44, 0.003, t); }},
  {name: 'rule1', t0: 10.6, t1: 13.8, f(t) { dimasReading(t); sheetShot(t, 0, 10.6, 13.8); }},
  {name: 'four-together', t0: 13.8, t1: 16.3, f(t) { torches(true); lights.dimas.L.intensity = lights.harjo.L.intensity = 0;
    [harjo, udin, bambang, dimas].forEach((a, i) => { a.root.position.set(0.0 + (i % 2) * 0.75, 0, 1.4 - Math.floor(i / 2) * 0.7); a.root.rotation.y = Math.PI; idle(a, t + i, {ra: [0.55, 0.12], re: 0.4}); });
    cam(V(0.4, 1.45, -1.9), V(0.4, 1.05, 1.0), 46, 0.004, t); }},
  {name: 'rule2', t0: 16.3, t1: 19.9, f(t) { dimasReading(t); sheetShot(t, 1, 16.3, 19.9); }},
  {name: 'kentongan-door', t0: 19.9, t1: 24.6, f(t) { crew.forEach(a => a.root.visible = false); doorPivot.rotation.y = -0.5; posLight.intensity = 0; posBulbM.emissiveIntensity = 0;
    const k = seg(t, 19.9, 24.6); cam(V(-0.2, 1.55, 0.6).lerp(V(0.2, 1.55, 1.1), k), V(1.75, 1.35, 3.3), 46, 0.004, t); }},
  {name: 'rule3', t0: 24.6, t1: 28.1, f(t) { dimasReading(t); sheetShot(t, 2, 24.6, 28.1); }},
  {name: 'four-overhead', t0: 28.1, t1: 30.3, f(t) { torches(true);
    const C = V(0.4, 0, 2.6); [harjo, udin, bambang, dimas].forEach((a, i) => { const ang = i / 4 * Math.PI * 2 + 0.3; a.root.position.set(C.x + Math.cos(ang) * 0.55, 0, C.z + Math.sin(ang) * 0.55); a.root.rotation.y = Math.atan2(C.x - a.root.position.x, C.z - a.root.position.z); idle(a, t + i, {head: [0, 0.3]}); });
    const k = seg(t, 28.1, 30.3); cam(V(C.x + 0.01, lerp(5.2, 4.7, k), C.z + 0.02), V(C.x, 0, C.z), 50, 0.002, t); }},
];
