// The signet: the two b's and the capacitor between them, in a ring cut into three bands, one for each of the
// lattice's three axes. The capacitor is the signet's only light: a pulse that reaches it charges it up and
// knocks its axis' band about one of the band's two ways to turn —across the axis for one of its links, about
// the axis itself for the other— and then it drains steadily back to black. The bands lose speed at the rate
// pulses come in, so they keep turning gently however busy the lattice gets, and once the pulses stop they
// settle back into the ring.
const Signet = (() => {
  const SPAN = 1.6;          // the canvas' half side, in ring radii: room for the bands to tilt and the capacitor to glow
  const CRUISE = 0.22;       // the mean speed each band keeps up on each of its two ways, in rad/s
  const DRAG = 0.38;         // how fast a band loses speed, per second
  const WINDOW = 40;         // the seconds over which the rate of pulses is averaged
  const KICK = 0.5;          // the most a single pulse can add to a band's speed, in rad/s
  const SETTLE = 0.3;        // how fast a band at rest finds its way back into the ring, per second
  const CHARGE = 0.2;        // how much of the capacitor's headroom a pulse fills
  const DRAIN = 10;          // the seconds a full capacitor takes to drain
  const CORE = 0.06;         // the capacitor's circumradius, in ring radii

  const canvas = document.getElementById('signet');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
  camera.position.z = SPAN / Math.tan(11 * Math.PI / 180);

  // satin black metal: it only turns gold where the capacitor's light reaches it
  const metal = new THREE.MeshStandardMaterial({ color: 0x48423a, metalness: 1, roughness: 0.4, flatShading: true, envMapIntensity: 1.45, side: THREE.DoubleSide });
  const hoop = new THREE.MeshStandardMaterial({ color: 0x2e2a25, metalness: 1, roughness: 0.3, envMapIntensity: 1.45, side: THREE.DoubleSide });
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(-2.5, 4, 5); scene.add(key);

  // the bands: the annulus between r0 and r1, d deep, about y
  const K = 1 / (BB.ring.r + BB.ring.w / 2);
  const band = (r0, r1, d) => {
    const parts = [new THREE.CylinderGeometry(r1, r1, d, 200, 1, true), new THREE.CylinderGeometry(r0, r0, d, 200, 1, true)];
    for (const s of [1, -1]) { const f = new THREE.RingGeometry(r0, r1, 200, 1); f.rotateX(-s * Math.PI / 2); f.translate(0, s * d / 2, 0); parts.push(f); }
    return new THREE.Mesh(THREE.BufferGeometryUtils.mergeGeometries(parts), hoop);
  };
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), cut = BB.ring.w / 3;
  const rings = [0, 1, 2].map((i) => {
    const r1 = (BB.ring.r + BB.ring.w / 2 - i * cut - 0.3) * K;
    const mesh = band(r1 - (cut - 0.6) * K, r1, 9 * K);
    mesh.quaternion.setFromUnitVectors(Y, Z); scene.add(mesh);
    // the axis of the lattice's direction i, which the screen draws i × 60° clockwise from east
    const a = -i * Math.PI / 3, along = new THREE.Vector3(Math.cos(a), Math.sin(a), 0), across = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
    return { mesh, rest: mesh.quaternion.clone(), ways: [across, along], spin: [0, 0], rate: [0.25, 0.25], hits: [0, 0] };
  });
  const bb = new THREE.Mesh(BB.solid(THREE, 'bb', 12, 3.6), metal);
  bb.scale.setScalar(K); scene.add(bb);

  // the capacitor sits in the slot between the two b's: a hexagon, its vertices on the links
  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,226,110,.95)'); g.addColorStop(0.16, 'rgba(250,208,42,.55)'); g.addColorStop(0.45, 'rgba(250,208,42,.16)'); g.addColorStop(1, 'rgba(250,208,42,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const sprite = (size, z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(size); s.position.z = z; return s;
  };
  // as it charges it glows from black through amber to the gold of a pulse's head
  const dot = new THREE.MeshBasicMaterial({ toneMapped: false });
  const GLOW = [0x0c0b09, 0x7a3c04, 0xe8a317, 0xfad02a, 0xffec96].map((c) => new THREE.Color(c));
  const core = new THREE.Mesh(new THREE.CircleGeometry(CORE, 6), dot);
  core.position.z = 0.1;                                  // in front of the glow, so the capacitor shows
  const lamp = new THREE.PointLight(0xffc53a, 0, 0, 2);
  // and a second light, in front, turns gold whichever facets of the b's face it
  const front = new THREE.PointLight(0xffc53a, 0, 4.2, 2); front.position.set(-0.67, 0.58, 1.04);
  const glowWide = sprite(1.8, -0.1), glowNear = sprite(0.36, 0.08);
  scene.add(core, glowWide, glowNear, lamp, front);
  let charge = 0;

  // centre the signet on (x, y), its ring radius px wide
  const place = (x, y, radius) => {
    const side = Math.round(2 * SPAN * radius);
    canvas.style.cssText = `left:${(x - side / 2).toFixed(1)}px;top:${(y - side / 2).toFixed(1)}px;width:${side}px;height:${side}px`;
    renderer.setSize(side, side, false);
  };

  // the pulse of a link in direction ring (+ 3 for the opposite link: way 1) has reached the capacitor
  const bump = (ring, way) => {
    const r = rings[ring];
    r.hits[way]++;
    r.spin[way] += Math.min(KICK, CRUISE * DRAG / Math.max(r.rate[way], 0.04));
    charge += CHARGE * (1 - charge);
  };

  const q = new THREE.Quaternion();
  const frame = (dt) => {
    for (const r of rings) {
      for (const w of [0, 1]) {
        r.rate[w] += (r.hits[w] - r.rate[w] * dt) / WINDOW; r.hits[w] = 0;
        q.setFromAxisAngle(r.ways[w], r.spin[w] * dt); r.mesh.quaternion.premultiply(q);
        r.spin[w] *= Math.exp(-DRAG * dt);
      }
      // a band hardly turning drifts back to where it sits in the ring
      const calm = Math.exp(-(Math.abs(r.spin[0]) + Math.abs(r.spin[1])) / 0.04);
      r.mesh.quaternion.slerp(r.rest, 1 - Math.exp(-SETTLE * calm * dt));
    }
    charge = Math.max(0, charge - dt / DRAIN);
    const step = charge * (GLOW.length - 1), k = Math.min(GLOW.length - 2, Math.floor(step));
    dot.color.copy(GLOW[k]).lerp(GLOW[k + 1], step - k);
    glowNear.material.opacity = glowWide.material.opacity = charge;
    lamp.intensity = 16 * charge; front.intensity = 7.5 * charge;
    renderer.render(scene, camera);
  };
  return { place, bump, frame, CORE, light: () => charge, glow: () => `#${dot.color.getHexString()}` };
})();
