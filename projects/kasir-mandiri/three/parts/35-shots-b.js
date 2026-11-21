// ---------- SHOTS, part B (24.6 s → end) ----------
const ON_SCALE = V(2.12, 0.785, 2.5); // standing ON the bagging-area scale plate
const QUEUE_Z = [1.55, 0.85, 0.15, -0.55], KIOSK_Z = 1.95, QX = 2.7;
const VANISH = [51.2, 53.0, 55.0]; // ghosts 0..2 disappear at the kiosk
function resetB() { camera.layers.disable(1); bagProp.visible = false; cctvEl.querySelector('.bl').textContent = ''; }
function stamp(t) { const s = Math.floor(6 * 60 + 30 + (t - 36.9)); const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(((s % 60) + 60) % 60).padStart(2, '0'); return `03:${mm}:${ss}`; }
function cctvView(t, look, fov = 70) { // full-frame CCTV: main camera at the ceiling dome, ghosts visible
  fx.cctv = 1; fx.vig = 0.6; cctvEl.style.display = 'block'; cctvEl.querySelector('.bl').textContent = stamp(t); camera.layers.enable(1);
  cam(cctvCam.position.clone(), look, fov, 0, t); }
function ghostQueue(t) { // queue state for the CCTV scenes
  ghosts.forEach((g, i) => {
    let z = QUEUE_Z[i]; // walk to the kiosk spot when it is this ghost's turn
    const start = i === 0 ? 49.2 : VANISH[i - 1] + 0.25, arrive = i === 0 ? 49.9 : start + (KIOSK_Z - QUEUE_Z[i]) / 1.4;
    let moving = 0, ph = 0;
    if (i < 3) { const k = clamp((t - start) / (arrive - start)); z = lerp(QUEUE_Z[i], KIOSK_Z, k); moving = k > 0 && k < 1 ? 1 : 0; ph = (z - QUEUE_Z[i]) / STRIDE * Math.PI; }
    g.root.position.set(QX + (i === 1 ? 0.05 : i === 2 ? -0.06 : 0), 0, z); g.root.rotation.y = 0;
    g.root.visible = i < 3 ? t < VANISH[i] + 0.04 : true;
    // glitch jitter just before vanishing
    if (i < 3 && t > VANISH[i] - 0.12 && t < VANISH[i] + 0.04) { g.root.position.x += (hash(Math.floor(t * 30) + i) - 0.5) * 0.25; fx.ca = 9; }
    const look = i === 3 ? seg(t, 58.9, 59.5) : 0;
    g.pose({...(moving ? walkPose(ph, 0.8) : {}), head: [0, lerp(0.32, -0.42, look)], eyes: lerp(0.9, 1.45, look), mouth: 'flat', breathe: 0.4}, t);
  });
}
function bayuOnScale(t, extra = {}) { bayu.root.position.copy(ON_SCALE); bayu.root.rotation.y = Math.PI; bayu.pose({la: [0.1, 0.12], ra: [0.1, 0.12], le: 0.2, re: 0.2, ...extra}, t); }

