// jonatanbb.xyz, sketch 1: the armillary sphere.
// The signet's ring comes apart into the rings of an armillary sphere, with the sun and the b's left at its
// centre. Beams of light leave it for the nodes. A metal Newton holds it up, kneeling on a fountain whose
// water is digits, and far behind him the light writes on the horizon.
(() => {
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 600);

const GOLD = 0xfad02a, SIGNET = 0xe8a317, CARMESI = 0x7f3445;
const MONO = '"DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace';
const portrait = innerWidth < innerHeight;
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// satin black metal: it only turns gold where the sun at the centre reaches it
const metal = new THREE.MeshStandardMaterial({ color: 0x48423a, metalness: 1, roughness: 0.4, flatShading: true, envMapIntensity: 1.45, side: THREE.DoubleSide });
const hoop = new THREE.MeshStandardMaterial({ color: 0x2e2a25, metalness: 1, roughness: 0.3, envMapIntensity: 1.45, side: THREE.DoubleSide });
const marble = new THREE.MeshStandardMaterial({ color: 0xf3f0e9, roughness: 0.62, side: THREE.DoubleSide });
const gilt = new THREE.MeshStandardMaterial({ color: SIGNET, metalness: 1, roughness: 0.3, flatShading: true });

const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(-2.5, 11, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.bias = -0.0004;
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 7, bottom: -2, near: 1, far: 30 });
scene.add(key);

const gradient = (w, h, paint) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
};
const halo = (stops) => gradient(256, 256, (x) => {
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => g.addColorStop(o, c));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
});

// ---------- the fountain: a pool, a bowl that overflows into it, and the plinth Newton kneels on
const TOP = 1.0;
const lathe = (profile) => {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128), marble);
  m.castShadow = m.receiveShadow = true; scene.add(m);
};
lathe([[0, 0], [2.02, 0], [2.06, 0.04], [2.06, 0.27], [2.02, 0.31], [1.92, 0.31], [1.88, 0.27], [1.88, 0.1], [0, 0.1]]);
lathe([[0.56, 0.1], [0.5, 0.17], [0.36, 0.3], [0.33, 0.5], [0.42, 0.6], [1.0, 0.73], [1.1, 0.78], [1.1, 0.83], [1.05, 0.84],
       [0.92, 0.8], [0.8, 0.8], [0.75, 0.85], [0.73, TOP], [0, TOP]]);
const water = new THREE.MeshStandardMaterial({ color: 0xe3e9ea, roughness: 0.1, transparent: true, opacity: 0.8 });
const flat = (geo, y) => { const m = new THREE.Mesh(geo, water); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m); };
flat(new THREE.CircleGeometry(1.88, 96), 0.22);
flat(new THREE.RingGeometry(0.76, 1.06, 96), 0.825);

