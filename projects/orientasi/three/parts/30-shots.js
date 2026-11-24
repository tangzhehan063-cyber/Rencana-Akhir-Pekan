// ---------- ORIENTASI KARYAWAN BARU: cast, helpers, shots (engine parts are shared with ABSEN) ----------
const bimo = makeStick({tie: false, card: true});                                   // new hire
const rudi = makeStick({tie: true, card: true});                                     // from LANTAI 4
const darto = makeStick({tie: false, card: false, cap: true, mustache: true, badge: true, belt: true});   // from ABSEN
for (const [a, s] of [[bimo, 0.6], [rudi, 2.1], [darto, 1.3]]) { a.setBlinkSeed(s); scene.add(a.root); a.root.visible = false; }
const LV = (x, y, z) => V(60 + x, y, z);
function cam(pos, look, fov = 45, sh = null) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(pos); if (sh) camera.position.add(sh); camera.lookAt(look); }
function put(a, p, ry = 0) { a.root.visible = true; a.root.position.copy(p); a.root.rotation.y = ry; return a; }
let fx = {ca: 1, vig: 1};
const lerpV = (a, b, k) => a.clone().lerp(b, k);

// machine screen with a custom name / log (shared drawMach hard-codes RUDI/DARTO)
function drawMachX(mode, clock = '07:00') { const {g, c} = machTex.userData, key = 'X' + mode + clock; if (machTex.userData.state === key) return; machTex.userData.state = key;
  const w = c.width, h = c.height; g.shadowBlur = 0; g.fillStyle = mode === 'thanks' || mode === 'log' ? '#0c2a17' : mode === 'out' ? '#2a0c0c' : '#0d1a20'; g.fillRect(0, 0, w, h); g.textAlign = 'center';
  g.fillStyle = '#9fe8ff'; g.font = 'bold 22px Nunito'; g.fillText(clock, w / 2, 26);
  if (mode === 'thanks') { g.fillStyle = '#7dffa9'; g.shadowColor = '#3dff7a'; g.shadowBlur = 10; g.font = '900 30px Nunito'; g.fillText('TERIMA KASIH', w / 2, 82); g.font = '900 40px Nunito'; g.fillText('BIMO', w / 2, 128); g.shadowBlur = 0; }
  else if (mode === 'log') { g.textAlign = 'left'; g.font = '800 21px Nunito'; g.fillStyle = '#7dffa9';
    [['RUDI', '07:00 ✓'], ['DARTO', '07:00 ✓'], ['BIMO', '07:00 ✓']].forEach(([n, t], i) => { g.textAlign = 'left'; g.fillText(n, 26, 62 + i * 30); g.textAlign = 'right'; g.fillText(t, w - 26, 62 + i * 30); }); }
  else if (mode === 'out') { g.fillStyle = '#ff8a7a'; g.shadowColor = '#ff3326'; g.shadowBlur = 10; g.font = '900 24px Nunito'; g.fillText('ABSEN PULANG', w / 2, 82); g.font = '900 25px Nunito'; g.fillText('TIDAK TERSEDIA', w / 2, 122); g.shadowBlur = 0; }
  else { g.fillStyle = '#6f8f9a'; g.font = '700 22px Nunito'; g.fillText('TEMPELKAN KARTU', w / 2, 95); }
  machTex.needsUpdate = true; }
// work schedule board: Bimo's name instead of SATPAM
const boardDrawOri = (g, w, h) => {
  g.fillStyle = '#f2f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
  g.fillStyle = '#1d2a5c'; g.font = '700 82px Caveat'; g.fillText('JADWAL KERJA — LT. 4', 60, 120);
  g.font = '700 62px Caveat'; g.fillStyle = '#26324f';
  g.fillText('Rabu: plester  ✓', 70, 220); g.fillText('Kamis 07.00: tutup dinding  ✓', 70, 300); g.strokeStyle = '#26324f'; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 282); g.lineTo(760, 290); g.stroke();
  g.fillStyle = '#b3201a'; g.font = '700 74px Caveat'; g.fillText('BESOK 07.00 →', 70, 420); g.fillText('TUTUP DINDING', 70, 505); g.font = '700 96px Caveat'; g.fillText('BIMO', 560, 595); g.font = '700 40px Caveat'; g.fillText('(karyawan baru)', 540, 630); };

