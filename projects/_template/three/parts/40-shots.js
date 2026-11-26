// ---------- SHOTS ----------
// Rules that keep renders deterministic and seekable (checked by the preflight script):
//   * reset() puts EVERY mutable thing back to a neutral state; renderAt() calls it before each shot.
//   * a shot's f(t) sets everything it needs from t alone (no state carried over from the previous frame).
//   * shots are contiguous: each t0 equals the previous t1.
let fx = {cctv: 0, ca: LOOK.ca, vig: LOOK.vignette, rim: LOOK.rim.intensity, key: LOOK.key.intensity};
function reset() {
  ROOM.visible = false; cast.forEach(a => { a.root.visible = false; a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, 0); a.pose({}, 0); });
  torchA.set(0); dust.visible = false; _dustBeam = null; drawClock('00:59'); roomDoor.rotation.y = 0;
  lamp.intensity = 6; moon.intensity = 20; roomFill.intensity = 0.5;
  fx = {cctv: 0, ca: LOOK.ca, vig: LOOK.vignette, rim: LOOK.rim.intensity, key: LOOK.key.intensity}; cctvEl.style.display = 'none'; endEl.style.opacity = 0; fadeEl.style.opacity = 0;
  scene.background.set(0x05070a); scene.fog.color.set(0x080b0f); scene.fog.density = 0.045;
}
function roomBase() { ROOM.visible = true; scene.fog.density = 0.03; }
const B_AT = V(0.5, 0, -2.6); // tokoh B stands under the ceiling lamp (key light for the close-up)
const SIT_A = () => ({...POSE.sitting, hipY: tokohA.metrics.sitHipY(SEAT_TOP)}); // seat height from the body, not a magic number

const shots = [
  {name: 'wide-room', t0: 0, t1: 3.2, f(t) { roomBase(); fx.rim = 0.5;
    tokohA.root.visible = tokohB.root.visible = true;
    tokohA.root.position.copy(SEAT_AT); tokohA.pose({...SIT_A(), ra: [0.95, 0.12], re: 0.45, head: [0.3, 0.05], eyes: 1.1}, t); torchA.set(1, 2.5);
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = -0.25; tokohB.pose({...POSE.handsClasped, head: [-0.3, 0.1], ...expr('creepy', 0.6)}, t);
    placeDust(V(-0.5, 0, -1.5), t, 1, torchA);
    const k = seg(t, 0, 3.2); cam(V(-0.5, 1.65, 2.8).lerp(V(-0.45, 1.6, 2.3), k), V(-0.55, 1.0, -1.8), 50, 0.003, t); }},
  {name: 'stand-walk', t0: 3.2, t1: 6.4, f(t) { roomBase(); fx.rim = 0.5; tokohA.root.visible = true;
    const p0 = SEAT_AT.clone(), p1 = V(0.9, 0, 0.3);
    const pw = walkToBody(tokohA, t, 3.6, 6.2, p0, p1);
    if (t < 3.6) { tokohA.root.position.copy(p0); tokohA.root.rotation.y = 0; }
    tokohA.pose(compose(t < 3.6 ? poseMix(SIT_A(), 'idle', seg(t, 3.2, 3.6)) : pw, {ra: [1.25, 0.05], re: 0.2}, expr('nervous', 0.8)), t);
    const c = tokohA.root.position; torchA.set(1, 2.0); placeDust(c, t, 1, torchA);
    cam(V(c.x + 1.1, 1.45, c.z + 2.2), V(c.x, 1.05, c.z - 0.3), 48, 0.003, t); }},
  {name: 'close-b', t0: 6.4, t1: 9.0, f(t) { roomBase(); fx.rim = 0.7; fx.key = 1.3; tokohB.root.visible = true;
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = 0.15;
    tokohB.pose({...acting([[6.4, 'deadpan', 1], [7.6, 'unnaturalSmile', 1]], t), head: [0, 0.04]}, t);
    const e = tokohB.root.position.clone().add(V(0, tokohB.metrics.eyeY, 0)); // frame on the body's real eye height
    cam(e.clone().add(V(0.15, 0.02, 0.95)), e.clone().add(V(0, -0.04, 0)), 34, 0.0015, t); }},
  {name: 'cctv', t0: 9.0, t1: 11.0, f(t) { roomBase(); fx.cctv = 1; drawClock('01:00');
    tokohA.root.visible = tokohB.root.visible = true;
    tokohA.root.position.set(0.9, 0, 0.3); tokohA.root.rotation.y = Math.PI * 0.92; tokohA.pose({head: [0.1, 0], eyes: 1.4}, t);
    tokohB.root.position.copy(B_AT); tokohB.root.rotation.y = -0.3; tokohB.pose({head: [-0.5, 0]}, t);
    cctvText('21-11-2026  01:00:0' + Math.floor((t - 9) * 4)); cam(V(-2.6, 2.75, 3.5), V(0.3, 0.8, -2.4), 58); }},
  {name: 'end', t0: 11.0, t1: 14.0, f(t) { fadeEl.style.opacity = 1; endEl.style.opacity = seg(t, 11.3, 11.9) * (1 - seg(t, 13.3, 13.9)); cam(V(0, 0, 0), V(0, 0, -1), 40); }},
];
