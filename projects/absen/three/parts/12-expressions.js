// ---------- EXPRESSION LIBRARY (additive; uses the stickman rig's pose() face/posture keys) ----------
// Usage in a shot:   actor.pose({...walkPose(...), ...expr('suspicious', 0.8), ra: [...]}, t)
//   expr(name, k=1, genre)      -> pose patch; k scales the expression from neutral (0) to full (1, may exceed 1 for exaggeration)
//   exprMix(a, b, k)            -> blend two names/patches (e.g. calm -> panicked)
//   acting(track, t, genre)     -> emotional progression: track = [[t0,'deadpan',1],[t1,'suspicious',.6],[t2,'panicked',1]] (smoothstep between keys, holds at ends)
// Keys: brow/browL/browR (angle: + inner-up/worried, - inner-down/angry), byL/byR (brow raise), lid/lidL/lidR (upper-lid closure 0..1),
//       eyes (size), look [x,y], cross (cross-eyed), eyeAsym, pupilS, glint, mouth ('flat'|'o'|'frown'(legacy)|'sad'|'smile'|'open') with mw (width) mc (curve)
//       my/mx (offset) mtilt (crooked) mo (open height), head [yaw,pitch], roll (tilt), lean, shrug, blink.
const EXPR_NEUTRAL = {browL: 0, browR: 0, byL: 0, byR: 0, lid: 0, eyes: 1, look: [0, 0], cross: 0, eyeAsym: 0, pupilS: 1, mouth: 'flat', mw: 1, mc: 1, my: 0, mx: 0, mtilt: 0, mo: 0.6,
  head: [0, 0], roll: 0, lean: 0, shrug: 0, blink: true};
