// jonatanbb.xyz, sketch 3: the orrery.
// Up there. The signet is a sun and the nodes are the bodies that orbit it. Each link is the field line of a
// dipole that leaves the sun, passes through its body and comes back, so the light bends as a field would have
// it. The sky is a Fibonacci sphere of code: glyphs sit on its lattice and the streams run along its spirals
// instead of falling one way. Below is a horizon, and the light in its air writes equations.
(() => {
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const NIGHT = 0x0b0a09, GOLD = 0xfad02a, SIGNET = 0xe8a317;
const scene = new THREE.Scene(); scene.background = new THREE.Color(NIGHT);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new THREE.RenderPass(scene, camera));
composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 1.0));
composer.addPass(new THREE.OutputPass());
const portrait = innerWidth < innerHeight, rad = Math.PI / 180;

// ---------- the sun: the signet, sharp and many-faced, in gold
const K = 1.3 / (BB.ring.r + BB.ring.w / 2);
const gilt = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.34, flatShading: true, side: THREE.DoubleSide, envMapIntensity: 1.3 });
const sun = new THREE.Group(); scene.add(sun);
const band = (r0, r1, d) => {
  const parts = [new THREE.CylinderGeometry(r1, r1, d, 160, 1, true), new THREE.CylinderGeometry(r0, r0, d, 160, 1, true)];
  for (const s of [1, -1]) { const f = new THREE.RingGeometry(r0, r1, 160, 1); f.rotateX(-s * Math.PI / 2); f.translate(0, s * d / 2, 0); parts.push(f); }
  return THREE.BufferGeometryUtils.mergeGeometries(parts);
};
const ring = new THREE.Mesh(band((BB.ring.r - BB.ring.w / 2) * K, 1.3, 11 * K), gilt); ring.rotation.x = Math.PI / 2;
const bb = new THREE.Mesh(BB.solid(THREE, 'bb', 12, 3.6), gilt); bb.scale.setScalar(K);
const halo = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,226,150,.5)'); g.addColorStop(0.25, 'rgba(250,208,42,.2)'); g.addColorStop(0.55, 'rgba(232,163,23,.06)'); g.addColorStop(1, 'rgba(232,163,23,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
})();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
glow.scale.setScalar(6.5); glow.position.z = -0.4;
const core = new THREE.Mesh(new THREE.SphereGeometry(5.4 * K, 20, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.1, 1.1) }));
sun.add(ring, bb, glow, core);
for (const [x, y, z, i] of [[-1.6, 1.4, 2.6, 7], [1.9, -0.8, 2.2, 3]]) { const l = new THREE.PointLight(0xfff0c8, i, 9, 2); l.position.set(x, y, z); sun.add(l); }
scene.add(new THREE.PointLight(0xffe2a0, 90, 0, 1.5));                       // what the bodies are lit by

