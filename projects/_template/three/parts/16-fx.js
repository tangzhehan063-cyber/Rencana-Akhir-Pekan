// ---------- FX: torch, atmospheric dust, body-aware walking ----------

// --- TORCH (flashlight held in a glove) ---
// Faces clipped in ABSEN because the torch kept full power at 0.3-0.8 m. set(k, subjectDist) scales the power so a
// subject at that distance receives the same light as one at `refDist`, which keeps close-ups exposed like wide shots.
const coneMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: {uInt: {value: 0.12}, uColor: {value: new THREE.Color(0xfff1d0)}},
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform float uInt; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float along = clamp((vY+1.5)/3.0,0.0,1.0); float edge = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(uColor*uInt*pow(along,2.2)*edge, 1.0); }'});
function makeTorch({power = 5, decay = 1.5, refDist = 1.5, angle = 0.45, beam = 0.12} = {}) {
  const g = new THREE.Group();
  const body = inked(new THREE.CylinderGeometry(0.022, 0.018, 0.17, 12), new THREE.MeshToonMaterial({color: 0x2d2d2d, gradientMap: toonRamp}), 0.006, g); body.position.y = -0.06;
  const lensM = new THREE.MeshBasicMaterial({color: 0xfff6dc}); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), lensM); lens.rotation.x = Math.PI / 2; lens.position.y = -0.146; g.add(lens);
  const spot = new THREE.SpotLight(0xfff0d0, 0, 14, angle, 0.6, decay); spot.position.y = -0.15; spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.normalBias = 0.03; g.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.y = -3; g.add(tgt); spot.target = tgt;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(angle) * 3, 3.0, 28, 1, true), coneMat); cone.position.y = -0.15 - 1.5; g.add(cone);
  return {g, spot, cone, lens, on: 0,
    set(k = 1, subjectDist = null) { this.on = k; const comp = subjectDist == null ? 1 : Math.min(1, Math.pow(Math.max(subjectDist, 0.05) / refDist, decay));
      spot.intensity = power * k * comp; coneMat.uniforms.uInt.value = beam * k; cone.visible = k > 0.01;
      lensM.color.setScalar(LOOK.screen * (0.25 + 0.75 * k)); }};
}