const EXPR = {
  // --- flat / dry
  deadpan:      {lid: 0.45, mouth: 'flat', head: [0, 0.02]},
  expressionless: {eyes: 1.08, mouth: 'flat', blink: false},
  sarcastic:    {lid: 0.3, byR: 0.7, browR: 0.3, browL: -0.2, mouth: 'smile', mw: 0.85, mc: 0.9, mtilt: 0.22, mx: 0.015, roll: 0.1, look: [0.6, 0.8]},
  smug:         {lid: 0.5, browL: -0.15, browR: 0.1, byR: 0.3, mouth: 'smile', mw: 1, mc: 0.9, mtilt: 0.15, mx: 0.01, head: [0, 0.14], roll: -0.08, lean: -0.03},
  // --- awkward / social discomfort
  awkward:      {browL: 0.55, browR: 0.55, mouth: 'smile', mw: 0.9, mc: 0.9, mtilt: -0.08, look: [-1, 0.25], shrug: 0.6, roll: 0.1},
  embarrassed:  {lid: 0.3, browL: 0.7, browR: 0.7, mouth: 'smile', mw: 0.8, mc: 0.8, mtilt: 0.12, look: [-1, -0.8], shrug: 0.8, head: [-0.1, -0.2], lean: 0.08, roll: 0.08},
  nervous:      {eyes: 1.15, browL: 0.6, browR: 0.6, byL: 0.2, byR: 0.2, mouth: 'flat', mw: 0.55, my: -0.004, look: [-1, 0.2], shrug: 0.5, blink: true},
  uncomfortable:{lid: 0.2, browL: 0.4, browR: 0.25, mouth: 'flat', mw: 0.8, mtilt: 0.2, look: [-1, 0], shrug: 0.7, roll: 0.1, head: [0, -0.05]},
  // --- confusion / doubt
  confused:     {browL: -0.35, browR: 0.3, byR: 0.7, byL: -0.1, mouth: 'flat', mw: 0.7, mtilt: 0.18, roll: 0.16, head: [0.12, 0.02], look: [0.3, 0.5]},
  suspicious:   {lid: 0.35, browL: -0.5, browR: -0.2, byR: 0.15, mouth: 'flat', mw: 0.8, mtilt: 0.12, look: [1, 0], head: [-0.3, 0]},    // side-eye: head turned one way, eyes the other
  disbelief:    {eyes: 1.4, browL: 0.25, browR: 0.25, byL: 1, byR: 1, mouth: 'open', mw: 1.3, mo: 0.9, lean: -0.1, head: [0, 0.12], blink: false},
  // --- negative
  annoyed:      {lid: 0.5, browL: -0.6, browR: -0.6, mouth: 'flat', mw: 0.9, mtilt: -0.05, head: [0, -0.04], roll: 0.04},
  angry:        {lid: 0.25, eyes: 1.05, browL: -1, browR: -1, mouth: 'sad', mw: 1.3, mc: 1.1, my: -0.004, head: [0, -0.1], lean: 0.1},
  disgusted:    {lid: 0.35, browL: -0.35, browR: 0.1, byR: 0.4, mouth: 'sad', mw: 1.1, mtilt: 0.22, my: -0.002, head: [0, 0.1], roll: 0.12, lean: -0.05},
  sad:          {lid: 0.35, browL: 0.9, browR: 0.9, mouth: 'sad', mw: 1, mc: 0.9, look: [0, -1], head: [0, -0.15], lean: 0.06},
  // --- high energy
  excited:      {eyes: 1.3, browL: 0.3, browR: 0.3, byL: 0.6, byR: 0.6, mouth: 'smile', mw: 1.7, mc: 1.3, head: [0, 0.1], lean: -0.03, blink: false},
  panicked:     {eyes: 1.45, pupilS: 0.6, browL: 0.9, browR: 0.9, byL: 0.4, byR: 0.4, mouth: 'open', mw: 1.35, mo: 1.6, shrug: 1, head: [0, 0.1], lean: -0.05, blink: false},
  shocked:      {eyes: 1.35, browL: 0.5, browR: 0.5, byL: 0.8, byR: 0.8, mouth: 'o', mw: 1.1, lean: -0.06, head: [0, 0.05], blink: false},
  silly:        {eyes: 1.2, cross: 1, byL: 0.5, byR: 0.5, mouth: 'smile', mw: 1.5, mc: 1.2, roll: 0.25},
  ridiculous:   {eyes: 1.45, cross: 0.9, eyeAsym: 0.3, byL: 0.9, byR: -0.2, browL: 0.4, mouth: 'open', mw: 1.5, mo: 0.9, roll: 0.3, shrug: 1, lean: -0.05},
  // --- horror / uncanny
  evilGrin:     {lid: 0.4, browL: -0.7, browR: -0.7, mouth: 'smile', mw: 1.8, mc: 1.2, my: -0.002, pupilS: 0.5, glint: true, head: [0, -0.15], lean: 0.04},
  unnaturalSmile: {eyes: 1.6, pupilS: 0.3, glint: true, mouth: 'smile', mw: 2.6, mc: 1.0, blink: false},
  creepy:       {eyes: 1.3, pupilS: 0.4, glint: true, mouth: 'smile', mw: 1.7, mc: 0.7, roll: 0.3, head: [0, -0.1], blink: false},
  uncanny:      {eyes: 1.25, eyeAsym: 0.35, byL: 0.4, byR: -0.1, browL: 0.15, browR: 0.15, mouth: 'smile', mw: 1.5, mc: 0.9, mtilt: 0.1, roll: -0.12, blink: false},
};
// genre -> amplitude of deviation from neutral (character identity untouched; only intensity changes)
const GENRE_AMP = {comedy: 1.3, drama: 0.6, horror: 0.9, mystery: 0.75};
function exprBase(x) { return typeof x === 'string' ? Object.assign({}, EXPR_NEUTRAL, EXPR[x]) : Object.assign({}, EXPR_NEUTRAL, x); }
function exprLerp(A, B, k) { const o = {};
  for (const key of Object.keys(EXPR_NEUTRAL)) { const a = A[key], b = B[key];
    if (Array.isArray(a)) o[key] = a.map((v, i) => lerp(v, b[i], k));
    else if (typeof a === 'number') o[key] = lerp(a, b, k);
    else o[key] = k < 0.5 ? a : b; }                 // categorical keys (mouth, blink) switch halfway
  for (const key of ['glint']) { const v = k < 0.5 ? A[key] : B[key]; if (v !== undefined) o[key] = v; }
  return o; }
function exprMix(a, b, k) { return exprLerp(exprBase(a), exprBase(b), clamp(k)); }
function expr(name, k = 1, genre = null) { const amp = genre ? GENRE_AMP[genre] ?? 1 : 1;
  const o = exprLerp(EXPR_NEUTRAL, exprBase(name), k * amp);
  const full = exprBase(name); o.mouth = k * amp >= 0.35 ? full.mouth : 'flat'; o.blink = full.blink; if (full.glint !== undefined && k * amp > 0.5) o.glint = full.glint;
  return o; }
function acting(track, t, genre = null) { // track: [[time, nameOrPatch, intensity], ...] sorted by time
  if (t <= track[0][0]) return expr(track[0][1], track[0][2] ?? 1, genre);
  for (let i = 0; i < track.length - 1; i++) { const [t0, a, ka = 1] = track[i], [t1, b, kb = 1] = track[i + 1];
    if (t < t1) { const k = ease((t - t0) / (t1 - t0)); const A = exprLerp(EXPR_NEUTRAL, exprBase(a), ka * (GENRE_AMP[genre] ?? 1)), B = exprLerp(EXPR_NEUTRAL, exprBase(b), kb * (GENRE_AMP[genre] ?? 1));
      const o = exprLerp(A, B, k); const fa = exprBase(a), fb = exprBase(b); o.mouth = k < 0.5 ? fa.mouth : fb.mouth; o.blink = k < 0.5 ? fa.blink : fb.blink; return o; } }
  const L = track[track.length - 1]; return expr(L[1], L[2] ?? 1, genre); }
