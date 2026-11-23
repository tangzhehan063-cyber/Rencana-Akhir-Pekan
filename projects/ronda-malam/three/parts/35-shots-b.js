// ---------- SHOTS, part B (30.3 s → end) ----------
// moonlight shaft through the pos window, for the dark interior scenes
const winShaft = new THREE.SpotLight(0x9db6e8, 0, 6, 0.32, 0.6, 1.2); winShaft.position.set(PX - 0.95 - 0.6, 2.4, PZ + 0.65); winShaft.target.position.copy(SHEET).add(V(0, -0.1, 0.1)); scene.add(winShaft, winShaft.target);
const insideFill = new THREE.PointLight(0x7f97c8, 0, 3.2, 1.4); insideFill.position.set(PX + 0.1, FLOOR + 1.9, PZ - 0.2); scene.add(insideFill);
const LAMP_END = V(0.7, 0, -21.0);
const CIRCLE = V(0.62, 0, -19.7);           // where the four stop (offset from the lamp so shadows stretch toward +z)
const FIFTH_AT = V(0.42, 0, -18.55);         // the fifth stands just behind Dimas
const ORDER = [harjo, udin, bambang, dimas]; // walking order; Dimas walks last
const runPose = (ph, s = 1) => ({...walkPose(ph, 1.3 * s), lean: 0.22 * s, le: lerp(0.15, 1.1, s), re: lerp(0.15, 1.1, s)});
function circlePos(i) { const ang = [-2.3, -0.75, 0.75, 2.2][i]; return V(CIRCLE.x + Math.sin(ang) * 0.62, 0, CIRCLE.z + Math.cos(ang) * 0.62); }
function placeCircle(t, extra = () => ({})) {
  ORDER.forEach((a, i) => { const p = circlePos(i); a.root.position.copy(p); a.root.rotation.y = Math.atan2(CIRCLE.x - p.x, CIRCLE.z - p.z); idle(a, t + i, {ra: [0.4, 0.12], re: 0.4, ...extra(a, i)}); }); }
function patrol(t, t0, t1, z0, z1) { // four in a 2x2 file walking toward -z
  const k = clamp((t - t0) / (t1 - t0)); const zc = lerp(z0, z1, k); const moving = k > 0 && k < 1 ? 1 : 0;
  const off = [[-0.35, 0], [0.35, 0.15], [-0.3, 0.85], [0.38, 1.0]];
  ORDER.forEach((a, i) => { a.root.position.set(off[i][0] + 0.15, 0, zc + off[i][1]); a.root.rotation.y = Math.PI;
    const ph = (z0 - zc) / STRIDE * Math.PI + i * 0.9; a.pose({...walkPose(ph, 0.85 * moving), ra: [0.55, 0.12], re: 0.4, head: [0.15 * Math.sin(t * 0.7 + i), 0.05]}, t); });
  return zc; }
function darkInterior() { torches(false); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; moon.intensity = 0; nightHemi.intensity = 0.05; winShaft.intensity = 5; porchLight.intensity = 0.6; insideFill.intensity = 1.1; }
function men_inside(t) { // the other three crouch in the dark corner
  [harjo, udin, bambang].forEach((a, i) => { a.root.position.set(PX + 0.2 + i * 0.12, FLOOR, PZ + 0.55 + i * 0.3); a.root.rotation.y = -Math.PI / 2 - 0.3; a.pose({lk: 1.2, rk: 1.2, ll: [1.2, 0.05], rl: [1.2, 0.05], hipY: -0.32, la: [0.6, 0.2], le: 1.2, ra: [0.6, 0.2], re: 1.2, head: [0, 0.2], eyes: 1.3}, t); }); }

