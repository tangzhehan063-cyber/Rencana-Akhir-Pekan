// ---------- CAST ----------
const darto = makeStick({tie: false, card: false, cap: true, mustache: true, badge: true, belt: true}); scene.add(darto.root); darto.setBlinkSeed(1.3);
const torch = makeTorch(); torch.g.position.set(0, -0.05, 0.03); darto.R.glove.add(torch.g);
const pocket = makePhone(); pocket.g.scale.setScalar(0.9); pocket.g.position.set(-0.06, 0.33, 0.062); pocket.g.rotation.x = -0.1; darto.chest.add(pocket.g);
const handPhone = makePhone(); scene.add(handPhone.g);
const handGlove = new THREE.Group(); scene.add(handGlove);
{ const p = inked(new THREE.SphereGeometry(0.062, 18, 14), toonWhite, INK, handGlove); p.scale.set(1.15, 1.0, 0.7); p.userData.ol.scale.setScalar(1.17);
  const th = inked(new THREE.CapsuleGeometry(0.02, 0.05, 4, 8), toonWhite, INK, handGlove); th.position.set(0.055, 0.03, 0.03); th.rotation.z = -0.5; th.userData.ol.scale.setScalar(1.5); }
const LX = x => 60 + x; const LV = (x, y, z) => V(60 + x, y, z);
// closed niche: plaster patch over the body-shaped hole
const plasterTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#9b9c98'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${hash(i) > .5 ? 255 : 40},${hash(i) > .5 ? 255 : 40},${hash(i) > .5 ? 255 : 40},.06)`; g.lineWidth = 6 + hash(i * 3) * 14; g.beginPath(); const x = hash(i * 5) * w, y = hash(i * 7) * h; g.arc(x, y, 30 + hash(i * 9) * 60, hash(i) * 6, hash(i) * 6 + 1.6); g.stroke(); }
  // faint body silhouette pressure mark
  g.fillStyle = 'rgba(40,40,40,.10)'; g.beginPath(); g.arc(w / 2, h * 0.16, 38, 0, 7); g.fill(); g.fillRect(w / 2 - 22, h * 0.24, 44, 150); g.fillRect(w / 2 - 22, h * 0.52, 16, 200); g.fillRect(w / 2 + 6, h * 0.52, 16, 200);
  g.save(); g.translate(w / 2 + 26, h * 0.27); g.rotate(-0.25); g.fillRect(0, 0, 14, 110); g.restore(); g.save(); g.translate(w / 2 - 40, h * 0.27); g.rotate(0.25); g.fillRect(0, 0, 14, 110); g.restore(); });
const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.95), new THREE.MeshStandardMaterial({map: plasterTex, roughness: 0.95})); patch.position.set(0, 0.97, 0.226); NICHE.add(patch);
nicheBack.visible = false; print.visible = false; pushGlove.visible = false;

// ---------- helpers ----------
let fx = {cctv: 0, ca: 1, vig: 1}; let knockShake = 0;
function cctvText(s) { cctvEl.style.display = 'block'; cctvEl.querySelector('.bl').textContent = s; }
function torchOn(k = 1) { torch.spot.intensity = 5 * k; coneMat.uniforms.uInt.value = 0.16 * k; torch.cone.visible = k > 0.01; torch.lens.material.color.setScalar(0.25 + 0.75 * k); }
function sit(t) { darto.root.position.copy(LV(0, 0, -0.62)); darto.root.rotation.y = 0;
  return {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.95, 0.12], re: 0.45, la: [0.6, 0.15], le: 1.2, lean: 0.06}; }
const DOOR4 = V(-40 + 0.7, 0, 1.57); // stair door (landing A, group oy=0)

