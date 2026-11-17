// The sphere-bearer: one kneeling figure, cut from convex facets, shared by both sites.
// Clean facets make it cast metal; jitter makes it rough stone. Units: the figure kneels ~1.3 tall,
// faces +z, and carries a sphere of radius R whose lowest point rests on its nape.
function makeBearer(THREE, o) {
  const { material, R = 1.2, sides = 6, jitter = 0, mirror = false, hair = false, seed = 7, eyes = null } = o;
  const sx = mirror ? -1 : 1;
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647, s / 2147483647 - 0.5);
  const J = (x, y, z) => new THREE.Vector3(sx * x, y, z);
  const g = new THREE.Group();
  const hull = (pts) => {
    const p = pts.map(v => v.clone().add(new THREE.Vector3(rnd(), rnd(), rnd()).multiplyScalar(2 * jitter)));
    const m = new THREE.Mesh(new THREE.ConvexGeometry(p), material);
    m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  const ring = (c, axis, r, n, phase = 0, squash = 1, ref = null) => {
    const u = (ref || new THREE.Vector3(0, 1, 0)).clone().cross(axis);
    if (u.lengthSq() < 1e-4) u.set(1, 0, 0); u.normalize();
    const w = axis.clone().cross(u).normalize();
    return Array.from({ length: n }, (_, i) => {
      const a = phase + i / n * 2 * Math.PI;
      return c.clone().addScaledVector(u, r * Math.cos(a)).addScaledVector(w, r * squash * Math.sin(a));
    });
  };
  const limb = (a, b, ra, rb, bulge = 1.12, at = 0.35) => {
    const ax = b.clone().sub(a).normalize(), m = a.clone().lerp(b, at);
    return hull([...ring(a, ax, ra, sides), ...ring(m, ax, Math.max(ra, rb) * bulge, sides, Math.PI / sides), ...ring(b, ax, rb, sides)]);
  };
  const PHI = (1 + Math.sqrt(5)) / 2;
  const ICO = [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]]
    .map(v => new THREE.Vector3(...v).normalize());
  const ball = (c, r, sq = [1, 1, 1], rx = 0) => hull(ICO.map(v => {
    const p = new THREE.Vector3(v.x * sq[0], v.y * sq[1], v.z * sq[2]).multiplyScalar(r);
    return p.applyAxisAngle(new THREE.Vector3(1, 0, 0), rx).add(c);
  }));
  const ik = (a, c, l1, l2, pole) => {
    const d = c.clone().sub(a), L = Math.min(d.length(), (l1 + l2) * 0.998); d.normalize();
    const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const p = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
    return a.clone().addScaledVector(d, x).addScaledVector(p, h);
  };

  // joints of the pose: one knee down, the other foot planted, back bent under the load, head bowed
  const HL = J(0.115, 0.55, 0), HR = J(-0.115, 0.52, -0.02);
  const KL = J(0.215, 0.5, 0.43), AL = J(0.2, 0.075, 0.37), TL = J(0.225, 0.02, 0.6);
  const KR = J(-0.17, 0.065, 0.13), AR = J(-0.19, 0.075, -0.31), TR = J(-0.19, 0.02, -0.42);
  const neck = J(0, 1.13, 0.16), head = J(0.015, 1.085, 0.315);
  const SL = J(0.215, 1.1, 0.1), SR = J(-0.215, 1.1, 0.1);
  const nape = J(0, 1.215, 0.03), C = nape.clone().add(new THREE.Vector3(0, R, 0));

  // trunk
  hull([J(0.175, 0.62, -0.1), J(-0.175, 0.6, -0.11), J(0.17, 0.62, 0.09), J(-0.17, 0.6, 0.08), J(0.16, 0.45, -0.1), J(-0.16, 0.43, -0.11),
        J(0.14, 0.46, 0.08), J(-0.14, 0.44, 0.07), J(0, 0.42, -0.02), J(0, 0.63, 0.11), J(0, 0.63, -0.13)]);
  hull([J(0.16, 0.6, -0.09), J(-0.16, 0.59, -0.1), J(0.155, 0.6, 0.09), J(-0.155, 0.59, 0.08), J(0, 0.6, 0.12),
        J(0.14, 0.8, -0.07), J(-0.14, 0.8, -0.07), J(0.135, 0.8, 0.13), J(-0.135, 0.8, 0.13), J(0, 0.8, 0.16), J(0, 0.78, -0.1)]);
  hull([J(0.15, 0.78, -0.07), J(-0.15, 0.78, -0.07), J(0.14, 0.78, 0.13), J(-0.14, 0.78, 0.13), J(0, 0.8, 0.17),
        J(0.225, 0.98, -0.06), J(-0.225, 0.98, -0.06), J(0.215, 0.99, 0.2), J(-0.215, 0.99, 0.2), J(0, 0.97, 0.25), J(0, 0.98, -0.1),
        J(0.21, 1.14, 0.0), J(-0.21, 1.14, 0.0), J(0.2, 1.12, 0.17), J(-0.2, 1.12, 0.17), J(0, 1.2, 0.02), J(0, 1.16, 0.17), J(0.08, 1.2, 0.0), J(-0.08, 1.2, 0.0)]);
  limb(J(0, 1.12, 0.12), neck.clone().lerp(head, 0.6), 0.062, 0.055, 1.0);
  ball(head, 0.112, [0.84, 1.12, 0.98], 0.95);
  if (hair) hull([J(0.1, 1.17, 0.2), J(-0.1, 1.17, 0.2), J(0.118, 1.08, 0.2), J(-0.118, 1.08, 0.2), J(0.125, 1.0, 0.13), J(-0.125, 1.0, 0.13),
                  J(0.1, 1.2, 0.08), J(-0.1, 1.2, 0.08), J(0.11, 1.02, 0.03), J(-0.11, 1.02, 0.03), J(0, 1.215, 0.1), J(0, 1.05, 0.0)]);
  if (eyes) for (const ex of [0.04, -0.04]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), eyes);
    e.position.copy(J(ex + 0.015, 1.045, 0.4)); g.add(e);
  }

  // legs
  limb(HL, KL, 0.1, 0.066, 1.1); limb(KL, AL, 0.064, 0.04, 1.14, 0.3); ball(KL, 0.07);
  hull([...ring(AL, new THREE.Vector3(0, 1, 0), 0.05, 5), J(0.17, 0.0, 0.33), J(0.25, 0.0, 0.33), J(0.185, 0.0, 0.6), J(0.265, 0.0, 0.6), J(0.225, 0.045, 0.58)]);
  limb(HR, KR, 0.1, 0.07, 1.1); limb(KR, AR, 0.066, 0.04, 1.14, 0.3); ball(KR, 0.072);
  hull([...ring(AR, new THREE.Vector3(0, 0, 1), 0.045, 5), J(-0.23, 0.0, -0.4), J(-0.15, 0.0, -0.4), J(-0.19, 0.0, -0.455), J(-0.19, 0.07, -0.43)]);

  // arms: the hands are found on the sphere, at the angle from its lowest point that the reach allows
  const l1 = 0.3, l2 = 0.27;
  for (const side of [1, -1]) {
    const S = side > 0 ? SL : SR, on = (a) => C.clone().add(new THREE.Vector3(sx * side * Math.sin(a) * 0.985, -Math.cos(a), Math.sin(a) * 0.17).multiplyScalar(R));
    let lo = 0.02, hi = 1.5;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; on(mid).distanceTo(S) < 0.5 ? lo = mid : hi = mid; }
    const H = on(lo), n = H.clone().sub(C).normalize();
    const up = on(lo + 0.11 / R).sub(H).normalize(), across = n.clone().cross(up).normalize();
    const W = H.clone().addScaledVector(n, 0.04).addScaledVector(up, -0.07);
    const E = ik(S, W, l1, l2, new THREE.Vector3(sx * side * 0.8, -0.55, -0.25));
    ball(S, 0.092); limb(S, E, 0.066, 0.052, 1.12); limb(E, W, 0.054, 0.036, 1.14, 0.3); ball(E, 0.056);
    const pad = (a, b, t) => H.clone().addScaledVector(up, a).addScaledVector(across, b).addScaledVector(n, t);
    hull([pad(-0.07, 0.04, 0.012), pad(-0.07, -0.04, 0.012), pad(0.1, 0.045, 0.012), pad(0.1, -0.045, 0.012), pad(0.12, 0, 0.014),
          pad(-0.08, 0.035, 0.06), pad(-0.08, -0.035, 0.06), pad(0.07, 0.035, 0.04), pad(0.07, -0.035, 0.04)]);
  }
  g.userData = { sphereCentre: C, nape, head };
  return g;
}