function resetScene() {
  LOB.visible = STW.visible = F4.visible = CAB.visible = false; for (const a of [bimo, rudi, darto]) a.root.visible = false;
  drawMachX('idle'); machLight.intensity = 0; scanGlow.material.opacity = 0.15; drawWClock('07:00');
  lobDoorL.position.x = -0.3; lobDoorR.position.x = 0.3; lobCabLight.intensity = 0; drawLed(lobLedTex, 'L', '#ffb020');
  doorL.position.x = -0.3; doorR.position.x = 0.3; drawLed(inLedTex, '5'); for (const k of ['5', '4', '3', '2', '1', 'G']) setBtn(k, false); redLight.intensity = 0; tapeGlow.intensity = 0;
  fx = {ca: 1, vig: 1}; dust.visible = false; endEl.style.opacity = 0; fadeEl.style.opacity = 0; lowerEl.style.opacity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); scene.fog.density = 0.045; nicheLight.intensity = 0;
  workLight.intensity = 8; workFill.intensity = 2; coldFill.intensity = 5; boardLight.intensity = 3; lampGlow.visible = true; cabLightPanel.visible = true; cabLight.intensity = 5.5; cabSpill.intensity = 45;
  nicheBack.visible = false; print.visible = false; pushGlove.visible = false; swayPlastic(0, 0.6); }
function lobbyBase(dawnK = 1) { LOB.visible = true; dawn.intensity = 60 * dawnK; lobAmb.intensity = 4 * dawnK; scene.fog.density = 0.02; }
function corridor(t) { F4.visible = CAB.visible = true; swayPlastic(t, 0.6); }

const GHOST_X = 2.1, GHOST_Z = 7.7;   // Rudi and Darto stand nose-to-column either side of the path
function ghosts(t, turn, smile) {         // turn: 0 faces wall .. 1 head fully turned back to the corridor; smile: 0..1 unnatural smile
  put(rudi, V(-GHOST_X, 0.02, GHOST_Z), -Math.PI / 2); put(darto, V(GHOST_X, 0.02, GHOST_Z), Math.PI / 2);
  const f = (turnDir) => compose(expr('unnaturalSmile', smile), {head: [turnDir * 2.1 * ease(turn), 0]});
  rudi.pose(compose(POSE.idle, tremble(t, 0.3 * (1 - turn)), f(1)), t); darto.pose(compose(POSE.idle, f(-1)), t); }

