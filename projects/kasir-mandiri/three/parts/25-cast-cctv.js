// ---------- CAST ----------
// Bayu: night clerk — red store vest over dark body, name tag, no tie.
function addVest(actor, color = 0xb3262a) {
  const vm = new THREE.MeshToonMaterial({color, gradientMap: toonRamp});
  const geo = new THREE.CylinderGeometry(0.074, 0.068, 0.32, 20);
  const v = new THREE.Mesh(geo, vm); v.position.y = 0.26; v.scale.set(1.08, 1, 0.84); actor.chest.add(v);
  const ol = new THREE.Mesh(geo.clone(), inkMat); ol.position.copy(v.position); ol.scale.set(1.1, 1.02, 0.9); actor.chest.add(ol);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.006), new THREE.MeshToonMaterial({color: 0xf2efe6, gradientMap: toonRamp})); tag.position.set(0.05, 0.34, 0.066); actor.chest.add(tag);
  return v;
}
const bayu = makeStick({tie: false, card: false}); scene.add(bayu.root); addVest(bayu); bayu.setBlinkSeed(1.3);
// queue ghosts (seen only through CCTV): three shoppers + one in Bayu's vest
const ghosts = [0, 1, 2, 3].map(i => { const a = makeStick({tie: i === 1, card: i === 1}); if (i === 3) addVest(a); a.setBlinkSeed(i * 0.7); scene.add(a.root); a.root.visible = false; return a; });
ghosts[0].chest.children[0].material = new THREE.MeshToonMaterial({color: 0x3b4a5c, gradientMap: toonRamp});

// ---------- CCTV FEED (render target shown on the counter monitor and as full-frame CCTV shots) ----------
const cctvCam = new THREE.PerspectiveCamera(62, 4 / 3, 0.05, 40); cctvCam.position.set(3.55, CEIL - 0.12, 3.55); cctvCam.lookAt(2.2, 0.6, 0.6);
const cctvRT = new THREE.WebGLRenderTarget(320, 240, {colorSpace: THREE.SRGBColorSpace});
monScreen.material = new THREE.ShaderMaterial({uniforms: {map: {value: cctvRT.texture}, uTime: {value: 0}, uOn: {value: 1}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D map; uniform float uTime, uOn; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(.3,.59,.11)); l = (l-.5)*1.3+.55; l *= .85+.15*sin(vUv.y*480.0);
      l += (h(vUv*vec2(320.,240.)+floor(uTime*12.))-.5)*.05; gl_FragColor = vec4(vec3(l*.9,l*1.05,l*.92)*uOn, 1.0); }`});
// what the CCTV sees can differ from reality: ghosts are visible only to cctvCam (layer 1)
for (const gh of ghosts) gh.root.traverse(o => o.layers.set(1));
cctvCam.layers.enable(0); cctvCam.layers.enable(1);
let cctvLive = false;
function renderCCTV() { if (!cctvLive) return; const fog = scene.fog; renderer.setRenderTarget(cctvRT); renderer.render(scene, cctvCam); renderer.setRenderTarget(null); scene.fog = fog; }
