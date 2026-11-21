// ---------- SHOTS ----------
function cam(pos, look, fov = 45, shake = 0.006, t = 0) {
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos); shake *= 0.5;
  if (shake) camera.position.add(V((noise1(t * 0.7) - 0.5) * shake, (noise1(t * 0.6 + 40) - 0.5) * shake, (noise1(t * 0.5 + 80) - 0.5) * shake));
  camera.lookAt(look);
}
const CTR_POS = V(-2.0, 0, 3.25); // Bayu behind the counter (faces -z)
const BAG_SPOT = V(2.12, 0, 1.93); // standing in front of the bagging area (faces +z)
let fx = {cctv: 0, ca: 1, vig: 1};
const TUBE_OFF = [1, 3, 5, 8], LIGHT_OFF = [1, 3]; // night mode: half the store is dark
function resetAll() {
  fx = {cctv: 0, ca: 0.25, vig: 1}; cctvLive = false; cctvEl.style.display = 'none'; fadeEl.style.opacity = 0; endEl.style.opacity = 0;
  ghosts.forEach(g => g.root.visible = false); bayu.root.visible = true; bayu.root.position.copy(CTR_POS); bayu.root.rotation.set(0, Math.PI, 0);
  drawScreen('off'); kioskLamp(0); screenGlow.intensity = 0; drawScale(null); setReceipt(0);
  tubes.forEach((m, i) => m.material.emissiveIntensity = TUBE_OFF.includes(i) ? 0.04 : 1.3); ceilLights.forEach((l, i) => l.intensity = LIGHT_OFF.includes(i) ? 0.4 : 3.2); keyLight.intensity = 13; storeHemi.intensity = 0.16;
  drawClock('02:59'); clockGlow.intensity = 0.4; doorL.position.x = -0.1; doorR.position.x = 0.5;
  scene.background.set(0x07080a); scene.fog.color.set(0x0b0d10); scene.fog.density = 0.05;
}
// one tube near the kiosk buzzes/flickers on a deterministic pattern
function flicker() {} // removed: flicker read as glitter
const blink = () => true; // steady banner
const pulse = (t, rate = 1.2) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * rate * Math.PI * 2));

