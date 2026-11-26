// ---------- LOOK (template defaults learned from the ABSEN / RONDA MALAM audit) ----------
// Everything that decides exposure, glow and readability lives here, so a film can tune it in one place.
// The rig file (10-rig.js) stays a verbatim copy of rig v4.1; this part only adjusts shared materials after it.
const LOOK = {
  exposure: 0.82,          // renderer.toneMappingExposure (set in 00-base.js)
  toonTop: 235,            // top band of the toon ramp (v4 = 255): white faces/gloves stop sitting exactly at 1.0 before light
  bloom: {strength: 0.18, radius: 0.4, threshold: 0.97}, // ABSEN used 0.38 / 0.55 / 0.86 -> glowing heads and gloves
  msaa: 8,                 // samples on the composer target; without it renderer antialias is ignored and thin lines shimmer
  screen: 0.85,            // brightness of unlit screens/panels (1.0 = blooms); use glowMat() for light you WANT to bloom
  rim: {color: 0x8fa6c8, intensity: 0.0}, // back/edge light that follows the camera; raise (0.4-0.9) in dark sets so black bodies keep a silhouette
  key: {color: 0xfff4e6, intensity: 0.0}, // soft face light that rides with the camera (up-left of the lens); use ~1-1.5 in close-ups
  ca: 0.6, vignette: 1,    // lookPass chromatic aberration and vignette amounts
  minCamDist: 0.45,        // cam() warns when the lens is closer than this to a visible actor's head (m)
};
renderer.toneMappingExposure = LOOK.exposure;
// soften the toon ramp's top band (shared texture: affects every toon material of the rig)
toonRamp.image.data[8] = toonRamp.image.data[9] = toonRamp.image.data[10] = LOOK.toonTop; toonRamp.needsUpdate = true;

// Unlit display surfaces (phones, monitors, LED clocks, lamp panels). Capped below the bloom threshold by default.
function screenMat(map, level = LOOK.screen, extra = {}) { return new THREE.MeshBasicMaterial({map, color: new THREE.Color(level, level, level), ...extra}); }
function panelMat(color, level = LOOK.screen) { return new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(level)}); }
// Deliberate glow (a bulb, a lit lens): above 1.0 so the bloom pass picks it up. Keep these small on screen.
function glowMat(color, k = 1.6) { return new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k)}); }

// Rim light: a directional light placed behind the subject, opposite the camera. Updated by cam() every frame.
const rimLight = new THREE.DirectionalLight(LOOK.rim.color, 0); scene.add(rimLight, rimLight.target);
function placeRim(camPos, look, intensity = LOOK.rim.intensity) {
  rimLight.intensity = intensity; if (intensity <= 0) return;
  const back = look.clone().sub(camPos).setY(0).normalize();
  rimLight.position.copy(look).addScaledVector(back, 4).add(V(0, 2.5, 0)); rimLight.target.position.copy(look);
}

// Camera key light: close-ups under a single warm/top light put white faces in the toon ramp's middle band (they read brown).
// A weak neutral point light just above-left of the lens lifts the face into the top band without changing the set lighting.
const keyLight = new THREE.PointLight(LOOK.key.color, 0, 4, 2); scene.add(keyLight);
function placeKey(camObj, intensity = LOOK.key.intensity) {
  keyLight.intensity = intensity; if (intensity <= 0) return;
  keyLight.position.copy(camObj.position).add(V(-0.35, 0.3, 0.1).applyQuaternion(camObj.quaternion));
}
