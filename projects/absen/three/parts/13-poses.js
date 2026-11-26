// ---------- POSE & MOTION LIBRARY (additive; existing walkPose/walkTo/sit() are untouched) ----------
// Static poses are patches for actor.pose(); motions are functions of time/phase returning patches.
//   POSE.<name>                       static body poses (point, think, shrug, facepalm, startled, cower, sitting, ...)
//   run(ph) sneak(ph) talk(t,en) wave(t) lookAround(t,t0) lookBehind(k) tremble(t,amt) sitNervous(t)   motions
//   compose(a, b, ...)                merge patches, later wins per key;  only(p, 'arms','head',...)  keeps just those body parts of a patch (arms/legs/torso/head/face)
//   poseMix(a, b, k)                  blend two poses (names or patches)
//   poseTrack([[t, name, blendIn, ease], ...], t)   hold/blend through poses over time: no sudden pose changes, optional overshoot ease 'back'
// Combine freely:  darto.pose({...compose(walkPose(ph), lookBehind(k), expr('nervous')), ...}, t)
// Pose keys: la/ra=[forward, out], le/re elbow, ll/rl=[swing, out], lk/rk knee, lean, twist, hipY, head=[yaw,pitch], roll, point, shrug (+ expression keys from 12-expressions.js)
const BODY_GROUPS = {
  arms: ['la', 'le', 'ra', 're', 'point', 'shrug'], legs: ['ll', 'lk', 'rl', 'rk', 'hipY'], torso: ['lean', 'twist'],
  head: ['head', 'roll'], face: ['eyes', 'look', 'mouth', 'brow', 'browL', 'browR', 'byL', 'byR', 'lid', 'cross', 'eyeAsym', 'pupilS', 'glint', 'mw', 'mc', 'my', 'mx', 'mtilt', 'mo', 'blink'] };
const POSE_NEUTRAL = {la: [0.05, 0.1], le: 0.15, ra: [0.05, 0.1], re: 0.15, ll: [0, 0.02], lk: 0, rl: [0, 0.02], rk: 0, head: [0, 0], roll: 0, lean: 0, twist: 0, hipY: 0, point: 0, shrug: 0};
function compose(...ps) { return Object.assign({}, ...ps.filter(Boolean)); }
function only(p, ...groups) { const keep = new Set(groups.flatMap(g => BODY_GROUPS[g])); return Object.fromEntries(Object.entries(p).filter(([k]) => keep.has(k))); }   // e.g. only(poseTrack(...), 'arms') over a walk cycle
function poseAdd(a, b) { const o = {...a}; for (const [k, v] of Object.entries(b)) o[k] = Array.isArray(v) ? v.map((x, i) => x + (a[k] ? a[k][i] : (POSE_NEUTRAL[k] ? POSE_NEUTRAL[k][i] : 0))) : typeof v === 'number' ? v + (a[k] ?? POSE_NEUTRAL[k] ?? 0) : v; return o; }
const POSE = {
  idle:       {},
  point:      {la: [1.45, 0.15], le: 0.05, point: 1, lean: 0.03},
  think:      {ra: [0.55, -0.1], re: 2.3, la: [0.1, 0.1], head: [0, -0.12], roll: 0.1, lean: 0.03},
  shrug:      {la: [0.3, 0.5], le: 1.1, ra: [0.3, 0.5], re: 1.1, shrug: 1, roll: 0.1, head: [0, 0.03]},
  facepalm:   {ra: [0.95, -0.05], re: 2.45, head: [0, -0.18], lean: 0.12, roll: -0.05},
  startled:   {lean: -0.15, la: [0.55, 0.95], le: 0.4, ra: [0.55, 0.95], re: 0.4, head: [0, 0.1], ll: [0.2, 0.15], rl: [-0.1, 0.12], hipY: 0.01, shrug: 0.6},
  cower:      {lean: 0.45, hipY: -0.28, ll: [0.95, 0.12], lk: 1.45, rl: [0.85, 0.12], rk: 1.5, la: [2.3, 0.1], le: 1.8, ra: [2.3, 0.1], re: 1.8, head: [0, -0.2], shrug: 1},
  sitting:    {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.95, 0.12], re: 0.45, la: [0.6, 0.15], le: 1.2, lean: 0.06},       // same values as the project's sit()
  slumped:    {hipY: -0.4, ll: [1.5, 0.06], lk: 1.5, rl: [1.5, 0.06], rk: 1.5, ra: [0.3, 0.15], re: 0.2, la: [0.3, 0.15], le: 0.2, lean: 0.28, head: [0, -0.25]},
  armsCrossed:{la: [0.35, -0.1], le: 1.9, ra: [0.2, -0.5], re: 1.9, lean: -0.02},
  handsClasped:{la: [0.5, -0.2], le: 1.5, ra: [0.5, -0.2], re: 1.5},
  handsUp:    {la: [2.5, 0.35], le: 0.5, ra: [2.5, 0.35], re: 0.5, head: [0, 0.08], shrug: 0.4},
  reachForward: {la: [1.45, 0.05], le: 0.1, ra: [1.45, 0.05], re: 0.1, lean: 0.12},      // door handle / object grab start
  holdUp:     {ra: [1.25, 0.05], re: 0.2, lean: 0.02},                                          // torch / phone raised
  crouch:     {hipY: -0.3, ll: [1.0, 0.1], lk: 1.6, rl: [0.9, 0.1], rk: 1.6, lean: 0.35, la: [0.6, 0.15], le: 0.9, ra: [0.6, 0.15], re: 0.9, head: [0, 0.2]},
};
// ---- locomotion (phase ph advances with travelled distance, as walkPose; stride ~0.62 m per half-cycle) ----
function run(ph, amt = 1) { const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.9 * s * amt, 0.03], lk: (Math.max(0, -c) * 1.3 + 0.15) * amt, rl: [-0.9 * s * amt, 0.03], rk: (Math.max(0, c) * 1.3 + 0.15) * amt,
    la: [-0.75 * s * amt, 0.12], ra: [0.75 * s * amt, 0.12], le: 1.2 * amt, re: 1.2 * amt, hipY: -0.05 * Math.abs(Math.cos(ph)) * amt, twist: 0.14 * s * amt, lean: 0.2 * amt}; }