// ---------- the bodies, their orbits, and the field lines that link each to the sun
const ORBIT = [3.3, 4.7, 6.1, 7.6, 9.2, 10.9], START = [205, 318, 28, 118, 255, 165];
const host = document.getElementById('nodes'), X = new THREE.Vector3(1, 0, 0);
const line = (pts, color, width, opacity, dashed) => {
  const g = new THREE.LineGeometry(); g.setPositions(pts.flatMap((p) => [p.x, p.y, p.z]));
  const l = new THREE.Line2(g, new THREE.LineMaterial({ color, linewidth: width, transparent: true, opacity, dashed: !!dashed, dashSize: 0.16, gapSize: 2.6, depthWrite: false }));
  l.computeLineDistances(); return l;
};
const nodes = NODES.map((n, i) => {
  const L = ORBIT[i], pivot = new THREE.Group(); scene.add(pivot);
  const circle = Array.from({ length: 181 }, (_, k) => new THREE.Vector3(Math.cos(k * 2 * rad) * L, 0, Math.sin(k * 2 * rad) * L));
  scene.add(line(circle, 0x8a8170, 1, 0.38));
  for (let k = 0; k < 72; k++) {                                              // graduations, as on an instrument
    const a = k * 5 * rad, r1 = L + (k % 6 ? 0.07 : 0.16);
    scene.add(line([new THREE.Vector3(Math.cos(a) * L, 0, Math.sin(a) * L), new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1)], 0x8a8170, 1, 0.3));
  }
  // r = L sin²θ: the dipole line that crosses the equatorial plane exactly at this body
  const t0 = Math.asin(Math.sqrt(1.0 / L)), field = [];
  for (let k = 0; k <= 120; k++) { const th = t0 + (Math.PI - 2 * t0) * k / 120, s = Math.sin(th); field.push(new THREE.Vector3(L * s * s * s, L * s * s * Math.cos(th), 0)); }
  const tint = n.warm ? 0xb0475c : SIGNET;
  const wire = line(field, tint, 1.3, 0.5), pulse = line(field, n.warm ? 0xff8ea3 : 0xfff0b0, 2.6, 1, true);
  pivot.add(wire, pulse);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + 0.05 * ((i * 7) % 4), 2),
    n.warm ? new THREE.MeshStandardMaterial({ color: 0x3a1018, emissive: 0xa82842, emissiveIntensity: 0.75, roughness: 0.6, flatShading: true })
           : new THREE.MeshStandardMaterial({ color: 0x9a948a, metalness: 0.75, roughness: 0.42, flatShading: true }));
  body.position.x = L; pivot.add(body);
  const el = document.createElement('a');
  el.className = 'node' + (n.warm ? ' warm' : ''); el.href = n.href;
  el.innerHTML = `<u class="lens"><span class="mini"></span></u><i></i><span class="tag"><b>${n.name}</b><small>${n.data}</small><em>${n.line}</em></span>`;
  MINI[n.id](el.querySelector('.mini'));
  el.addEventListener('mouseenter', () => { hovered = performance.now(); open(i); });
  host.appendChild(el);
  return { ...n, L, pivot, wire, pulse, body, el, a: START[i] * rad, w: 0.11 * Math.pow(ORBIT[0] / L, 1.5) };
});
let active = -1, hovered = -1e9;
const open = (i) => { active = i; nodes.forEach((n, k) => n.el.classList.toggle('active', k === i)); };

// ---------- the sky: a Fibonacci sphere of code. Streams follow its spiral arms from pole to pole
const N = 4200, GA = Math.PI * (3 - Math.sqrt(5)), pos = new Float32Array(N * 3), idx = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y);
  pos.set([Math.cos(i * GA) * r * 80, y * 80, Math.sin(i * GA) * r * 80], i * 3); idx[i] = i;
}
const atlas = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.font = '25px "DejaVu Sans Mono", ui-monospace, Menlo, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  const set = '0123456789∑∏∫∂∇λζΓπ∞∈≤0123456789';
  for (let k = 0; k < 64; k++) x.fillText(set[k % set.length], (k % 16) * 32 + 16, ((k / 16) | 0) * 32 + 17);
  return new THREE.CanvasTexture(c);
})();
const skyGeo = new THREE.BufferGeometry();
skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); skyGeo.setAttribute('idx', new THREE.Float32BufferAttribute(idx, 1));
const sky = new THREE.Points(skyGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { t: { value: 0 }, px: { value: 14 }, atlas: { value: atlas }, n: { value: N } },
  vertexShader: `attribute float idx; uniform float t, px, n; varying float vB; varying vec2 vCell;
    float hash(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
    void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      float head = pow(fract(idx / n * 3.0 + hash(mod(idx, 55.0)) * 7.0 - t * 0.03), 12.0);
      vB = 0.2 + 1.5 * head;
      float g = floor(mod(hash(idx) * 64.0 + floor(t * (0.2 + hash(idx + 3.0)) + hash(idx + 7.0) * 10.0), 64.0));
      vCell = vec2(mod(g, 16.0), floor(g / 16.0));
      gl_PointSize = px * (1.0 + 0.5 * head); }`,
  fragmentShader: `uniform sampler2D atlas; varying float vB; varying vec2 vCell;
    void main() { float a = texture2D(atlas, vec2((vCell.x + gl_PointCoord.x) / 16.0, 1.0 - (vCell.y + gl_PointCoord.y) / 4.0)).a;
      gl_FragColor = vec4(mix(vec3(0.55, 0.52, 0.46), vec3(1.0, 0.8, 0.22), smoothstep(0.3, 1.0, vB)) * a * vB, 1.0); }` }));