function resetAbsen() {
  LOB.visible = STW.visible = F4.visible = CAB.visible = false; darto.root.visible = false; handPhone.g.visible = false; handGlove.visible = false;
  darto.R.finger.visible = false; pocket.g.position.x = -0.06;
  torchOn(0); pocket.glow.intensity = 0; handPhone.glow.intensity = 0; drawPhone(0, 0); drawMach('idle', '07:00'); machLight.intensity = 0; scanGlow.material.opacity = 0.15;
  drawWClock('06:59'); lobDoorL.position.x = -0.3; lobDoorR.position.x = 0.3; lobCabLight.intensity = 0; drawLedIf(lobLedTex, 'L', '#ff3326');
  fx = {cctv: 0, ca: 1, vig: 1}; cctvEl.style.display = 'none'; knockShake = 0; dust.visible = false; endEl.style.opacity = 0; fadeEl.style.opacity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); scene.fog.density = 0.045; drawBoardCircleIf(0); nicheLight.intensity = 0;
  workLight.intensity = 300; workFill.intensity = 14; coldFill.intensity = 4; boardLight.intensity = 3;
  for (const g of STW.children) g.children.forEach(c => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.depth === 0.06 && c.geometry.parameters.width === 0.95) c.rotation.y = 0; });
}
function lobbyBase(dawnK = 1) { LOB.visible = true; dawn.intensity = 60 * dawnK; lobAmb.intensity = 4 * dawnK; scene.fog.density = 0.02; }
const stairDoors = []; for (const g of STW.children) g.children.forEach(c => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.depth === 0.06 && c.geometry.parameters.width === 0.95) stairDoors.push(c); });