const shots = [
  {name: 's01-welcome', t0: 0, t1: 3.9, f(t) { lobbyBase(1);
    const pw = walkTo(bimo, t, 0.2, 3.9, LV(-1.6, 0.02, 5.6), LV(-1.0, 0.02, 1.9), 1); put(bimo, bimo.root.position, bimo.root.rotation.y);
    bimo.pose(compose(pw, expr('excited', 0.7), {la: [0.4, 0.3]}), t);
    cam(LV(0.9, 1.5, -3.0 + 0.5 * seg(t, 0, 3.9)), LV(-1.1, 1.2, 3.0), 44); }},
  {name: 's02-turn', t0: 3.9, t1: 9.4, f(t) { lobbyBase(1); const turn = seg(t, 6.6, 7.6), walk = seg(t, 7.8, 9.0);
    put(bimo, lerpV(LV(-1.0, 0.02, 1.9), LV(0.05, 0.02, 2.3), walk), lerp(Math.PI, 0, turn));
    const body = t < 6.4 ? wave(t - 3.9, 1) : (t < 7.8 ? POSE.idle : walkPose(walk * 0.4 / STRIDE * Math.PI, Math.min(1, Math.sin(walk * Math.PI) * 2)));
    bimo.pose(compose(body, expr(t < 6.4 ? 'excited' : 'smug', 0.6)), t);
    cam(LV(2.2, 1.45, 0.0), LV(-0.5, 1.15, 2.0), 46); }},
  {name: 's03-tap', t0: 9.4, t1: 16.8, f(t) { lobbyBase(1); put(bimo, LV(0.05, 0.02, 2.3), 0);
    const tap = poseTrack([[0, 'idle'], [12.4, 'reachForward', 0.5], [13.4, 'idle', 0.5]], t);
    bimo.pose(compose(only(tap, 'arms'), expr(t < 13.2 ? 'excited' : 'smug', 0.7)), t);
    drawMachX(t > 13.1 ? 'thanks' : 'idle'); machLight.intensity = t > 13.1 ? 2.2 : 0; scanGlow.material.opacity = t > 13.1 ? 0.9 * (0.6 + 0.4 * Math.sin(t * 7)) : 0.15;
    cam(LV(1.5, 1.5, 0.3), LV(0.0, 1.3, 2.9), 40); }},
  {name: 's04-log', t0: 16.8, t1: 19.9, f(t) { lobbyBase(0.8); drawMachX('log'); machLight.intensity = 2.4; scanGlow.material.opacity = 0.2; const k = seg(t, 16.8, 19.9);
    cam(LV(-0.04, 1.3, lerp(2.15, 2.5, k)), LV(0, 1.26, 2.98), 36); }},
  {name: 's05-react', t0: 19.9, t1: 21.4, f(t) { lobbyBase(0.8); drawMachX('thanks'); machLight.intensity = 2.2; scanGlow.material.opacity = 0.7; put(bimo, LV(0.05, 0.02, 2.3), Math.PI);
    const k = seg(t, 19.9, 20.5); bimo.pose(compose(POSE.idle, exprMix('smug', 'awkward', k), {look: [-1, 0.1]}, {head: [0.15 * k, 0]}), t);
    cam(LV(0.1, 1.5, -0.2), LV(0.05, 1.5, 2.3), 24); }},
  {name: 's06-liftin', t0: 21.4, t1: 26.0, f(t) { corridor(t); drawLed(inLedTex, 'G', '#ffb020'); put(bimo, V(0.2, 0.0, -0.75), Math.PI / 2);
    const press = seg(t, 23.6, 24.1) * (1 - seg(t, 24.3, 24.8)); setBtn('G', t > 24.0);
    bimo.pose(compose(POSE.idle, {ra: [lerp(0.05, 1.1, press), 0.1], re: lerp(0.15, 0.4, press)}, expr('excited', 0.5)), t);
    cam(V(-0.6, 1.5, -0.2), V(0.8, 1.15, -0.5), 55); }},
  {name: 's07-tape', t0: 26.0, t1: 29.2, f(t) { corridor(t); drawLed(inLedTex, 'G', '#ffb020'); setBtn('G', true); put(bimo, V(0.2, 0.0, -0.75), Math.PI / 2); tapeGlow.intensity = 0.5 + 0.4 * Math.sin(t * 6);
    const k = seg(t, 26.9, 27.7); bimo.pose(compose(POSE.idle, exprMix('smug', 'deadpan', k), {look: [lerp(0, 1, k), 0], head: [0, 0.02]}), t);
    cam(V(-0.25, 1.45, -0.12), V(0.75, 1.3, -0.32), 40); }},
  {name: 's08-ride', t0: 29.2, t1: 34.4, f(t) { corridor(t); cabLight.intensity = 1.1; cabSpill.intensity = 0; cabLightPanel.visible = false; put(bimo, V(-0.25, 0.0, -0.6), 0.1); const fl = ['G', '1', '2', '3', '4'][Math.min(4, Math.floor((t - 29.4) / 1.0))] || 'G';
    drawLed(inLedTex, fl, fl === '4' ? '#ff2a1a' : '#ffb020'); redLight.intensity = fl === '4' ? 3 : 0; for (const k of ['G']) setBtn(k, true);
    const up = seg(t, 29.6, 30.4); bimo.pose(compose(POSE.idle, {head: [0, 0.22 * up]}, acting([[29.2, 'smug', 0.5], [31.5, 'nervous', 0.7], [33.8, 'suspicious', 0.9]], t, 'comedy')), t);
    cam(V(0.3, 1.3, -1.45), V(-0.1, 1.6, 0), 66); }},
  {name: 's09-doors', t0: 34.4, t1: 38.6, f(t) { corridor(t); cabLight.intensity = 2.2; cabSpill.intensity = 8; put(bimo, V(0, 0.0, -0.7), 0); drawLed(inLedTex, '4', '#ff2a1a'); redLight.intensity = 3; setBtn('G', true);
    const o = seg(t, 35.0, 36.0); doorL.position.x = -0.3 - 0.62 * o; doorR.position.x = 0.3 + 0.62 * o;
    const w = seg(t, 36.6, 37.0) * (1 - seg(t, 38.0, 38.5));
    bimo.pose(compose(POSE.idle, {la: [lerp(0.05, 2.4, w), 0.35], le: lerp(0.15, 0.6 + 0.3 * Math.sin(t * 10), w)}, expr('awkward', 1)), t);
    cam(V(0, 1.42, 2.4), V(0, 1.35, -0.7), 36); }},
  {name: 's10-walk', t0: 38.6, t1: 43.2, f(t) { corridor(t); workLight.intensity = 22; workFill.intensity = 3; doorL.position.x = -0.92; doorR.position.x = 0.92; drawLed(inLedTex, '4', '#ff2a1a');
    const pw = walkTo(bimo, t, 38.9, 43.2, V(0, 0.02, -0.2), V(0, 0.02, 5.4), 0.9); bimo.root.visible = true;
    bimo.pose(compose(pw, acting([[38.6, 'awkward', 0.8], [41.5, 'nervous', 0.9]], t, 'comedy'), lookAround(t, 38.9, 0.6)), t);
    ghosts(t, 0, 0); placeDust(V(0, 0, 6), t, 0.8);
    const k = seg(t, 38.6, 43.2); cam(V(0.5, 1.5, lerp(-0.9, 0.2, k)), V(0, 1.2, 8.5), 52); }},
  {name: 's11-turn', t0: 43.2, t1: 45.8, f(t) { corridor(t); workLight.intensity = 45; workFill.intensity = 4; put(bimo, V(0.4, 0.02, 5.2), 0); bimo.pose(compose(POSE.idle, expr('nervous', 0.9), {look: [-0.7, 0]}), t); const k = seg(t, 43.5, 44.6);
    ghosts(t, k, seg(t, 44.0, 44.9)); placeDust(V(0, 0, 7), t, 0.8); cam(V(-0.2, 1.55, 9.8), V(-2.1, 1.5, 7.7), 34); }},
  {name: 's12-smiles', t0: 45.8, t1: 50.4, f(t) { corridor(t); workLight.intensity = 45; workFill.intensity = 4; ghosts(t, 1, 1); const sw = t < 48.0; const g = sw ? rudi : darto; const p = g.root.position;
    bimo.root.visible = false; const k = seg(t, 45.8, 50.4); const cx = sw ? -0.6 + 0.15 * k : 0.6 - 0.15 * k;
    cam(V(cx, 1.55, 9.3), V(p.x, 1.58, p.z), 24); }},
  {name: 's13-board', t0: 50.4, t1: 54.2, f(t) { corridor(t); lampGlow.visible = false; workLight.intensity = 6; boardLight.intensity = 0.7; put(bimo, V(0.0, 0.02, 15.6), 0.65); const k = seg(t, 50.4, 54.2);
    bimo.pose(compose(POSE.idle, acting([[50.4, 'smug', 0.7], [52.5, 'confused', 0.9], [53.8, 'nervous', 1]], t, 'comedy')), t);
    cam(lerpV(V(-1.3, 1.6, 13.6), V(-1.0, 1.58, 14.1), k), V(1.6, 1.4, 18.4), 46); }},
  {name: 's14-boardclose', t0: 54.2, t1: 57.0, f(t) { corridor(t); lampGlow.visible = false; workLight.intensity = 35; workFill.intensity = 5; boardLight.intensity = 2;
    const k = seg(t, 54.2, 56.8); const a = BOARD.localToWorld(V(0, 1.1, 0)), b = BOARD.localToWorld(V(0.38, 1.0, 0)); const n = BOARD.localToWorld(V(0, 0, 1)).sub(BOARD.localToWorld(V(0, 0, 0))).normalize();
    const tgt = lerpV(a, b, k); cam(tgt.clone().add(n.multiplyScalar(lerp(1.45, 1.1, k))), tgt, 40); }},
  {name: 's15-niche', t0: 57.0, t1: 60.2, f(t) { corridor(t); lampGlow.visible = false; workLight.intensity = 12; nicheLight.intensity = 14; coldFill.intensity = 8;
    put(rudi, V(-1.9, 0.02, 20.5), 0.4); put(darto, V(-0.1, 0.02, 20.5), -0.4);
    rudi.pose(compose(POSE.point, expr('unnaturalSmile', 1), {head: [0.4, 0]}), t); darto.pose(compose({ra: [1.45, 0.15], re: 0.05, la: [0.05, 0.1]}, expr('unnaturalSmile', 1), {head: [-0.4, 0]}), t);
    put(bimo, V(-0.35, 0.02, 16.4), 0); bimo.pose(compose(POSE.idle, expr('shocked', 0.9), tremble(t, 1.5)), t);
    cam(V(0.35, 1.45, 14.6), V(-1.0, 1.25, 21.6), 46); }},
  {name: 's16-sendoff', t0: 60.2, t1: 65.8, f(t) { corridor(t); lampGlow.visible = false; const k = seg(t, 60.9, 63.8);
    put(rudi, V(-1.9, 0.02, 20.5), 0.4); put(darto, V(-0.1, 0.02, 20.5), -0.4);
    rudi.pose(compose(wave(t, 1), expr('unnaturalSmile', 1), {head: [0.4, 0]}), t); darto.pose(compose(wave(t + 0.4, 1), expr('unnaturalSmile', 1), {head: [-0.4, 0]}), t);
    const pr = lerpV(V(-1.0, 0.02, 17.4), V(-1.0, 0.02, 9.0), k); bimo.root.visible = true; bimo.root.position.copy(pr); bimo.root.rotation.y = Math.PI;
    bimo.pose(compose(t < 60.9 ? POSE.startled : run(((pr.z - 17.4) / STRIDE) * Math.PI * -0.9, 1), expr('panicked', 1)), t);
    const dark = seg(t, 63.9, 64.4); workLight.intensity = 12 * (1 - dark); workFill.intensity = 14 * (1 - dark); coldFill.intensity = 8 * (1 - dark); nicheLight.intensity = 14 * (1 - dark); scene.fog.color.set(0x000000);
    cam(V(1.6, 1.5, 15.0), V(-1.0, 1.3, 20.0), 46); }},
  {name: 's17-morning', t0: 65.8, t1: 71.0, f(t) { lobbyBase(1); const out = t >= 68.5; drawMachX(out ? 'out' : 'thanks'); machLight.intensity = out ? 1.6 : 2.2; scanGlow.material.opacity = 0.2; drawWClock('07:00');
    if (!out) cam(lerpV(LV(0.4, 1.45, -0.6), LV(0.1, 1.35, 1.0), seg(t, 65.8, 68.5)), LV(0, 1.3, 3.0), 38);       // wide: machine greets Bimo
    else cam(lerpV(LV(0, 1.3, 1.9), LV(0, 1.27, 2.2), seg(t, 68.5, 71)), LV(0, 1.25, 2.98), 30);                  // punchline close-up: "ABSEN PULANG: TIDAK TERSEDIA"
    endEl.innerHTML = 'PT LANTAI EMPAT SEJAHTERA<small>Kami peduli pada kehadiran Anda.</small>'; fadeEl.style.opacity = 0.93 * seg(t, 69.7, 70.2) + 0.07 * seg(t, 70.6, 71.0); endEl.style.opacity = seg(t, 70.1, 70.5); }},
];