sky.rotation.set(-1.02, 0, 0.5); scene.add(sky);

// ---------- the horizon's handwriting: formulas written along the limb, in its light
const dawn = document.getElementById('dawn'), SHELF = Object.keys(EQ);
const slots = (portrait ? [0.5] : [0.4, 0.63, 0.86]).map((u, k) => ({ u, turn: k, at: 4 + k * 4.5 }));
const write = (s) => {
  const name = SHELF[s.turn % SHELF.length]; s.turn += slots.length;
  loadEq(name, [255, 226, 130]).then((c) => {
    if (s.el) s.el.remove();
    const W = innerWidth, H = innerHeight, rho = 2.2 * W, k = Math.min(W * (portrait ? 0.6 : 0.19) / c.width, H * 0.062 / c.height), w = c.width * k, h = c.height * k;
    const d = (s.u - 0.5) * W, y = 0.89 * H + rho - Math.sqrt(rho * rho - d * d);
    c.style.cssText = `width:${w}px;height:${h}px;transform:translate(${s.u * W - w / 2}px, ${y - h - H * 0.022}px) rotate(${Math.asin(d / rho)}rad)`;
    dawn.appendChild(c); s.el = c;
  });
};

// ---------- frame
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
const EYE = new THREE.Vector3(0, 7.2, 22), LOOK = new THREE.Vector3(0, 0.9, 0);
let W = 0, H = 0;
const resize = () => {
  W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); composer.setSize(W, H);
  camera.aspect = W / H; EYE.z = portrait ? 46 : Math.max(22, 30 / camera.aspect); EYE.y = EYE.z * 0.33;
  if (W > H && W >= 900) camera.setViewOffset(W, H, -0.13 * W, 0.03 * H, W, H); else camera.setViewOffset(W, H, 0, -0.06 * H, W, H);
  camera.updateProjectionMatrix();
  sky.material.uniforms.px.value = 13 * renderer.getPixelRatio();
};
addEventListener('resize', resize); resize();

const readout = document.getElementById('readout'), v = new THREE.Vector3(), clock = new THREE.Clock();
let t = 0, tour = 0, shown = 0;
const frame = () => {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  mouse.sx += (mouse.x - mouse.sx) * 0.04; mouse.sy += (mouse.y - mouse.sy) * 0.04;
  camera.position.set(EYE.x + mouse.sx * 2.4, EYE.y - mouse.sy * 1.2, EYE.z); camera.lookAt(LOOK);
  sun.quaternion.copy(camera.quaternion);                                     // the signet keeps facing whoever looks
  sky.material.uniforms.t.value = t; sky.rotation.y = t * 0.004;

  nodes.forEach((n, i) => {
    n.a += n.w * dt; n.pivot.rotation.y = -n.a; n.body.rotation.y += dt * 0.4;
    const on = i === active;
    n.wire.material.opacity += ((on ? 1 : 0.42) - n.wire.material.opacity) * 0.08; n.wire.material.linewidth = on ? 2.2 : 1.3;
    n.pulse.material.dashOffset -= dt * (1.1 + 0.2 * i);
  });
  if (t > 3 && performance.now() - hovered > 7000 && t - tour > 4.6) { tour = t; open((active + 1) % nodes.length); }
  slots.forEach((s) => { if (t > s.at) { s.at = t + 17.5; write(s); } });
  composer.render();

  nodes.forEach((n) => {
    n.body.getWorldPosition(v).project(camera);
    const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    n.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    n.el.className = `node on ${(portrait ? x < W * 0.5 : x > W * 0.63) ? 'r' : 'l'}${n.warm ? ' warm' : ''}${n === nodes[active] ? ' active' : ''}`;
  });
  if (t - shown > 0.2) { shown = t; readout.innerHTML = `t = <b>${t.toFixed(1)}</b> s · <b>6</b> bodies · n = <b>${N}</b> · φ = <b>137.508°</b> · r = L sin²θ`; }
  requestAnimationFrame(frame);
};
frame();
})();