function sneak(ph, amt = 1) { const s = Math.sin(ph), c = Math.cos(ph);
  return {ll: [0.28 * s * amt, 0.03], lk: (Math.max(0, -c) * 0.5 + 0.55) * amt, rl: [-0.28 * s * amt, 0.03], rk: (Math.max(0, c) * 0.5 + 0.55) * amt,
    la: [0.4 * amt, 0.12], ra: [0.4 * amt, 0.12], le: 0.9 * amt, re: 0.9 * amt, hipY: -0.13 * amt, lean: 0.2 * amt, twist: 0.05 * s * amt}; }
// ---- upper-body motions (deterministic in t) ----
function wave(t, amt = 1) { return {ra: [2.5, 0.45 * amt + 0.1], re: 0.5 + 0.45 * Math.sin(t * 10) * amt, head: [0.12 * amt, 0.04], roll: -0.05 * amt}; }
function talk(t, en = 1) { const m = 0.35 + 0.55 * Math.abs(Math.sin(t * 9.3)) * (0.6 + 0.4 * noise1(t * 3));                                   // lip-flap + hand gesture + small nods
  return {mouth: 'open', mo: m, ra: [0.55 + 0.35 * noise1(t * 1.7 + 3) * en, 0.22], re: 0.9 + 0.5 * noise1(t * 2.1) * en, head: [0.05 * Math.sin(t * 1.3), 0.04 * Math.sin(t * 2.3)]}; }
function lookAround(t, t0, rate = 1.1) { const u = (t - t0) * rate; return {head: [0.95 * Math.sin(u * 2), 0.06 * Math.sin(u * 3.1)], twist: 0.18 * Math.sin(u * 2 - 0.4)}; }
function lookBehind(k) { k = ease(k); return {head: [2.0 * k, 0.05 * k], twist: 0.55 * k, lean: 0.03 * k}; }     // k 0..1; turn the head (and shoulders) over the shoulder
function tremble(t, amt = 1) { const n = (f, o) => noise1(t * f + o) - 0.5;                                      // add with poseAdd(): small fear/cold shake, deterministic
  return {head: [0.05 * amt * n(14, 1), 0.04 * amt * n(13, 5)], roll: 0.04 * amt * n(11, 9), lean: 0.02 * amt * n(12, 3), la: [0.06 * amt * n(15, 7), 0.03 * amt * n(10, 2)], ra: [0.06 * amt * n(16, 4), 0.03 * amt * n(9, 6)]}; }
function sitNervous(t, amt = 1) { return poseAdd(POSE.sitting, {rk: 0.12 * amt * Math.max(0, Math.sin(t * 11)), re: 0.1 * amt * Math.sin(t * 2.2), head: [0.2 * Math.sin(t * 0.8) * amt, 0.04]}); }
// ---- blending / sequencing ----
const POSE_EASE = {smooth: ease, linear: clamp, back: k => { k = clamp(k); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }};
function poseBase(x) { const p = typeof x === 'string' ? POSE[x] : x; return Object.assign({}, POSE_NEUTRAL, p); }
function poseMix(a, b, k) { const A = poseBase(a), B = poseBase(b), o = {...A, ...B};
  for (const key of Object.keys(o)) { const x = A[key] ?? POSE_NEUTRAL[key], y = B[key] ?? POSE_NEUTRAL[key];
    if (Array.isArray(x) && Array.isArray(y)) o[key] = x.map((v, i) => lerp(v, y[i], k)); else if (typeof x === 'number' && typeof y === 'number') o[key] = lerp(x, y, k); else o[key] = k < 0.5 ? x : y; }
  if (o.point !== undefined) o.point = o.point > 0.5 ? 1 : 0; return o; }
// track entries: [startTime, nameOrPatch, blendInSeconds = 0.35, easeName = 'smooth']; the pose is held after the blend until the next entry starts
function poseTrack(track, t) { let i = 0; while (i < track.length - 1 && t >= track[i + 1][0]) i++;
  const [t0, cur, bin = 0.35, en = 'smooth'] = track[i]; if (i === 0 || t >= t0 + bin) return poseBase(cur);
  return poseMix(track[i - 1][1], cur, POSE_EASE[en]((t - t0) / bin)); }
