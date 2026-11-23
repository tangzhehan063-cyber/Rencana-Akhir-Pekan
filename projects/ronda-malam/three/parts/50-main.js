// ---------- post-processing: bloom + chromatic aberration/vignette + CCTV mode ----------
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, {samples: 8, type: THREE.HalfFloatType})); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.18, 0.4, 0.97); composer.addPass(bloom);
const lookPass = new ShaderPass({uniforms: {tDiffuse: {value: null}, uCA: {value: 1}, uVig: {value: 1}, uCCTV: {value: 0}, uTime: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig, uCCTV, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 off = c * r2 * 0.012 * uCA;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (uCCTV > 0.5) { float l = dot(col, vec3(0.3,0.59,0.11)); col = vec3(l*0.92, l*1.02, l*0.95); col = (col-0.5)*1.25+0.5;
        col *= 0.88 + 0.12*sin(vUv.y*1280.0*1.6); col += (h(vUv*vec2(720.0,1280.0) + floor(uTime*12.0)) - 0.5)*0.04; }
      col *= mix(1.0, (1.0 - smoothstep(0.25, 0.95, length(c*vec2(1.0,0.75)))), 0.55*uVig);
      gl_FragColor = vec4(col, 1.0); }`});
composer.addPass(lookPass); composer.addPass(new OutputPass());

// ---------- overlay ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), setupEl = $('setup'), payEl = $('payoff'), ruleEl = $('rule'), fadeEl = $('fade'), cctvEl = $('cctv'), endEl = $('end');
endEl.style.zIndex = 5; endEl.style.position = 'absolute';
setupEl.textContent = 'PERATURAN RONDA RT 04';
payEl.innerHTML = 'JANGAN HITUNG<span class="l2" style="font-size:96px;color:#f3ead8">ULANG.</span>';
let captions = [];
function overlay(t) {
  const showT = t < 3.9; $('title').style.display = showT ? 'block' : 'none';
  if (showT) { const out = 1 - seg(t, 3.6, 3.88); setupEl.style.opacity = seg(t, 0.1, 0.35) * out;
    const pk = t - 1.6; payEl.style.opacity = (pk >= 0 ? 1 : 0) * out; payEl.style.transform = `scale(${pk >= 0 ? lerp(1.035, 1, clamp(pk / 0.2)) : 1.035})`;
    ruleEl.style.width = `${clamp((t - 1.7) / 0.28) * 240}px`; ruleEl.style.opacity = out; }
  const c = captions.find(c => t >= c.start - 0.05 && t < c.hold);
  capEl.textContent = c ? c.text : ''; capEl.className = c ? c.voice : ''; capEl.style.opacity = c ? 1 : 0;
}
{ const g = $('grain').getContext('2d'); const im = g.createImageData(360, 640); let s = 7; for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s & 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }

window.setup = async () => {
  await Promise.all(['900 40px Nunito', '40px Anton', '800 40px Nunito', '700 40px Nunito', '600 40px Nunito', '700 40px Caveat'].map(f => document.fonts.load(f)));
  captions = await (await fetch('captions.json')).json();
  // redraw canvas textures now that fonts are loaded
  scene.traverse(o => { const m = o.material; for (const mat of Array.isArray(m) ? m : m ? [m] : []) for (const k of ['map', 'emissiveMap']) { const t = mat[k]; if (t && t.userData && t.userData.draw && !t.userData.dynamic) { t.userData.draw(t.userData.g, t.userData.c.width, t.userData.c.height); t.needsUpdate = true; } } });
  sheetTex.userData.k = null;
  scene.updateMatrixWorld(true);
  return shots.map(s => [s.name, s.t0, s.t1]);
};
window.renderAt = (t) => {
  resetAll();
  const s = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  s.f(t);
  scene.updateMatrixWorld(true);
    lookPass.uniforms.uCCTV.value = fx.cctv; lookPass.uniforms.uTime.value = t; lookPass.uniforms.uCA.value = fx.ca; lookPass.uniforms.uVig.value = fx.vig;
  composer.render();
  overlay(t);
  return s.name;
};
window.sceneReady = true;