const shots = [
  {name: 'kiosk-alert', t0: 0, t1: 3.95, f(t) { flicker(t);
    drawScreen('alert', {blink: blink(t, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(pulse(t)); bayu.root.visible = false;
    const k = seg(t, 0, 3.95); cam(V(2.0, 1.2, 0.85).lerp(V(2.15, 1.22, 1.15), k), V(2.62, 1.5, 2.45), 44, 0.008, t); }},
  {name: 'aisle-empty', t0: 3.95, t1: 7.5, f(t) { flicker(t, 1);
    drawScreen('off'); bayu.root.visible = false;
    const k = seg(t, 3.95, 7.5); cam(V(0.3, 1.55, -4.9).lerp(V(0.3, 1.45, -3.6), k), V(0.3, 1.05, 3.5), 50, 0.006, t); }},
  {name: 'bayu-counter', t0: 7.5, t1: 10.4, f(t) { cctvLive = true;
    const yawn = seg(t, 8.0, 8.5) * (1 - seg(t, 9.2, 9.7));
    bayu.pose({la: [lerp(0.6, 2.6, yawn), lerp(0.35, 0.5, yawn)], le: lerp(1.3, 0.4, yawn), ra: [lerp(0.6, 2.6, yawn), lerp(0.35, 0.5, yawn)], re: lerp(1.3, 0.4, yawn),
      head: [0, -0.1 - 0.25 * yawn], mouth: yawn > 0.3 ? 'o' : 'flat', eyes: lerp(0.75, 0.35, yawn), lean: 0.12 * (1 - yawn)}, t);
    cam(V(-2.3, 1.45, 1.45).lerp(V(-2.25, 1.43, 1.7), seg(t, 7.5, 10.4)), V(-2.0, 1.3, 3.15), 42, 0.006, t); }},
  {name: 'kiosk-new', t0: 10.4, t1: 13.4, f(t) { flicker(t, 0.4); drawScreen('idle'); screenGlow.intensity = 0.9; bayu.root.visible = false;
    const k = seg(t, 10.4, 13.4); cam(V(1.75, 0.95, 1.05).lerp(V(2.25, 1.0, 1.45), k), V(2.82, 0.85, 2.3).lerp(V(2.74, 1.1, 2.45), k), 42, 0.005, t); }},
  {name: 'clock', t0: 13.4, t1: 16.4, f(t) { const on = t >= 15.15; drawClock(on ? '03:00' : '02:59'); clockGlow.intensity = on ? 0.9 : 0.4;
    const k = seg(t, 13.4, 16.4); cam(V(-2.55, 2.0, 1.85).lerp(V(-2.85, 2.1, 1.6), k), V(-3.94, 2.2, 1.4), 44, 0.004, t); }},
  {name: 'kiosk-wake', t0: 16.4, t1: 18.4, f(t) { drawClock('03:00'); flicker(t); cctvLive = true;
    const on = t >= 16.62; drawScreen(on ? 'alert' : 'off', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = on ? 1.6 : 0; kioskLamp(on ? pulse(t - 16.62) : 0);
    const turn = seg(t, 16.9, 17.4);
    bayu.pose({la: [0.6, 0.35], le: 1.3, ra: [0.6, 0.35], re: 1.3, head: [lerp(0, 0.85, turn), -0.05], eyes: lerp(0.8, 1.35, turn), brow: 0.4 * turn, lean: 0.1}, t);
    cam(V(-3.25, 1.98, 2.95), V(1.6, 1.25, 2.55), 48, 0.005, t); }},
  {name: 'bayu-walk', t0: 18.4, t1: 20.25, f(t) { drawClock('03:00'); flicker(t);
    drawScreen('alert', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(pulse(t - 16.62));
    const p0 = V(0.05, 0, 1.95), p1 = BAG_SPOT.clone(); const k = clamp((t - 18.4) / (19.85 - 18.4));
    const p = p0.clone().lerp(p1, k); bayu.root.position.copy(p);
    const strength = ease(k / 0.12) * ease((1 - k) / 0.12);
    const yaw = lerp(Math.PI / 2, 0, seg(t, 19.75, 20.2)); bayu.root.rotation.y = yaw;
    bayu.pose({...walkPose(k * p0.distanceTo(p1) / STRIDE * Math.PI, 0.85 * strength), head: [0.35 * (1 - seg(t, 19.75, 20.2)), 0.05], eyes: 1.2, brow: 0.3}, t);
    cam(V(p.x - 0.35, 1.3, 0.62), V(p.x + 0.25, 1.0, 1.95), 60, 0.006, t); }},
  {name: 'bag-empty', t0: 20.25, t1: 21.65, f(t) { drawClock('03:00');
    drawScreen('alert', {blink: blink(t - 16.62, 2.4)}); screenGlow.intensity = 1.6; kioskLamp(pulse(t - 16.62));
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0;
    const wave = Math.sin((t - 20.3) * 7) * seg(t, 20.35, 20.6);
    bayu.pose({ra: [1.15, 0.15 + 0.25 * wave], re: 0.35, la: [0.1, 0.1], head: [0, 0.55], eyes: 1.25, brow: 0.35, lean: 0.22}, t);
    cam(V(2.3, 2.0, 3.25), V(2.12, 0.95, 2.1), 50, 0.004, t); }},
  {name: 'scale-12', t0: 21.65, t1: 24.6, f(t) { drawClock('03:00'); flicker(t, 0.6);
    const kg = 12 * ease((t - 22.55) / 0.75); const alertOn = t > 23.25;
    drawScreen('weight', {kg: Math.round(kg * 10) / 10}); drawScale(kg, alertOn); screenGlow.intensity = 1.7; kioskLamp(alertOn ? pulse(t, 1.6) : 0.3);
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0; bayu.pose({ra: [0.3, 0.12], la: [0.1, 0.1], head: [-0.35, 0.25], eyes: 1.4, brow: 0.6, mouth: alertOn ? 'o' : 'flat'}, t);
    if (t < 23.6) { const k = seg(t, 21.65, 23.6); cam(V(2.6, 1.66, 1.74).lerp(V(2.64, 1.62, 1.88), k), V(2.7, 1.38, 2.62), 44, 0.003, t); }
    else { const k = seg(t, 23.6, 24.6); cam(V(2.45, 1.62, 3.15).lerp(V(2.4, 1.6, 3.0), k), V(2.12, 1.42, 1.93), 42, 0.004, t); } }},
];