// --- DUST v2 (atmospheric, not glitter) ---
// ABSEN dust read as snow: 700 identical additive points, unlit, ~90 px wide at 0.5 m, popping at the wrap.
// Here: varied (mostly tiny) sizes with a pixel cap, normal blending at low opacity, fade near the lens and far away,
// soft fade at the wrap, and brightness that comes from the torch beam (plus a small ambient floor).
const DUST = {count: 900, box: V(5, 3, 6), worldSize: 0.012, maxPx: 6, opacity: 0.5, ambient: 0.12, near: 1.0, far: 7};
const dustGeo = new THREE.BufferGeometry();
{ const n = DUST.count, pos = new Float32Array(n * 3), seed = new Float32Array(n), size = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = hash(i * 1.3) * DUST.box.x; pos[i * 3 + 1] = hash(i * 2.7) * DUST.box.y; pos[i * 3 + 2] = hash(i * 4.1) * DUST.box.z;
    seed[i] = hash(i * 9.7); size[i] = 0.4 + 1.2 * Math.pow(hash(i * 5.3), 2.5); } // skewed: most motes small, a few larger
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); dustGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); }
const dustMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false,
  uniforms: {uTime: {value: 0}, uCenter: {value: V(0, 0, 0)}, uBox: {value: DUST.box}, uPx: {value: 1}, uMaxPx: {value: DUST.maxPx}, uOpacity: {value: DUST.opacity},
    uColor: {value: new THREE.Color(0xd8d0c0)}, uAmb: {value: DUST.ambient}, uNear: {value: DUST.near}, uFar: {value: DUST.far},
    uBeamPos: {value: V(0, 0, 0)}, uBeamDir: {value: V(0, -1, 0)}, uBeamCos: {value: 0.9}, uBeamOn: {value: 0}},
  vertexShader: `attribute float aSeed; attribute float aSize;
    uniform float uTime, uPx, uMaxPx, uAmb, uNear, uFar, uBeamCos, uBeamOn; uniform vec3 uCenter, uBox, uBeamPos, uBeamDir; varying float vA;
    void main(){ vec3 p = position;
      p.x += sin(uTime*0.21 + aSeed*6.283)*0.12; p.z += cos(uTime*0.17 + aSeed*10.7)*0.12;
      float fy = fract((p.y + uTime*0.025*(0.3 + aSeed)) / uBox.y); p.y = fy * uBox.y;
      float wrap = smoothstep(0.0, 0.08, fy) * (1.0 - smoothstep(0.92, 1.0, fy));
      vec3 w = uCenter + p - vec3(uBox.x*0.5, 0.0, uBox.z*0.5);
      vec4 mv = viewMatrix * vec4(w, 1.0); float d = -mv.z;
      float px = min(uPx * aSize / max(d, 0.05), uMaxPx); gl_PointSize = max(px, 1.5);
      vec3 L = w - uBeamPos; float lb = max(length(L), 0.01);
      float beam = uBeamOn * smoothstep(uBeamCos, mix(uBeamCos, 1.0, 0.4), dot(L / lb, uBeamDir)) / (1.0 + lb*lb*0.2);
      vA = (uAmb + beam) * smoothstep(uNear*0.5, uNear, d) * (1.0 - smoothstep(uFar*0.6, uFar, d)) * wrap * clamp(px / 1.5, 0.0, 1.0);
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
    void main(){ vec2 c = gl_PointCoord - 0.5; float a = 1.0 - dot(c, c) * 4.0; if (a <= 0.0) discard; gl_FragColor = vec4(uColor, a * a * vA * uOpacity); }`});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
let _dustBeam = null;
// call from a shot: placeDust(center, t, amount, torchOrNull). The beam is read after matrices update (see syncFx in 50-main).
function placeDust(center, t, amt = 1, beamTorch = null) { dust.visible = amt > 0; dustMat.uniforms.uCenter.value.copy(center); dustMat.uniforms.uTime.value = t;
  dustMat.uniforms.uOpacity.value = DUST.opacity * amt; _dustBeam = beamTorch; }
function syncFx() {
  dustMat.uniforms.uPx.value = DUST.worldSize * H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const b = _dustBeam; dustMat.uniforms.uBeamOn.value = b && b.on > 0 ? 3 * b.on : 0;
  if (b && b.on > 0) { const p = b.spot.getWorldPosition(V(0, 0, 0)), q = b.spot.target.getWorldPosition(V(0, 0, 0));
    dustMat.uniforms.uBeamPos.value.copy(p); dustMat.uniforms.uBeamDir.value.copy(q.sub(p).normalize()); dustMat.uniforms.uBeamCos.value = Math.cos(b.spot.angle); }
}

// --- body-aware walk (stride from the actor's leg length, eased start/stop, smoothed facing) ---
// Pose cycle is still walkPose from the rig; only the phase/stride and timing adapt to the body.
function walkToBody(actor, t, t0, t1, p0, p1, amt = 1, ramp = 0.12) {
  const k = clamp((t - t0) / (t1 - t0)); const d = p0.distanceTo(p1);
  // ease in/out on distance so the actor accelerates and settles instead of starting at full speed
  const e = k < ramp ? (k * k) / (2 * ramp * (1 - ramp)) : k > 1 - ramp ? 1 - ((1 - k) * (1 - k)) / (2 * ramp * (1 - ramp)) : (k - ramp / 2) / (1 - ramp);
  const p = p0.clone().lerp(p1, e); actor.root.position.copy(p); actor.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  const strength = amt * ease(k / ramp) * ease((1 - k) / ramp);
  return k > 0 && k < 1 ? walkPose(e * d / actor.metrics.strideHint * Math.PI, strength) : {};
}