shots.push(
  {name: 'patrol-walk', t0: 30.3, t1: 35.6, f(t) { torches(true); const zc = patrol(t, 30.3, 35.6, 1.0, -4.2);
    cam(V(-1.15, 1.55, zc - 1.9), V(0.35, 1.05, zc + 0.4), 50, 0.004, t); }},
  {name: 'four-names', t0: 35.6, t1: 38.4, f(t) { torches(true); const zc = patrol(t, 35.6, 38.4, -6.0, -8.0);
    cam(V(0.15, 1.5, zc - 2.6), V(0.15, 1.2, zc + 0.5), 46, 0.004, t); }},
  {name: 'gang-end', t0: 38.4, t1: 43.0, f(t) { torches(true);
    const k = clamp((t - 38.4) / (41.6 - 38.4)); ORDER.forEach((a, i) => { const tgt = circlePos(i); const st = V(tgt.x, 0, tgt.z + 3.6);
      const p = st.clone().lerp(tgt, k); a.root.position.copy(p); a.root.rotation.y = Math.PI; a.pose({...walkPose(k * 3.6 / STRIDE * Math.PI + i, 0.85 * ease(k / 0.1) * ease((1 - k) / 0.15)), ra: [0.55, 0.12], re: 0.4}, t); });
    const c = seg(t, 38.4, 43.0); cam(V(-0.8, 2.4, -14.2).lerp(V(-0.5, 2.2, -15.0), c), V(0.6, 1.2, -20.5), 46, 0.004, t); }},
  {name: 'harjo-count', t0: 43.0, t1: 45.4, f(t) { torches(true); placeCircle(t);
    const r = seg(t, 43.4, 44.2); harjo.pose({ra: [lerp(0.4, 1.3, r), 0.1], re: lerp(0.4, 0.1, r), point: r, head: [0, 0.1], eyes: 1.2, brow: 0.3}, t);
    const hp = harjo.root.position; cam(CIRCLE.clone().add(V(-0.35, 1.75, -1.45)), hp.clone().add(V(0, 1.35, 0)), 46, 0.003, t); }},
  {name: 'count', t0: 45.4, t1: 51.0, f(t) { torches(true);
    const beats = [45.5, 47.03, 48.34, 49.9]; let who = -1; beats.forEach((b, i) => { if (t >= b - 0.1) who = i; });
    placeCircle(t, (a, i) => i === 0 ? {} : {head: [0, 0.25]});
    if (who >= 0) { const tgt = circlePos(who), hp = harjo.root.position; const yaw = Math.atan2(tgt.x - hp.x, tgt.z - hp.z);
      harjo.root.rotation.y = who === 0 ? harjo.root.rotation.y : yaw; harjo.pose({ra: [who === 0 ? 0.6 : 1.35, who === 0 ? -0.6 : 0.1], re: who === 0 ? 1.4 : 0.1, point: 1, head: [0, 0.2]}, t); }
    const k = seg(t, 45.4, 51.0); cam(V(CIRCLE.x + 0.01, lerp(5.6, 5.0, k), CIRCLE.z + 0.35), V(CIRCLE.x, 0, CIRCLE.z + 0.35), 52, 0.002, t); }},
  {name: 'five-shadows', t0: 51.0, t1: 55.9, f(t) { torches(false); placeCircle(t, () => ({head: [0, 0.2], eyes: 1.3}));
    fifth.root.visible = true; const step = seg(t, 51.6, 52.6); fifth.root.position.copy(FIFTH_AT).add(V(0, 0, 0.7 * (1 - step))); fifth.root.rotation.y = Math.PI;
    fifth.pose({...walkPose(step * 0.7 / STRIDE * Math.PI, step > 0 && step < 1 ? 0.7 : 0), head: [0, 0.15]}, t);
    const k = seg(t, 51.0, 55.9); cam(V(CIRCLE.x + 0.01, lerp(5.0, 4.3, k), CIRCLE.z + 0.9), V(CIRCLE.x, 0, CIRCLE.z + 0.9), 56, 0.002, t); }},
  {name: 'lima', t0: 55.9, t1: 57.9, f(t) { placeCircle(t); fifth.root.visible = true; fifth.root.position.copy(FIFTH_AT); fifth.root.rotation.y = Math.PI; fifth.pose({head: [0.3, 0.1]}, t);
    const d = dimas.root.position; const fwd = V(Math.sin(dimas.root.rotation.y), 0, Math.cos(dimas.root.rotation.y));
    dimas.pose({ra: [0.4, 0.12], re: 0.4, la: [0.1, 0.1], eyes: lerp(1.1, 1.55, seg(t, 55.95, 56.2)), brow: 0.9, mouth: 'flat', head: [0, -0.02]}, t);
    cam(d.clone().add(fwd.clone().multiplyScalar(0.62)).add(V(0, 1.6, 0)), d.clone().add(V(0, 1.44, 0)), 40, 0.002, t); }},
  {name: 'no-look', t0: 57.9, t1: 60.8, f(t) { placeCircle(t, () => ({head: [0, 0.05], eyes: 1.4})); ORDER.forEach(a => a.root.rotation.y = Math.PI);
    fifth.root.visible = true; fifth.root.position.copy(FIFTH_AT); fifth.root.rotation.y = Math.PI; fifth.pose({head: [0.0, 0.0]}, t);
    const k = seg(t, 57.9, 60.8); cam(V(0.55, lerp(0.85, 1.0, k), -16.3), V(0.6, 0.55, -20.0), 50, 0.003, t); }},
  {name: 'pos-empty', t0: 60.8, t1: 65.9, f(t) { crew.forEach(a => a.root.visible = false); posLight.intensity = 0.0; posBulbM.emissiveIntensity = 0;
    const k = seg(t, 60.8, 65.9); cam(V(-0.6, 1.55, -1.2).lerp(V(0.2, 1.55, 0.6), k), V(1.6, 1.45, 2.9), 44, 0.003, t); }},
  {name: 'kentongan-self', t0: 65.9, t1: 68.3, f(t) { crew.forEach(a => a.root.visible = false); posLight.intensity = 0; posBulbM.emissiveIntensity = 0;
    const hits = [66.05, 66.65, 67.25]; let sw = 0; hits.forEach(h => { if (t > h) sw += Math.sin((t - h) * 24) * Math.exp(-(t - h) * 5); });
    KENT.rotation.z = 0.08 * sw; mallet.rotation.z = 0.4 + 0.5 * hits.reduce((s, h) => s + Math.max(0, 1 - Math.abs(t - h) / 0.1), 0);
    cam(V(0.55, 1.7, 1.65), V(1.6, 1.65, 2.85), 42, 0.002, t); }},
  {name: 'run-in', t0: 68.3, t1: 70.1, f(t) { torches(true); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; doorPivot.rotation.y = -1.3;
    ORDER.forEach((a, i) => { const k = clamp((t - 68.35 - i * 0.14) / 1.5); const p0 = V(-0.4 + i * 0.25, 0, -1.8 - i * 0.6), p1 = V(1.25, 0, 3.4);
      const p = p0.clone().lerp(p1, k); a.root.position.copy(p); a.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z); a.root.visible = k < 0.98;
      a.pose({...runPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, k > 0 && k < 1 ? 1 : 0), head: [0, -0.05], eyes: 1.4, mouth: 'o'}, t); });
    cam(V(-0.2, 1.55, 5.6), V(0.75, 1.15, 1.4), 52, 0.005, t); }},
  {name: 'lock', t0: 70.1, t1: 71.2, f(t) { torches(true); posLight.intensity = 0.9; insideFill.intensity = 1.2; posBulbM.emissiveIntensity = 0; men_inside(t);
    const s = seg(t, 70.25, 70.5); bolt.position.z = lerp(0.72, 0.86, s);
    dimas.root.position.set(PX - 0.55, FLOOR, PZ - 0.55); dimas.root.rotation.y = -Math.PI / 2; dimas.pose({la: [1.1, -0.2], le: 0.6, ra: [0.55, 0.12], re: 0.4, head: [0, 0.2], eyes: 1.4}, t);
    cam(V(PX - 0.25, 1.75, PZ + 0.35), V(PX - 0.92, 1.33, PZ - 0.25), 46, 0.003, t); }},
  {name: 'torches-off', t0: 71.2, t1: 73.0, f(t) { posLight.intensity = 0; posBulbM.emissiveIntensity = 0; men_inside(t); bolt.position.z = 0.86;
    const offs = [71.35, 71.6, 71.85, 72.05]; const order = ['harjo', 'udin', 'bambang', 'dimas']; order.forEach((n, i) => lights[n].set(t < offs[i])); posLight.intensity = 0.35 * offs.filter(o => t < o).length; insideFill.intensity = 1.1;
    if (t > 72.05) { moon.intensity = 0; nightHemi.intensity = 0.05; winShaft.intensity = 5 * seg(t, 72.1, 72.8); }
    dimas.root.position.set(PX - 0.45, FLOOR, PZ - 0.45); dimas.root.rotation.y = -Math.PI / 2 - 0.4; dimas.pose({ra: [0.55, 0.12], re: 0.4, head: [0, 0.1], eyes: 1.4}, t);
    cam(V(PX - 0.55, 1.62, PZ - 0.25), V(PX + 0.32, 1.35, PZ + 0.85), 54, 0.002, t); }},
  {name: 'grope', t0: 73.0, t1: 77.8, f(t) { darkInterior(); men_inside(t); bolt.position.z = 0.86;
    dimas.root.position.set(PX + 0.38, FLOOR, PZ - 0.05); dimas.root.rotation.y = Math.PI / 2;
    const g = seg(t, 73.3, 76.6); dimas.pose({ra: [lerp(0.4, 1.45, g), lerp(0.1, 0.5 - 0.35 * Math.sin(t * 3), g)], re: 0.25, la: [0.2, 0.1], head: [0, 0.05], eyes: 1.3}, t);
    const k = seg(t, 73.0, 77.8); cam(V(PX + 0.1, 1.75, PZ + 0.55).lerp(V(PX + 0.25, 1.7, PZ + 0.35), k), V(SHEET.x, 1.65, PZ - 0.1), 46, 0.002, t); }},
  {name: 'changed', t0: 77.8, t1: 82.6, f(t) { darkInterior(); dimas.root.visible = false; drawSheet(1, 1);
    const k = seg(t, 77.8, 82.6); const p0 = V(SHEET.x - 1.15, SHEET.y, SHEET.z), p1 = V(SHEET.x - 0.95, SHEET.y + RULE_Y[3] - 0.04, SHEET.z);
    cam(p0.lerp(p1, k), V(SHEET.x, lerp(SHEET.y, SHEET.y + RULE_Y[3] - 0.04, k), SHEET.z), 36, 0.002, t); }},
  {name: 'wet-ink', t0: 82.6, t1: 86.4, f(t) { darkInterior(); dimas.root.visible = false; drawSheet(1, 1 + Math.floor(seg(t, 82.6, 86.4) * 6));
    cam(V(SHEET.x - 0.42, SHEET.y + RULE_Y[3] - 0.07, SHEET.z + 0.05), V(SHEET.x, SHEET.y + RULE_Y[3] - 0.04, SHEET.z), 34, 0.0015, t); }},
  {name: 'rule4', t0: 86.4, t1: 96.6, f(t) { darkInterior(); dimas.root.visible = false; sheetFocus = 3; drawSheet(1, 7);
    const k = seg(t, 86.4, 96.4); const y = SHEET.y + RULE_Y[3] - 0.03 - 0.07 * k;
    cam(V(SHEET.x - 0.85, y - 0.05, SHEET.z), V(SHEET.x, y, SHEET.z), 34, 0.0015, t); }},
  {name: 'gulp', t0: 96.6, t1: 100.5, f(t) { darkInterior(); men_inside(t); drawSheet(1, 7);
    dimas.root.position.set(PX + 0.35, FLOOR, PZ - 0.25); dimas.root.rotation.y = Math.PI / 2;
    const gulp = Math.max(0, 1 - Math.abs(t - 97.4) / 0.25); dimas.pose({ra: [0.2, 0.1], la: [0.2, 0.1], head: [0, -0.06 + 0.08 * gulp], eyes: 1.5, brow: 0.9, mouth: gulp > 0.3 ? 'o' : 'flat'}, t);
    winShaft.target.position.set(PX + 0.35, 1.9, PZ - 0.25); winShaft.intensity = 6;
    cam(V(PX + 0.95, 1.95, PZ - 0.3), V(PX + 0.35, 1.9, PZ - 0.25), 40, 0.002, t); }},
  {name: 'last-in', t0: 100.5, t1: 103.0, f(t) { // memory: the run-in again, seen from inside — Dimas enters last
    torches(true); posLight.intensity = 0; posBulbM.emissiveIntensity = 0; doorPivot.rotation.y = -1.3; fx.vig = 1.6; fx.cctv = 1;
    [harjo, udin, bambang].forEach((a, i) => { a.root.position.set(PX + 0.1 + i * 0.25, FLOOR, PZ + 0.4 + i * 0.25); a.root.rotation.y = -Math.PI / 2; idle(a, t + i, {eyes: 1.4}); });
    const k = clamp((t - 100.6) / 1.3); const p = V(lerp(0.6, PX - 0.6, k), lerp(0, FLOOR, seg(t, 101.4, 101.7)), PZ - 0.55); dimas.root.position.copy(p); dimas.root.rotation.y = Math.PI / 2;
    dimas.pose({...runPose(k * 1.6 / STRIDE * Math.PI, k > 0 && k < 1 ? 0.9 : 0), head: [0, 0], eyes: 1.4, mouth: 'o'}, t);
    cam(V(PX + 0.75, 1.5, PZ - 0.4), V(PX - 1.4, 1.2, PZ - 0.55), 50, 0.002, t); }},
  {name: 'behind', t0: 103.0, t1: 108.42, f(t) { darkInterior(); men_inside(t); drawSheet(1, 7); bolt.position.z = 0.86;
    winShaft.target.position.set(PX - 0.05, 1.95, PZ - 0.58); winShaft.intensity = 7; porchLight.intensity = 4.5;
    dimas.root.position.set(PX - 0.05, FLOOR, PZ - 0.58); dimas.root.rotation.y = Math.PI / 2 + 0.3; dimas.pose({ra: [0.2, 0.1], la: [0.2, 0.1], head: [0, 0.02], eyes: 1.5, brow: 0.9}, t); insideFill.intensity = 1.5;
    const open = 1 - seg(t, 106.2, 108.3); doorPivot.rotation.y = -0.32 * (t < 105.5 ? 0 : t < 105.9 ? seg(t, 105.5, 105.9) : open);
    ghostHand.visible = t > 105.9; ghostHand.position.set(PX - 0.95 + 0.06, FLOOR + 1.25, PZ - 0.15 - 0.02 + 0.2 * (1 - open) * 0); ghostHand.rotation.set(0.2, 0, -0.3);
    const hp = new THREE.Vector3(0.05, 1.0, 0.8).applyAxisAngle(V(0, 1, 0), doorPivot.rotation.y); ghostHand.position.set(PX - 0.95 - 0.02 + hp.x + 0.07, FLOOR + 1.0, PZ - 0.95 + hp.z - 0.02);
    const k = seg(t, 103.0, 108.4); cam(V(PX + 0.85, 1.85, PZ - 0.45).lerp(V(PX + 0.78, 1.83, PZ - 0.48), k), V(PX - 0.8, 1.6, PZ - 0.42), 56, 0.0015, t); }},
  {name: 'end', t0: 108.42, t1: 112.5, f(t) { crew.forEach(a => a.root.visible = false); fadeEl.style.opacity = 1; endEl.textContent = 'RONDA MALAM'; endEl.style.opacity = seg(t, 109.2, 110.0) * (1 - seg(t, 111.2, 111.9));
    cam(V(0, 1.6, 0), V(0, 1.6, -1), 45, 0, t); }},
);