// the water is the digital rain: digits fall as water does, each column led by one in gold
const rain = (cols, rows, cell, speed, ink) => {
  const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * cell;
  const x = c.getContext('2d'); x.font = `${cell * 0.84}px ${MONO}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const col = Array.from({ length: cols }, () => ({ h: Math.random() * rows * 2 - rows, v: speed * (0.6 + Math.random()), len: 3 + Math.random() * (rows - 3),
    g: Array.from({ length: rows }, () => (Math.random() * 10) | 0) }));
  const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 8;
  const step = (dt) => {
    x.clearRect(0, 0, c.width, c.height);
    col.forEach((k, i) => {
      k.h += k.v * dt;
      if (k.h - k.len > rows) { k.h = -Math.random() * rows * 0.6; k.v = speed * (0.6 + Math.random()); }
      for (let r = 0; r < rows; r++) {
        const d = k.h - r; if (d < 0 || d > k.len) continue;
        if (Math.random() < 0.05) k.g[r] = (Math.random() * 10) | 0;
        x.fillStyle = d < 1 ? '#e8a317' : `rgba(28,26,22,${(ink * (1 - d / k.len)).toFixed(2)})`;
        x.fillText(k.g[r], (i + 0.5) * cell, (r + 0.5) * cell);
      }
    });
    tex.needsUpdate = true;
  };
  return { tex, step };
};
const fall = rain(84, 6, 24, 6, 0.9), spread = rain(84, 4, 24, 2.2, 0.5);
const wet = (geo, map, y) => {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  m.position.y = y; scene.add(m); return m;
};
wet(new THREE.CylinderGeometry(1.105, 1.14, 0.6, 150, 1, true), fall.tex, 0.52);
const ripple = new THREE.RingGeometry(1.14, 1.86, 150, 1);
for (let j = 0; j <= 1; j++) for (let i = 0; i <= 150; i++) ripple.attributes.uv.setXY(j * 151 + i, i / 150, 1 - j);
wet(ripple, spread.tex, 0.226).rotation.x = -Math.PI / 2;

// the ground: no base, only a floor that catches his shadow and ends in a horizon
const ground = new THREE.Mesh(new THREE.CircleGeometry(520, 96), new THREE.MeshBasicMaterial({ color: 0xe6e3da, transparent: true, opacity: 0.4, depthWrite: false }));
ground.rotation.x = -Math.PI / 2; ground.renderOrder = -3; scene.add(ground);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.ShadowMaterial({ opacity: 0.2 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.receiveShadow = true; scene.add(shadow);
const contact = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), new THREE.MeshBasicMaterial({ map: halo([[0.5, 'rgba(60,54,44,.3)'], [1, 'rgba(60,54,44,0)']]), transparent: true, depthWrite: false }));
contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004; scene.add(contact);

// ---------- Newton: the pose of Sargent's Atlas, in faceted metal
const R = 1.2;
const newton = makeBearer(THREE, { material: metal, R, hair: true });
newton.position.y = TOP; newton.rotation.y = 0.5; scene.add(newton); newton.updateMatrixWorld();
const C = newton.localToWorld(newton.userData.sphereCentre.clone());
const apple = new THREE.Mesh(new THREE.IcosahedronGeometry(0.062, 1), gilt);
apple.scale.y = 0.9; apple.position.set(0.5, TOP + 0.056, 0.38); apple.castShadow = true; scene.add(apple);

// ---------- the armillary sphere: the annulus of the signet, cut into five bands and dislodged
const K = R / (BB.ring.r + BB.ring.w / 2);
const arm = new THREE.Group(); arm.position.copy(C); scene.add(arm);
const band = (r0, r1, d, mat) => {
  const parts = [new THREE.CylinderGeometry(r1, r1, d, 200, 1, true), new THREE.CylinderGeometry(r0, r0, d, 200, 1, true)];
  for (const s of [1, -1]) { const f = new THREE.RingGeometry(r0, r1, 200, 1); f.rotateX(-s * Math.PI / 2); f.translate(0, s * d / 2, 0); parts.push(f); }
  return new THREE.Mesh(THREE.BufferGeometryUtils.mergeGeometries(parts), mat);
};
const pole = new THREE.Vector3(-0.5, 0.85, 0.16).normalize();
const AXES = [Y.clone(), new THREE.Vector3(0.87, 0, 0.5), pole.clone(), pole.clone().applyAxisAngle(Z, 0.41), new THREE.Vector3(-0.42, 0.12, 0.9).normalize()];
const SPIN = [0, 0, 0.05, -0.08, 0.11];
const qFlat = new THREE.Quaternion().setFromUnitVectors(Y, Z), cut = BB.ring.w / AXES.length;
const bands = AXES.map((axis, i) => {
  const r1 = (BB.ring.r + BB.ring.w / 2 - i * cut - 0.3) * K;
  const m = band(r1 - (cut - 0.6) * K, r1, 9 * K, hoop); arm.add(m);
  return { m, q: new THREE.Quaternion().setFromUnitVectors(Y, axis) };
});
const bb = new THREE.Mesh(BB.solid(THREE, 'bb', 12, 3.6), metal); bb.scale.setScalar(K); bb.castShadow = true; arm.add(bb);

// the sun sits in the slot between the two b's, and shines through it
const core = new THREE.Mesh(new THREE.SphereGeometry(5.4 * K, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4c8, toneMapped: false }));
const glowTex = halo([[0, 'rgba(255,226,110,.95)'], [0.16, 'rgba(250,208,42,.55)'], [0.45, 'rgba(250,208,42,.16)'], [1, 'rgba(250,208,42,0)']]);
const sprite = (map, size, z, color = 0xffffff) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); s.position.z = z; return s;
};
const glow = sprite(glowTex, 2.2, -0.1), flare = sprite(glowTex, 0.42, 0.09);
const lamp = new THREE.PointLight(0xffc53a, 0, 0, 2);
// and a second light, in front, turns gold whichever facets of the b's face it
const front = new THREE.PointLight(0xffc53a, 0, 5, 2); front.position.set(-0.8, 0.7, 1.25);
arm.add(core, glow, flare, lamp, front);

// ---------- the nodes, and the beams that are the links to them
const HEX = portrait ? 2.0 : 2.45, ANGLE = [120, 60, 0, -60, -120, 180], DEPTH = [0.35, -0.3, 0.2, 0.45, -0.25, -0.4];
const streak = gradient(4, 64, (x) => {
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 4, 64);
});
const host = document.getElementById('nodes');
const nodes = NODES.map((n, i) => {
  const a = ANGLE[i] * Math.PI / 180, tint = n.warm ? CARMESI : SIGNET;
  const p = new THREE.Vector3(Math.cos(a) * HEX, Math.sin(a) * HEX, DEPTH[i]).add(C);
  const dir = p.clone().sub(C), len = dir.length() - 0.2; dir.normalize();

  const beam = new THREE.Group(); beam.position.copy(C); beam.quaternion.setFromUnitVectors(X, dir); scene.add(beam);
  const shaft = new THREE.PlaneGeometry(1, 1); shaft.translate(0.5, 0, 0);
  for (let v = 0; v < 4; v++) shaft.attributes.position.setY(v, shaft.attributes.position.getY(v) * (shaft.attributes.position.getX(v) ? 0.17 : 0.04));
  const light = new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ map: streak, color: n.warm ? 0xc4566c : GOLD, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  const geo = new THREE.LineGeometry(); geo.setPositions([0, 0, 0, 1, 0, 0]);
  if (n.warm) geo.setColors([0.91, 0.64, 0.09, 0.5, 0.2, 0.27]);
  const line = new THREE.Line2(geo, new THREE.LineMaterial({ color: n.warm ? 0xffffff : SIGNET, vertexColors: !!n.warm, linewidth: 1.5, transparent: true, opacity: 0.95 }));
  const pulse = new THREE.Line2(geo, new THREE.LineMaterial({ color: n.warm ? 0xb0475c : GOLD, linewidth: 2.4, dashed: true, dashSize: 0.022, gapSize: 0.42, transparent: true, opacity: 0.9 }));
  line.computeLineDistances(); pulse.computeLineDistances(); beam.add(light, line, pulse);

  const medal = band(0.17, 0.2, 0.05, n.warm ? new THREE.MeshStandardMaterial({ color: CARMESI, metalness: 0.6, roughness: 0.4 }) : hoop);
  medal.rotation.x = Math.PI / 2; medal.position.copy(p); scene.add(medal);
  const pool = sprite(glowTex, 0.62, 0, n.warm ? 0xff7a8f : 0xffffff); pool.position.copy(p); pool.material.opacity = 0; scene.add(pool);

  const el = document.createElement('a');
  el.className = `node ${Math.cos(a) > 0 ? 'r' : 'l'}${n.warm ? ' warm' : ''}`; el.href = n.href;
  el.innerHTML = `<u class="lens"><span class="mini"></span></u><i></i><span class="tag"><b>${n.name}</b><small>${n.data}</small><em>${n.line}</em></span>`;
  MINI[n.id](el.querySelector('.mini'));
  el.addEventListener('mouseenter', () => { hovered = performance.now(); open(i); });
  host.appendChild(el);
  return { ...n, p, len, beam, light, pulse, pool, el, grow: 0 };
});

let active = -1, hovered = -1e9;
function open(i) {
  active = i; nodes.forEach((m, j) => m.el.classList.toggle('active', j === i));
}

// ---------- the horizon: atmospheric light, and the equations it writes
const EYE = new THREE.Vector3(0, 1.0, 15.5), LOOK = new THREE.Vector3(0, 2.95, 0);
const dawn = new THREE.Mesh(new THREE.PlaneGeometry(300, 13), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, map: gradient(512, 128, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(250,208,42,0)'); g.addColorStop(0.7, 'rgba(250,208,42,.1)'); g.addColorStop(0.96, 'rgba(252,216,80,.45)'); g.addColorStop(1, 'rgba(255,246,214,1)');
  x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in';
  const f = x.createLinearGradient(0, 0, w, 0); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(0.5, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = f; x.fillRect(0, 0, w, h);
}) }));
dawn.position.set(0, EYE.y + 6.5, -85); dawn.renderOrder = -2; scene.add(dawn);

const WRITE = `uniform sampler2D map; uniform float pen, fade; varying vec2 vUv;
  void main() { vec4 c = texture2D(map, vUv);
    float tip = smoothstep(0.07, 0.0, abs(vUv.x - pen)) * step(pen, 0.999);
    gl_FragColor = vec4(mix(c.rgb, vec3(1.0, 0.8, 0.2), tip), c.a * smoothstep(pen, pen - 0.02, vUv.x) * fade); }`;
const slots = (portrait ? [] : [-18]).map((deg, i) => {
  const az = deg * Math.PI / 180;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fragmentShader: WRITE,
    uniforms: { map: { value: null }, pen: { value: 0 }, fade: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }' }));
  m.rotation.y = -az; m.visible = false; scene.add(m);
  return { m, az, clock: -5.6 - i * 2.4, turn: i };
});
const SHELF = Object.keys(EQ), inks = {};
const write = (s) => {
  const name = SHELF[s.turn % SHELF.length]; s.turn += slots.length;
  (inks[name] || (inks[name] = loadEq(name, [214, 148, 14]).then((c) => new THREE.CanvasTexture(c)))).then((tex) => {
    const w = Math.min(9.5, 2.6 * EQ[name].w / EQ[name].h), h = w * EQ[name].h / EQ[name].w;
    s.m.material.uniforms.map.value = tex; s.m.scale.set(w, h, 1); s.m.visible = true;
    s.m.position.set(EYE.x + 62 * Math.sin(s.az), EYE.y + h / 2 + 0.2, EYE.z - 62 * Math.cos(s.az));
  });
};

// ---------- frame
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
let W = 0, H = 0;
const resize = () => {
  W = innerWidth; H = innerHeight; renderer.setSize(W, H, false);
  camera.aspect = W / H;
  EYE.z = Math.max(15.5, (HEX + 1.1) / (Math.tan(14 * Math.PI / 180) * camera.aspect));
  if (W > H && W >= 900) camera.setViewOffset(W, H, -0.14 * W, 0, W, H); else camera.setViewOffset(W, H, 0, -0.1 * H, W, H);
  camera.updateProjectionMatrix();
};
addEventListener('resize', resize); resize();

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const q = new THREE.Quaternion(), v = new THREE.Vector3(), clock = new THREE.Clock();
let t = 0, tick = 0, tour = 0;
const frame = () => {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;

  // the ring comes apart, then keeps turning as the instrument it has become
  bands.forEach((b, i) => {
    q.setFromAxisAngle(pole, SPIN[i] * Math.max(0, t - 2)).multiply(b.q);
    b.m.quaternion.slerpQuaternions(qFlat, q, ease((t - 1 - i * 0.28) / 2.8));
  });
  const lit = ease((t - 0.3) / 2.5);
  lamp.intensity = 13 * lit * (1 + 0.04 * Math.sin(t * 2.3)); front.intensity = 7 * lit;
  glow.material.opacity = 0.35 + 0.65 * lit; flare.material.opacity = lit;

  nodes.forEach((n, i) => {
    n.grow = ease((t - 3.7 - i * 0.28) / 1.0);
    const on = i === active ? 1 : 0;
    n.beam.scale.x = Math.max(1e-4, n.len * n.grow); n.beam.visible = n.grow > 0;
    n.light.material.opacity += ((on ? 0.95 : 0.42) - n.light.material.opacity) * 0.1;
    n.pulse.material.dashOffset -= dt * 0.16;
    n.pool.material.opacity = (n.grow > 0.98 ? 1 : 0) * (0.55 + 0.45 * on);
    n.el.classList.toggle('on', n.grow > 0.9);
  });
  if (t > 8.5 && performance.now() - hovered > 7000 && t - tour > 4.4) { tour = t; open((active + 1) % nodes.length); }

  if (tick++ % 3 === 0) { fall.step(dt * 3); spread.step(dt * 3); }
  slots.forEach((s) => {
    s.clock += dt; const u = s.m.material.uniforms;
    if (s.clock > 0 && !s.busy) { s.busy = true; write(s); }
    u.pen.value = Math.min(1, s.clock / 3.2); u.fade.value = Math.min(1, s.clock / 0.4, (17 - s.clock) / 2);
    if (s.clock > 17) { s.clock = -1.2; s.busy = false; s.m.visible = false; }
  });

  mouse.sx += (mouse.x - mouse.sx) * 0.04; mouse.sy += (mouse.y - mouse.sy) * 0.04;
  camera.position.set(EYE.x + mouse.sx * 1.5, EYE.y - mouse.sy * 0.5, EYE.z); camera.lookAt(LOOK);
  renderer.render(scene, camera);

  // names, and the preview each node opens into, follow their nodes on screen
  nodes.forEach((n) => {
    v.copy(n.p).project(camera);
    n.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
  });
  requestAnimationFrame(frame);
};
frame();
})();
