// the b-logos as geometry: one b, cut once, composed by isometries into every form.
// Units are the signet's own (x right, y down, stroke 10.5); see cvsite/assets/illumination/bb.txt
const BB = (() => {
  // the b's silhouette: the 12 corners of its stroked centreline, in winding order
  const outline = [
    [26.25, 85.25], [26.25, 70.6746], [42.0754, 86.5], [5.25, 123.3254],
    [5.25, 8.4363], [9.2189, 5.7798], [-5.25, -15.8371], [-5.25, 148.6746],
    [56.9246, 86.5], [15.75, 45.3254], [15.75, 105.6746], [31.2123, 90.2123]];
  // the centreline it was stroked from, inner tip first
  const spine = [[27.5, 86.5], [21, 93], [21, 58], [49.5, 86.5], [0, 136], [0, 1.445], [4.856, 8.7]];
  const ring = { cx: 107.637, cy: 168.3, r: 143.696, w: 21 };

  // each form places two b's: [a, b, c, d, e, f] sends (x, y) to (a x + c y + e, b x + d y + f)
  const right = [1, 0, 0, 1, 119, 57.75];
  const forms = {
    bb: [[1, 0, 0, 1, 44.6, 81.8], right],
    db: [[-1, 0, 0, 1, 96.274, 57.75], right],
    qb: [[-1, 0, 0, -1, 2 * ring.cx - 119, 2 * ring.cy - 57.75], right],
  };
  const place = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

  // the front of a b cut as a V: one flat facet per edge of the outline, meeting along the spine.
  // Corners sit on the surface (z 0), spine nodes at the bottom of the cut (z 1)
  const [P0, P1, P2, P3, P4, P5, P6] = spine.map(p => [...p, 1]);
  const C = outline.map(p => [...p, 0]);                  // C[i] is corner i + 1
  const Q1 = [21, 85.25, 1], Q5 = [0, 8.4363, 1];         // where the two caps leave the stem
  const facets = [
    [C[6], C[7], P4, P5], [C[7], C[8], P3, P4], [C[8], C[9], P2, P3], [C[9], C[10], P1, P2],
    [C[10], C[11], P0, P1], [C[11], C[0], P0], [C[0], P1, P0], [C[0], Q1, P1],
    [C[0], C[1], P2, Q1], [C[1], C[2], P3, P2], [C[2], C[3], P4, P3], [C[3], C[4], Q5, P4],
    [C[4], P5, Q5], [C[4], P6, P5], [C[4], C[5], P6], [C[5], C[6], P5, P6]];

  const pathOf = (pts) => 'M' + pts.map(p => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join('L') + 'Z';
  // an SVG path for a whole form, ring included, in signet units
  const svgPath = (form, withRing = true) => {
    let d = forms[form].map(m => pathOf(outline.map(p => place(m, p)))).join('');
    if (withRing) {
      const ro = ring.r + ring.w / 2, ri = ring.r - ring.w / 2, { cx, cy } = ring;
      d += `M${cx - ro} ${cy}a${ro} ${ro} 0 1 0 ${2 * ro} 0a${ro} ${ro} 0 1 0 ${-2 * ro} 0Z` +
           `M${cx - ri} ${cy}a${ri} ${ri} 0 1 1 ${2 * ri} 0a${ri} ${ri} 0 1 1 ${-2 * ri} 0Z`;
    }
    return d;
  };
  const viewBox = `${ring.cx - ring.r - ring.w / 2 - 4} ${ring.cy - ring.r - ring.w / 2 - 4} ${2 * ring.r + ring.w + 8} ${2 * ring.r + ring.w + 8}`;

  // the same b in three dimensions, in signet units about the ring's centre, y up.
  // solid: sharp and many-faced, each face cut as a V down to the spine
  const solid = (THREE, form, depth = 10.5, cut = 3.2) => {
    const pos = [], tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (const m of forms[form]) {
      const T = (p, z) => { const [x, y] = place(m, p); return [x - ring.cx, ring.cy - y, z]; };
      for (const side of [1, -1]) for (const f of facets) {
        const v = f.map(p => T(p, side * (depth / 2 - cut * p[2])));
        for (let i = 1; i < v.length - 1; i++) tri(v[0], v[i], v[i + 1]);
      }
      outline.forEach((p, i) => {
        const q = outline[(i + 1) % outline.length];
        const a = T(p, depth / 2), b = T(q, depth / 2), c = T(q, -depth / 2), d = T(p, -depth / 2);
        tri(a, b, c); tri(a, c, d);
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    return g;
  };
  // shapes: the outlines alone, to extrude and round into something smooth
  const shapes = (THREE, form) => forms[form].map(m => new THREE.Shape(outline.map(p => {
    const [x, y] = place(m, p); return new THREE.Vector2(x - ring.cx, ring.cy - y);
  })));
  return { outline, spine, ring, forms, place, facets, svgPath, viewBox, solid, shapes };
})();