const shots = [
  {name: 'h-poster', t0: 0, t1: 1.95, f(t) { lobbyBase(); const k = seg(t, 0, 1.95);
    cam(LV(-0.9, 1.6, 4.7).lerp(LV(-0.95, 1.57, 5.15), k), LV(-1.0, 1.78, 6.0), 40); }},
  {name: 'h-machine', t0: 1.95, t1: 3.85, f(t) { lobbyBase(0.6); drawMach('thanks', '07:00:00'); machLight.intensity = 1.6; scanGlow.material.opacity = 0.7;
    const k = seg(t, 1.95, 3.85); cam(LV(0.2, 1.36, 2.05).lerp(LV(0.1, 1.32, 2.3), k), LV(0, 1.24, 2.98), 40); }},
  {name: 'lobby-dawn', t0: 3.85, t1: 6.95, f(t) { lobbyBase(); drawWClock(t < 6.2 ? '06:59' : '07:00'); drawMach('idle', t < 6.2 ? '06:59' : '07:00');
    const k = seg(t, 3.85, 6.95); cam(LV(-3.6, 1.7, -4.8).lerp(LV(-3.0, 1.6, -3.6), k), LV(0.2, 1.1, 3.0), 50); }},
  {name: 'push-machine', t0: 6.95, t1: 10.3, f(t) { lobbyBase(); drawMach('idle', '07:00');
    const k = seg(t, 6.95, 10.3); cam(LV(0.6, 1.4, 0.4).lerp(LV(0.15, 1.3, 2.25), k), LV(0, 1.25, 2.98), 42); }},
  {name: 'm1-thanks', t0: 10.3, t1: 12.6, f(t) { lobbyBase(); const on = t >= 10.5;
    drawMach(on ? 'thanks' : 'idle', '07:00:00'); machLight.intensity = on ? 1.8 : 0; scanGlow.material.opacity = on ? 0.9 * (0.6 + 0.4 * Math.sin(t * 6)) : 0.15;
    cam(LV(-0.08, 1.3, 2.3), LV(0, 1.22, 2.98), 38); }},
  {name: 'darto-inspect', t0: 12.6, t1: 16.3, f(t) { lobbyBase(); darto.root.visible = true; drawMach('idle', '07:00');
    darto.root.position.copy(LV(0.05, 0, 2.35)); darto.root.rotation.y = 0;
    const bend = seg(t, 13.2, 13.8) * (1 - seg(t, 15.0, 15.5)), tap = seg(t, 14.1, 14.5) * (1 - seg(t, 14.7, 15.0)), look = t > 15.4 ? Math.sin((t - 15.4) * 4) * 0.8 : 0;
    darto.pose({lean: 0.32 * bend, head: [look, -0.15 * bend], ra: [lerp(0.05, 1.15, tap), 0.05], re: lerp(0.15, 0.5, tap), la: [0.1, 0.15], point: 0, brow: 0.3, eyes: 1.05, mouth: 'flat'}, t);
    darto.R.finger.visible = tap > 0.5;
    cam(LV(1.5, 1.55, 1.2).lerp(LV(1.3, 1.5, 1.5), seg(t, 12.6, 16.3)), LV(0.0, 1.3, 2.7), 44); }},
  {name: 'cctv-days', t0: 16.3, t1: 20.36, f(t) { lobbyBase(0.8); fx.cctv = 1; darto.root.visible = true;
    const day = t < 17.65 ? 0 : t < 19.0 ? 1 : 2; const lit = ((t - 16.3) % 1.35) > 0.35;
    drawMach(lit ? 'thanks' : 'idle', '07:00'); machLight.intensity = lit ? 1.6 : 0;
    darto.root.position.copy(LV([0.9, -0.9, 0.7][day], 0, [2.0, 1.8, 1.4][day])); darto.root.rotation.y = [-0.6, 0.6, -0.3][day];
    darto.pose({head: [lit ? [0.5, -0.5, 0.3][day] : 0, 0], la: [0.1, 0.12], ra: [0.1, 0.12], eyes: 1.1}, t);
    cctvText(`${17 + day}-11-2026  07:00:0${Math.floor(((t - 16.3) % 1.35) * 5)}`);
    cam(LV(-4.6, 3.25, -0.8), LV(0.0, 0.9, 2.6), 58); }},
  {name: 'waiting-torch', t0: 20.36, t1: 23.67, f(t) { lobbyBase(0.35); darto.root.visible = true; torchOn(1); drawWClock('06:59'); drawMach('idle', '06:59');
    darto.pose({...sit(t), head: [0, 0.05], eyes: 1.0, brow: 0.2}, t);
    placeDust(LV(0, 0, 1.2), t, 1);
    const k = seg(t, 20.36, 23.67); cam(LV(1.6, 1.05, 1.6).lerp(LV(1.2, 1.1, 1.2), k), LV(0.0, 0.9, -0.8), 46); }},
  {name: 'clock-0659', t0: 23.67, t1: 25.9, f(t) { lobbyBase(0.35); drawWClock('06:59'); torchOn(1); darto.root.visible = true; darto.pose({...sit(t), head: [-0.6, 0.2], look: [-0.8, 0.4]}, t);
    const k = seg(t, 23.67, 25.9); cam(LV(-2.7, 2.2, -0.6).lerp(LV(-3.0, 2.3, -0.8), k), LV(-4.97, 2.45, -1.2), 40); }},
  {name: 'ding-turn', t0: 25.9, t1: 27.95, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; drawLedIf(lobLedTex, 'L', '#ffb020');
    const h = seg(t, 26.35, 26.6), b = seg(t, 26.55, 27.1);
    const P = sit(t); darto.pose({...P, head: [lerp(0, 1.2, h), 0], twist: lerp(0, 0.6, b), eyes: lerp(1, 1.4, h), brow: 0.6 * h, mouth: h > 0.5 ? 'o' : 'flat', ra: [lerp(0.95, 1.2, b), 0.12 + 0.5 * b]}, t);
    darto.root.rotation.y = -0.9 * b;
    cam(LV(0.25, 1.0, 1.0), LV(0, 1.2, -1.2), 44); }},
  {name: 'doors-open', t0: 27.95, t1: 29.48, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; drawLedIf(lobLedTex, 'L', '#ffb020');
    const o = seg(t, 28.0, 29.0); lobDoorL.position.x = -0.3 - 0.62 * o; lobDoorR.position.x = 0.3 + 0.62 * o; lobCabLight.intensity = 6 * o;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI;
    darto.pose({ra: [1.35, 0.05], re: 0.15, la: [0.15, 0.2], head: [0, 0], eyes: 1.35, brow: 0.6}, t);
    placeDust(LV(0, 0, -3), t, 1);
    cam(LV(-0.45, 1.7, 0.9), LV(0.0, 1.2, -6.0), 46); }},
  {name: 'empty', t0: 29.48, t1: 30.67, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92; lobCabLight.intensity = 6;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI; darto.pose({ra: [1.35, 0.05], re: 0.15, eyes: 1.35}, t);
    placeDust(LV(0, 0, -4), t, 1);
    const k = seg(t, 29.48, 30.67); cam(LV(0.1, 1.45, -2.4).lerp(LV(0.05, 1.42, -2.9), k), LV(0, 1.2, -7.4), 40); }},
  {name: 'machine-wakes', t0: 30.67, t1: 32.85, f(t) { lobbyBase(0.35); torchOn(1); darto.root.visible = true; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92; lobCabLight.intensity = 6;
    const on = t >= 31.3; drawMach(on ? 'thanks' : 'off', '07:00'); machLight.intensity = on ? 2.4 * seg(t, 31.3, 31.5) : 0; scanGlow.material.opacity = on ? 0.9 : 0.0;
    darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = Math.PI;
    const turn = seg(t, 31.7, 32.6); darto.pose({ra: [1.35 - 0.5 * turn, 0.05], re: 0.15, head: [lerp(0, 1.1, turn), 0], twist: 0.3 * turn, eyes: 1.4, brow: 0.7}, t);
    cam(LV(0.9, 1.5, 2.2), LV(0.1, 1.3, -0.5), 46); }},
  {name: 'm2-face', t0: 32.85, t1: 35.5, f(t) { lobbyBase(0.35); torchOn(0.8); darto.root.visible = true; lobCabLight.intensity = 6; lobDoorL.position.x = -0.92; lobDoorR.position.x = 0.92;
    drawMach('thanks', '07:00'); machLight.intensity = 2.4; scanGlow.material.opacity = 0.9 * (0.6 + 0.4 * Math.sin(t * 7));
    if (t < 34.1) { cam(LV(-0.06, 1.3, 2.3), LV(0, 1.22, 2.98), 38); darto.root.visible = false; }
    else { darto.root.position.copy(LV(0.15, 0, -0.3)); darto.root.rotation.y = 0.2; darto.pose({ra: [0.6, 0.1], re: 0.3, head: [0, 0.05], eyes: 1.6, brow: 1.0, mouth: 'o', la: [0.3, 0.3], lean: -0.06}, t);
      cam(LV(0.45, 1.6, 0.95), LV(0.15, 1.5, -0.3), 40); } }},
  {name: 'cctv-lift', t0: 35.5, t1: 38.6, f(t) { lobbyBase(0.35); fx.cctv = 1; lobDoorL.position.x = -0.3; lobDoorR.position.x = 0.3;
    const n = t < 36.3 ? 'L' : t < 36.9 ? '1' : t < 37.5 ? '2' : t < 38.1 ? '3' : '4'; drawLedIf(lobLedTex, n, n === '4' ? '#ff2a1a' : '#ffb020');
    cctvEl.querySelector('.tl').textContent = 'CAM-02  LIFT'; cctvText('20-11-2026  07:00:31');
    cam(LV(-0.9, 2.2, -4.2), LV(0, 2.2, -6.0), 34); }},
  {name: 'desk-monitor', t0: 38.6, t1: 39.75, f(t) { lobbyBase(0.35); darto.root.visible = true; drawLedIf(lobLedTex, '4', '#ff2a1a');
    darto.root.position.copy(LV(-3.35, 0, 1.75)); darto.root.rotation.y = Math.PI; darto.pose({head: [0, -0.05], eyes: 1.4, brow: 0.8, mouth: 'frown', la: [0.4, 0.2], le: 0.9, ra: [0.4, 0.2], re: 0.9, lean: 0.12}, t);
    cam(LV(-2.35, 1.5, 1.95), LV(-3.5, 1.2, 0.9), 46); }},
  {name: 'stairs-up', t0: 39.75, t1: 42.3, f(t) { STW.visible = true; darto.root.visible = true; torchOn(0.55);
    const k = seg(t, 39.75, 42.2); const p0 = V(-40 + 0.6, -1.58, -2.75), p1 = V(-40 + 0.6, 0.02, -0.05);
    const p = p0.clone().lerp(p1, k); darto.root.position.copy(p); darto.root.rotation.y = 0;
    const strength = 0.8 * ease(k / 0.08) * ease((1 - k) / 0.08);
    darto.pose({...walkPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, strength), ra: [1.25, 0.05], re: 0.2, head: [0, 0.15], eyes: 1.2, brow: 0.5}, t);
    placeDust(V(-39.4, -0.5, -1.4), t, 1);
    cam(p.clone().add(V(0.32, 1.28, 1.45)), p.clone().add(V(0, 0.9, 0)), 65); }},
  {name: 'door-ajar', t0: 42.3, t1: 47.8, f(t) { STW.visible = true; darto.root.visible = true; torchOn(1);
    const d = stairDoors.find(d => Math.abs(d.parent.position.y) < 0.01); const ajar = 0.18 + 0.35 * seg(t, 45.9, 46.7);
    d.rotation.y = ajar; d.position.x = 0.7 - 0.0;
    const pw = walkTo(darto, t, 42.6, 44.6, V(-40 + 0.6, 0.02, -0.05), V(-40 + 0.75, 0.02, 0.85));
    darto.pose({...pw, ra: [1.3, 0.05], re: 0.15, head: [0, 0.05], eyes: 1.25, brow: 0.6}, t);
    placeDust(V(-39.3, 0, 0.6), t, 1);
    cam(V(-38.15, 1.55, -0.6).lerp(V(-38.3, 1.5, -0.2), seg(t, 42.3, 47.8)), V(-39.3, 1.15, 1.57), 50); }},
  {name: 'corridor-beam', t0: 47.8, t1: 50.04, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1);
    darto.root.position.set(-3.9, 0.02, 6.5); darto.root.rotation.y = Math.PI / 2 + 0.3 * Math.sin((t - 47.8) * 1.4);
    darto.pose({ra: [1.3, 0.05], re: 0.15, head: [0.2 * Math.sin((t - 47.8) * 1.4), 0.05], eyes: 1.2, brow: 0.5}, t);
    swayPlastic(t, 0.6); placeDust(V(-2.0, 0, 6.8), t, 1);
    cam(V(-4.4, 2.05, 5.5), V(0.5, 1.3, 16), 48); }},
  {name: 'walk-to-wall', t0: 50.04, t1: 53.0, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1); swayPlastic(t, 0.6);
    const pw = walkTo(darto, t, 50.04, 53.0, V(-2.6, 0.02, 12.4), V(-1.15, 0.02, 19.4));
    darto.pose({...pw, ra: [1.25, 0.05], re: 0.2, head: [0, 0.0], eyes: 1.2, brow: 0.5}, t);
    placeDust(darto.root.position, t, 1);
    const c = darto.root.position.clone(); cam(V(c.x + 0.9, 1.5, c.z + 2.6), V(c.x, 1.1, c.z), 50); }},
  {name: 'wall-closed', t0: 53.0, t1: 55.72, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.55); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 19.6); darto.root.rotation.y = 0.05 * Math.sin(t);
    darto.pose({ra: [1.2 + 0.1 * Math.sin((t - 53) * 1.6), 0.1 * Math.cos((t - 53) * 1.6)], re: 0.2, head: [0, 0.05], eyes: 1.3, brow: 0.6}, t);
    placeDust(V(-1.0, 0, 20.4), t, 1);
    cam(V(-0.1, 1.35, 18.2).lerp(V(-0.35, 1.3, 18.6), seg(t, 53, 55.72)), V(-1.0, 1.0, 21.4), 46); }},
  {name: 'touch-cement', t0: 55.72, t1: 56.87, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.9); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 20.92); darto.root.rotation.y = 0;
    darto.pose({la: [1.35, 0.15], le: 0.05, ra: [0.9, 0.2], re: 0.6, head: [0, -0.05], eyes: 1.2, brow: 0.5, lean: 0.05}, t);
    cam(V(-2.45, 1.45, 19.85), V(-1.0, 1.15, 21.3), 34); }},
  {name: 'board-wide', t0: 56.87, t1: 61.1, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.45);
    darto.root.position.set(1.2, 0.02, 17.7); darto.root.rotation.y = 0.55; darto.pose({ra: [1.3, 0.1], re: 0.15, head: [0, 0.05], eyes: 1.2, brow: 0.5}, t);
    cam(V(0.0, 1.7, 16.2).lerp(V(0.35, 1.65, 16.7), seg(t, 56.87, 61.1)), V(2.55, 1.35, 19.2), 44); }},
  {name: 'board-close', t0: 61.1, t1: 64.9, f(t) { F4.visible = CAB.visible = true; torchOn(0); drawBoardCircleIf(seg(t, 63.85, 64.6));
    // Keep the handwritten clue readable under the work lamp and bloom.
    workLight.intensity = 35; workFill.intensity = 5; boardLight.intensity = 2;
    const k = seg(t, 61.1, 64.4); const a = BOARD.localToWorld(V(-0.2, 1.42, 0)), b = BOARD.localToWorld(V(0.26, 1.2, 0));
    const tgt = a.clone().lerp(b, k); const n = BOARD.localToWorld(V(0, 0, 1)).sub(BOARD.localToWorld(V(0, 0, 0))).normalize();
    cam(tgt.clone().add(n.multiplyScalar(1.25)), tgt, 40); }},
  {name: 'knocks', t0: 64.9, t1: 68.4, f(t) { F4.visible = CAB.visible = true; darto.root.visible = false; torchOn(0); nicheLight.intensity = 14;
    const knocks = [66.4, 67.3, 68.2]; let sh = 0; for (const kt of knocks) if (t >= kt && t < kt + 0.25) sh = 0.012 * (1 - (t - kt) / 0.25);
    placeDust(V(-1.0, 0, 21.2), t, 0.8 + 2 * sh * 50);
    cam(V(-0.6, 1.2, 19.85), V(-1.0, 1.0, 21.38), 40, sh > 0 ? shake(t, sh, 30) : null); }},
  {name: 'step-back', t0: 68.4, t1: 69.76, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(1); nicheLight.intensity = 10;
    const k = seg(t, 68.45, 69.5); darto.root.position.set(-1.0, 0.02, lerp(20.6, 19.8, k)); darto.root.rotation.y = 0;
    darto.pose({...(k > 0 && k < 1 ? walkPose(-k * 0.8 / STRIDE * Math.PI, 0.7) : {}), ra: [1.2, 0.1], re: 0.2, head: [0, 0.1], eyes: 1.5, brow: 0.9, mouth: 'o', lean: -0.08}, t);
    cam(V(0.6, 1.4, 18.3), V(-1.0, 1.2, 20.6), 44); }},
  {name: 'pocket-buzz', t0: 69.76, t1: 71.14, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; torchOn(0.8); nicheLight.intensity = 10;
    darto.root.position.set(-1.0, 0.02, 19.8); darto.root.rotation.y = Math.PI * 0.85;
    const buzz = Math.sin(t * 90) * 0.004 * (((t - 69.76) % 0.6) < 0.35 ? 1 : 0); pocket.g.position.x = -0.06 + buzz; pocket.glow.intensity = 0.8; drawPhone(0, 1);
    darto.pose({ra: [0.5, 0.15], re: 0.4, head: [0, -0.35], eyes: 1.3, brow: 0.6, look: [0, -0.8]}, t);
    cam(V(-0.45, 1.35, 18.55), V(-1.0, 1.2, 19.75), 38); }},
  {name: 'phone', t0: 71.14, t1: 77.0, f(t) { F4.visible = CAB.visible = true; torchOn(0); nicheLight.intensity = 6;
    handPhone.g.visible = handGlove.visible = true; const k = seg(t, 73.9, 74.35); drawPhone(k, 1); handPhone.glow.intensity = 0.0;
    const base = V(-1.0, 1.42, 19.55); const bob = V(Math.sin(t * 1.3) * 0.004, Math.sin(t * 1.7) * 0.004, 0);
    handPhone.g.position.copy(base).add(bob); handPhone.g.rotation.set(-0.12, Math.PI + 0.05, 0.04);
    handGlove.position.copy(handPhone.g.position).add(V(0.0, -0.09, 0.012)); handGlove.rotation.set(0, Math.PI, 0); handGlove.scale.setScalar(0.85);
    const p = seg(t, 71.14, 73.6); cam(V(-1.0, 1.45, 19.05).lerp(V(-1.0, 1.43, 19.2), p), base, 30); }},
  {name: 'alone', t0: 77.0, t1: 80.4, f(t) { F4.visible = CAB.visible = true; darto.root.visible = true; nicheLight.intensity = 10 * (1 - seg(t, 79.3, 79.9));
    const fl = t > 79.0 && t < 79.9 ? (hash(Math.floor(t * 14)) > 0.45 ? 1 : 0.15) : t >= 79.9 ? 0 : 1; torchOn(fl);
    darto.root.position.set(-1.0, 0.02, 19.8); darto.root.rotation.y = 0; darto.pose({ra: [1.0, 0.1], re: 0.3, la: [0.6, 0.15], le: 1.2, head: [0, 0.05], eyes: 1.3, brow: 0.7}, t);
    workLight.intensity = 300 * (1 - seg(t, 79.5, 80.2)); workFill.intensity = 14 * (1 - seg(t, 79.5, 80.2));
    cam(V(-1.0, 1.6, 14.5).lerp(V(-1.0, 1.55, 15.4), seg(t, 77, 80.4)), V(-1.0, 1.1, 21.0), 40); }},
  {name: 'end', t0: 80.4, t1: 83.0, f(t) { fadeEl.style.opacity = 1; endEl.style.opacity = seg(t, 81.2, 81.9) * (1 - seg(t, 82.4, 82.95)); cam(V(0, 0, 0), V(0, 0, -1), 40); }},
];