shots.push(
  {name: 'press-cancel', t0: 24.6, t1: 26.4, f(t) {
    const press = t > 24.95 && t < 25.3; drawScreen('weight', {kg: 12, press}); drawScale(12, true); screenGlow.intensity = 1.6; kioskLamp(pulse(t));
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0; const r = seg(t, 24.65, 24.95) * (1 - seg(t, 25.5, 25.9));
    bayu.pose({la: [lerp(0.1, 1.6, r), lerp(0.1, 0.45, r)], le: lerp(0.2, 0.05, r), point: r, lean: 0.15 * r, head: [0.35, -0.1], eyes: 1.3, brow: 0.5}, t);
    cam(V(2.4, 2.02, 0.7), V(2.45, 1.3, 2.45), 52, 0.004, t); }},
  {name: 'weight-rise', t0: 26.4, t1: 30.6, f(t) {
    const kg = t < 27.6 ? 12 : t < 29.0 ? lerp(12, 30, ease((t - 27.6) / 0.7)) : lerp(30, 50, ease((t - 29.0) / 0.5));
    drawScreen('weight', {kg: Math.round(kg * 10) / 10}); drawScale(kg, true); screenGlow.intensity = 1.7; kioskLamp(pulse(t, 1.6));
    bayu.root.position.copy(BAG_SPOT); bayu.root.rotation.y = 0; bayu.pose({head: [0.2, -0.2]}, t);
    const k = seg(t, 26.4, 30.6); cam(V(2.6, 1.66, 1.72).lerp(V(2.66, 1.58, 2.02), k), V(2.7, 1.38, 2.62), 44, 0.003, t); }},
  {name: 'continue', t0: 30.6, t1: 33.5, f(t) {
    drawScreen(t >= 30.8 ? 'continue' : 'weight', {kg: 50}); drawScale(50, false); screenGlow.intensity = 1.4; kioskLamp(0);
    const k = clamp((t - 31.0) / 0.8); const p = BAG_SPOT.clone(); p.z -= 0.45 * k; bayu.root.position.copy(p); bayu.root.rotation.y = 0;
    bayu.pose({...walkPose(-k * 0.45 / STRIDE * Math.PI, 0.6 * (k > 0 && k < 1 ? 1 : 0)), head: [0, -0.05], eyes: 1.35, brow: 0.6, mouth: 'frown', la: [0.15, 0.25], ra: [0.15, 0.25]}, t);
    cam(V(2.3, 1.85, 0.2), V(2.4, 1.2, 2.3), 50, 0.004, t); }},
  {name: 'cctv-glance', t0: 33.5, t1: 36.9, f(t) { cctvLive = true; drawScreen('idle'); screenGlow.intensity = 0.8; ghostQueue(t);
    const look = seg(t, 33.9, 34.5);
    bayu.pose({la: [0.6, 0.35], le: 1.3, ra: [0.6, 0.35], re: 1.3, head: [lerp(0, -0.55, look), lerp(0, 0.35, look)], eyes: lerp(1, 1.3, look), lean: 0.1}, t);
    const k = seg(t, 33.5, 36.9); cam(V(-1.75, 1.85, 3.75).lerp(V(-1.95, 1.72, 3.55), k), V(-2.8, 1.18, 2.75), 44, 0.004, t); }},
  {name: 'cctv-queue', t0: 36.9, t1: 41.5, f(t) { drawScreen('idle'); screenGlow.intensity = 0.8; ghostQueue(t);
    if (t < 37.0) fx.ca = 6;
    cctvView(t, V(2.45, 0.7, 0.75), lerp(72, 64, seg(t, 37.5, 41.5))); }},
  {name: 'turn', t0: 41.5, t1: 42.8, f(t) { const turn = seg(t, 41.6, 42.0);
    bayu.pose({la: [0.6, 0.35], le: 1.3, ra: [0.6, 0.35], re: 1.3, head: [lerp(-0.55, 0.95, turn), lerp(0.35, -0.02, turn)], eyes: 1.4, brow: 0.6, mouth: 'o', lean: 0.05}, t);
    cam(V(-2.05, 1.58, 2.15), V(-2.0, 1.52, 3.25), 40, 0.004, t); }},
  {name: 'empty-pov', t0: 42.8, t1: 45.4, f(t) { drawScreen('idle'); screenGlow.intensity = 0.8;
    bayu.pose({la: [0.6, 0.35], le: 1.3, ra: [0.6, 0.35], re: 1.3, head: [0.95, -0.02], eyes: 1.4, brow: 0.6}, t);
    const k = seg(t, 42.8, 45.4); cam(V(-1.7, 1.62, 3.0).lerp(V(-1.4, 1.6, 2.9), k), V(2.6, 1.0, 2.05), 44, 0.004, t); }},
  {name: 'next-customer', t0: 45.4, t1: 47.6, f(t) { const on = t >= 45.8; drawScreen(on ? 'next' : 'idle', {n: 4}); screenGlow.intensity = on ? 1.5 : 0.8; bayu.root.visible = false;
    const k = seg(t, 45.4, 47.6); cam(V(2.7, 1.22, 0.35).lerp(V(2.7, 1.25, 0.75), k), V(2.7, 1.2, 2.5), 46, 0.004, t); }},
  {name: 'cctv-vanish', t0: 47.6, t1: 60.3, f(t) { ghostQueue(t);
    const n = 4 - VANISH.filter(v => t >= v).length; drawScreen('next', {n}); screenGlow.intensity = 1.5;
    if (t < 47.7) fx.ca = 6;
    const z = seg(t, 57.3, 58.8), g3 = V(QX, 1.5, QUEUE_Z[3]);
    cctvView(t, V(2.45, 0.7, 0.75).lerp(g3, z), lerp(72, 20, z)); }},
  {name: 'back-away', t0: 60.3, t1: 62.3, f(t) { drawScreen('next', {n: 1}); screenGlow.intensity = 1.5;
    const k = clamp((t - 60.5) / 1.4); bayu.root.position.set(lerp(-2.0, -2.55, k), 0, 3.25); bayu.root.rotation.y = Math.PI / 2;
    bayu.pose({...walkPose(-k * 0.55 / STRIDE * Math.PI, 0.7 * (k > 0 && k < 1 ? 1 : 0)), la: [0.5, 0.3], le: 0.9, ra: [0.5, 0.3], re: 0.9, head: [0, 0.05], eyes: 1.45, brow: 0.8, mouth: 'o', lean: -0.08}, t);
    cam(V(-0.95, 1.45, 3.0), V(-2.3, 1.25, 3.25), 46, 0.004, t); }},
  {name: 'look-down', t0: 62.3, t1: 64.2, f(t) { drawScreen('next', {n: 1}); screenGlow.intensity = 1.2; kioskLamp(pulse(t) * 0.7);
    const d = seg(t, 62.6, 63.8); bayuOnScale(t, {head: [0, lerp(-0.05, 0.6, d)], eyes: 1.3, brow: 0.6, mouth: 'flat'});
    cam(V(2.1, 2.42, 1.75), V(2.12, 2.36, 2.5), 40, 0.003, t); }},
  {name: 'feet-on-scale', t0: 64.2, t1: 66.6, f(t) { drawScreen('next', {n: 1}); screenGlow.intensity = 1.2; kioskLamp(pulse(t)); drawScale(null);
    bayuOnScale(t, {head: [0, 0.6], eyes: 1.45, brow: 0.8, mouth: 'o'});
    const k = seg(t, 64.2, 66.6); cam(V(1.95, 1.55, 1.55).lerp(V(2.0, 1.45, 1.7), k), V(2.12, 0.9, 2.45), 46, 0.003, t); }},
  {name: 'screen-68', t0: 66.6, t1: 69.9, f(t) { const kg = 68 * ease((t - 67.9) / 1.3);
    drawScreen('weight', {kg: Math.round(kg * 10) / 10}); drawScale(kg, kg > 67.9); screenGlow.intensity = 1.7; kioskLamp(pulse(t, 1.6));
    bayuOnScale(t, {head: [0, 0.6], eyes: 1.45, brow: 0.8, mouth: 'o'});
    const k = seg(t, 66.6, 69.9); cam(V(2.6, 1.66, 1.72).lerp(V(2.66, 1.6, 1.95), k), V(2.7, 1.38, 2.62), 44, 0.003, t); }},
  {name: 'on-scale-wide', t0: 69.9, t1: 71.6, f(t) { drawScreen('weight', {kg: 68}); drawScale(68, true); screenGlow.intensity = 1.7; kioskLamp(pulse(t, 1.6));
    bayuOnScale(t, {head: [0, 0.1], eyes: 1.45, brow: 0.8, mouth: 'o'});
    const k = seg(t, 69.9, 71.6); cam(V(1.15, 1.55, 0.25).lerp(V(1.3, 1.55, 0.5), k), V(2.35, 1.45, 2.45), 50, 0.004, t); }},
  {name: 'receipt', t0: 71.6, t1: 77.6, f(t) { drawScreen(t >= 76.0 ? 'paid' : 'weight', {kg: 68}); drawScale(68, t < 76.0); screenGlow.intensity = 0.5; kioskLamp(t < 76.0 ? pulse(t) : 0);
    bayuOnScale(t, {head: [0, 0.4], eyes: 1.3, brow: 0.6}); setReceipt(seg(t, 71.8, 75.4));
    const k = seg(t, 71.6, 77.6); cam(V(2.48, 1.42, 1.9).lerp(V(2.5, 1.36, 2.0), k), V(2.57, 1.2, 2.33), 40, 0.002, t); }},
  {name: 'paid', t0: 77.6, t1: 80.7, f(t) { drawScreen('paid'); drawScale(68, false); screenGlow.intensity = 1.4; bayu.root.visible = false; bagProp.visible = true; setReceipt(1);
    const k = seg(t, 77.6, 80.7); cam(V(1.95, 1.52, 1.1).lerp(V(2.02, 1.45, 1.35), k), V(2.38, 1.05, 2.45), 46, 0.003, t); }},
  {name: 'cctv-end', t0: 80.7, t1: 83.6, f(t) { drawScreen('idle'); screenGlow.intensity = 0.8; bayu.root.visible = false; bagProp.visible = true;
    ghosts.forEach(g => g.root.visible = false);
    const g3 = ghosts[3]; g3.root.visible = t > 81.6; g3.root.position.set(QX, 0, QUEUE_Z[3]); g3.root.rotation.y = 0;
    if (t > 81.55 && t < 81.72) { g3.root.position.x += (hash(Math.floor(t * 30)) - 0.5) * 0.25; fx.ca = 9; }
    const look = seg(t, 82.2, 82.7); g3.pose({head: [0, lerp(0.32, -0.42, look)], eyes: lerp(0.9, 1.45, look), breathe: 0.4}, t);
    if (t < 80.8) fx.ca = 6;
    cctvView(t, V(2.45, 0.7, 0.75), 70); fadeEl.style.opacity = seg(t, 82.9, 83.5); }},
);
