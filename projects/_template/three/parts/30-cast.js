// ---------- CAST ----------
// Identity (kit flags, colours) and body (bodySpec) are chosen independently. Bodies are combinable presets + overrides:
//   bodySpec('tall', 'slim', {headR: 0.12})   later entries win; put {height: ...} last if a fixed height matters.
// Every actor exposes .metrics (hipY, eyeY, reach, strideHint, sitHipY(seatTop) ...) for staging and framing.
const tokohA = makeStick({tie: false, card: false, cap: true, badge: true, belt: true}); scene.add(tokohA.root); tokohA.setBlinkSeed(1.3);
const tokohB = makeStick({tie: true, card: true, body: bodySpec('tall', 'slim', 'smallHead')}); scene.add(tokohB.root); tokohB.setBlinkSeed(2.1);
const cast = [tokohA, tokohB];
const torchA = makeTorch(); torchA.g.position.set(0, -0.05, 0.03); tokohA.R.glove.add(torchA.g);
