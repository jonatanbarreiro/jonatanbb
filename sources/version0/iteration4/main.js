// jonatanbb.xyz — light progressive enhancement only

// fill the footer year
document.getElementById("year").textContent = new Date().getFullYear();

(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const field  = document.querySelector(".points");
  const signet = document.querySelector(".signet");
  const arcEl  = document.getElementById("illum-arc");
  const lineEl = document.getElementById("illum-line");
  const defs   = document.getElementById("illum-defs");
  const beamsG = document.getElementById("illum-beams");
  const illum  = document.getElementById("illum");
  if (!field || !signet) return;

  // ---- scatter the sample field: a fresh draw on every load ---------------
  // seeded from the clock so the arrangement differs each time the page opens.
  (function scatter() {
    const N = 17, minGap = 7, margin = 3;
    let seed = Date.now() >>> 0;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const placed = [];
    for (let tries = 0; placed.length < N && tries < 800; tries++) {
      const x = margin + rand() * (100 - 2 * margin);
      const y = margin + rand() * (100 - 2 * margin);
      if (placed.some(p => Math.hypot(p.x - x, p.y - y) < minGap)) continue;
      placed.push({ x, y });
    }
    const frag = document.createDocumentFragment();
    for (const p of placed) {
      const dot = document.createElement("span");
      dot.className = "pt";
      dot.style.left = p.x.toFixed(2) + "%";
      dot.style.top  = p.y.toFixed(2) + "%";
      frag.appendChild(dot);
    }
    field.appendChild(frag);
  })();

  // An 18th sample point, pinned to the circle's centre at load and then
  // page-anchored like all the others (so it scrolls away with the page). It is
  // a real, visible dot — identical to the rest — which is why the logo is only
  // lit from within when this point (or some other interior point) is actually
  // on screen. Its pixel position is set in start(), once the box is measured.
  const centreDot = document.createElement("span");
  centreDot.className = "pt pt--centre";
  field.appendChild(centreDot);

  // A second hardcoded point, sitting on the 'i' of "Barreiro" (its tittle), the
  // way a dot sits over an undotted i. Page-anchored to that letter; positioned
  // by layoutDots() once the text has been laid out.
  const iSpan = document.querySelector(".hero__i");
  const iDot = document.createElement("span");
  iDot.className = "pt pt--i";
  field.appendChild(iDot);

  // the scattered points, and one flashlight beam (gradient + wedge) per point
  const dotEls = [...field.querySelectorAll(".pt")];
  const beamGrads = [], beamPaths = [];
  if (defs && beamsG) {
    const mkStop = (off, op) => {
      const s = document.createElementNS(SVG, "stop");
      s.setAttribute("offset", off);
      s.setAttribute("stop-color", "#e8a317");
      s.setAttribute("stop-opacity", op);
      return s;
    };
    dotEls.forEach((_, i) => {
      const grad = document.createElementNS(SVG, "radialGradient");
      grad.setAttribute("id", "beam" + i);
      grad.setAttribute("gradientUnits", "userSpaceOnUse");
      // wave model: energy is conserved across each wavefront arc, and an arc at
      // radius ρ from the point has length ∝ ρ, so the illuminance falls as ≈1/ρ.
      // These stops trace that 1/ρ over a FIXED reach (set in draw, not stretched
      // to the tangent length) so far points no longer reach the logo.
      grad.append(mkStop("0", "0.72"), mkStop("0.05", "0.46"), mkStop("0.12", "0.26"),
                  mkStop("0.25", "0.12"), mkStop("0.5", "0.035"), mkStop("1", "0"));
      defs.appendChild(grad);
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("class", "illum__beam");
      path.setAttribute("fill", "url(#beam" + i + ")");
      beamsG.appendChild(path);
      beamGrads.push(grad);
      beamPaths.push(path);
    });
  }

  // ---- the carved ring text: split into per-letter tspans so each can fade with
  // the light that reaches its own piece of arc ----------------------------
  const willText = document.querySelector(".willtext");
  const willPath = willText ? willText.querySelector("textPath") : null;
  const willChars = [];
  if (willPath) {
    const str = willPath.textContent;
    willPath.textContent = "";
    for (const ch of str) {
      const ts = document.createElementNS(SVG, "tspan");
      ts.textContent = ch;
      willPath.appendChild(ts);
      willChars.push(ts);
    }
    willText.setAttribute("opacity", "1");      // the per-letter tspans now carry the visibility
  }
  // text glow ramp: a piece glows once the light on it passes WILL_ON and is full
  // by WILL_FULL. WILL_ON sits just above what the centre dot alone puts on the
  // inner wall (tone(GAIN_IN) ≈ 0.59), so at load the centre light doesn't reveal
  // the text — only extra points (inside or out) do.
  const WILL_ON = 0.63, WILL_FULL = 0.70;
  const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---- the monogram's true outline, for a smooth boundary reflection -----
  // Each b is a stroked polyline; we build its two rims (offset edges with
  // outward normals, asymmetric miters), then light each edge with a single
  // linear-gradient stroke. Coordinates are the signet's 0..400 viewBox
  // (matching the path transforms in index.html).
  const refTop = document.querySelector(".signet--top");
  const markEl = document.querySelector(".signet__mark");   // the rotating logo group (b's)
  const ringEl = document.querySelector(".signet__ring");   // the rotating ring-text group
  const MARK_BASE = "translate(200 200) scale(0.835096) translate(-107.637 -168.3)";
  let rotRad = 0;                                           // current logo rotation (radians)
  const canvas = document.getElementById("reflect-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const off = canvas ? document.createElement("canvas") : null;   // sharp glint buffer
  const octx = off ? off.getContext("2d") : null;
  // Diffusion: blur the glint by ~3x the band width. RESTRICT keeps the blur on
  // the logo (masked to the stroke); when false the gold bleeds onto the page's
  // white as a glow. (The glow build lives in the sibling -glow folder.)
  const RESTRICT = false;
  const DIFFUSE  = 1.4;                              // blur radius (CSS px ≈ DIFFUSE × s)
  const PRIM = [[27.5,86.5],[21,93],[21,58],[49.5,86.5],[0,136],[0,1.445],[4.856,8.7]];
  const USES = [[44.6,81.8],[119,57.75]];
  const KLOGO = 0.835096;                           // maps the bb annulus mid-radius (143.696) to r=120
  const HW = 10.5 * KLOGO / 2;                      // half b-stroke, viewBox units (= 4.384)
  const gX = x => 200 + KLOGO * (x - 107.637);      // group transform (bb annulus centre -> 200,200)
  const gY = y => 200 + KLOGO * (y - 168.3);
  const centers = USES.map(t => PRIM.map(p => [gX(p[0]+t[0]), gY(p[1]+t[1])]));  // for the mask

  // Build the two rims of one b (each a list of straight edges with an outward
  // normal). At each join the convex side keeps the full miter so the glint
  // reaches the sharp tips; the concave side is beveled so the inner offset
  // doesn't spike inward. The rim is inset slightly onto the stroke.
  const INSET = 1.4;                  // sit the glint this far inside the edge
  const O = HW - INSET;               // rim offset from the centreline
  function buildStrands(t) {
    const C = PRIM.map(p => [gX(p[0] + t[0]), gY(p[1] + t[1])]);
    const n = C.length, d = [], nL = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = C[i+1][0]-C[i][0], dy = C[i+1][1]-C[i][1], len = Math.hypot(dx,dy) || 1;
      d.push([dx/len, dy/len]); nL.push([-dy/len, dx/len]);
    }
    const vert = (i, sg) => {                                      // rim vertex, side sg
      if (i === 0)     return [C[0][0]+sg*O*nL[0][0], C[0][1]+sg*O*nL[0][1]];
      if (i === n - 1) return [C[n-1][0]+sg*O*nL[n-2][0], C[n-1][1]+sg*O*nL[n-2][1]];
      let mx = nL[i-1][0]+nL[i][0], my = nL[i-1][1]+nL[i][1], ml = Math.hypot(mx,my) || 1;
      mx /= ml; my /= ml;
      let den = mx*nL[i][0] + my*nL[i][1];
      const turn = d[i-1][0]*d[i][1] - d[i-1][1]*d[i][0];          // join handedness
      const convex = sg * turn < 0;                                // this side bulges out
      const floor = convex ? 0.17 : 0.82;                          // miter to the tip / bevel
      if (den < floor) den = floor;
      const m = O / den;
      return [C[i][0]+sg*m*mx, C[i][1]+sg*m*my];
    };
    const strand = sg => {
      const v = []; for (let i = 0; i < n; i++) v.push(vert(i, sg));
      const edges = [];
      for (let i = 0; i < n - 1; i++)
        edges.push({ ax: v[i][0], ay: v[i][1], bx: v[i+1][0], by: v[i+1][1], nx: sg*nL[i][0], ny: sg*nL[i][1] });
      return edges;
    };
    return [strand(1), strand(-1)];
  }
  const strands = refTop ? [].concat(...USES.map(buildStrands)) : [];   // 4 rims of edges

  function sizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas._cw = window.innerWidth; canvas._ch = window.innerHeight; canvas._dpr = dpr;
    canvas.width = Math.round(canvas._cw * dpr); canvas.height = Math.round(canvas._ch * dpr);
    canvas.style.width = canvas._cw + "px"; canvas.style.height = canvas._ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    off.width = canvas.width; off.height = canvas.height;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Light each rim edge with ONE linear-gradient stroke, so the gold band is a
  // continuous gradient (no discrete slices). Per stop: how squarely the rim
  // faces an interior light, falling off quadratically, rolled off with tanh.
  const GOLD = [232, 163, 23];

  // illuminance → displayed alpha. 1 - e^(-v) saturates gently, so overlapping
  // lights still read as brighter. The per-boundary gains below fold into v.
  const tone = v => 1 - Math.exp(-v);
  const GAIN_OUT = 7.8;   // outer boundary (exterior lights): ~3× the old reach, so
                          //   the glow stays perceptible out to ~12 lines' distance
  const GAIN_IN  = 0.9;   // inner boundary (interior lights): tuned to match the
                          //   outer glow's intensity (a central light gives tone(GAIN_IN))
  const BEAM_REACH = 1.5; // flashlight cone fades to 0 by this × R from the point
                          //   (a fixed reach, so far points don't light the ring)

  // Draw one boundary band as a FILLED, variable-width ring. The boundary itself
  // (rB) is one edge; the other reaches `dir` (±1) toward the mid-radius by an
  // amount that grows with the illuminance — a bright piece reaches across, a
  // just-not-lit piece has zero reach (smooth pointy ends). Reach is capped at
  // b.maxReach = half the ring, so it never crosses the mid-radius. The fill also
  // spills `b.overshoot` PAST the boundary (away from mid): after the diffusion
  // blur that keeps the boundary edge itself solid gold, with no dark rim. Alpha
  // is a per-angle conic gradient; `f(a)` is the raw illuminance at angle a.
  function band(b, rB, dir, f) {
    const TAU = 2 * Math.PI, N = 220;
    const reach = new Array(N + 1);
    const g = octx.createConicGradient(0, b.cx, b.cy);
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * TAU, alpha = tone(f(a));
      reach[k] = alpha * b.maxReach;
      g.addColorStop(k / N, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha.toFixed(3)})`);
    }
    const fixed = rB - dir * b.overshoot;                  // edge just past the boundary
    octx.beginPath();
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * TAU, x = b.cx + fixed * Math.cos(a), y = b.cy + fixed * Math.sin(a);
      k ? octx.lineTo(x, y) : octx.moveTo(x, y);
    }
    for (let k = N; k >= 0; k--) {                          // reaching edge (rB + dir*reach)
      const a = (k / N) * TAU, r = rB + dir * reach[k];
      octx.lineTo(b.cx + r * Math.cos(a), b.cy + r * Math.sin(a));
    }
    octx.closePath();
    octx.fillStyle = g; octx.fill();
  }

  // raw illuminance at outer-boundary angle `a` from the exterior lights: each
  // lights only the arc it can see (±γ), peaking toward it and 0 at the edges —
  // a clean triangular hump.
  function outerIlluminance(a, ex, rOut) {
    let v = 0;
    for (const q of ex) {
      const ratio = rOut / q.d; if (ratio >= 1) continue;
      const gamma = Math.acos(ratio); if (gamma < 0.12) continue;
      let d = a - q.th; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < gamma) {
        const E = Math.asin(ratio) / Math.PI;            // share of the light the circle catches
        v += GAIN_OUT * (E / gamma) * (1 - Math.abs(d) / gamma);
      }
    }
    return v;
  }
  // raw illuminance at inner-boundary angle `a` from the interior lights: physical
  // cosβ/dist, cosβ = (rIn − d·cosΔ)/dist the incidence on the inward normal. It
  // peaks sharply toward the point (Δ=0: rIn/(rIn−d), diverging as the point nears
  // the wall) and tapers to the far side — one bulge per light, not a plateau. A
  // central point (d=0) gives a uniform rIn/rIn = 1 → tone(GAIN_IN).
  function innerIlluminance(a, inn, rIn) {
    let v = 0;
    for (const p of inn) {
      const cosD = Math.cos(a - p.th);
      const dist2 = rIn * rIn + p.d * p.d - 2 * rIn * p.d * cosD;
      v += GAIN_IN * rIn * (rIn - p.d * cosD) / dist2;
    }
    return v;
  }
  function drawBands(b) {
    if (b.ex.length)  band(b, b.rOut, -1, a => outerIlluminance(a, b.ex, b.rOut));
    if (b.inn.length) band(b, b.rIn, +1, a => innerIlluminance(a, b.inn, b.rIn));
  }

  function drawReflections(lights, band) {   // lights: logo interior; band: circumference
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas._cw, canvas._ch);
    const hasGlint = lights && lights.length;
    const hasBands = band && (band.ex.length || band.inn.length);
    if (!hasGlint && !hasBands) return;
    const rect = refTop.getBoundingClientRect(); const W = rect.width; if (!W) return;
    const s = W / 400;
    const L = (lights || []).map(p => ({ x: (p.x - rect.left) / s, y: (p.y - rect.top) / s, w: p.w }));
    const Dr = 95, K = 2.4;
    const lit = (x, y, nx, ny) => {                  // 0..1 intensity at a rim point
      let v = 0;
      for (const l of L) {
        const dx = l.x - x, dy = l.y - y, dist = Math.hypot(dx, dy);
        if (dist < 0.001) continue;
        const f = (nx*dx + ny*dy) / dist;
        if (f <= 0) continue;
        v += l.w * f / (1 + (dist/Dr)*(dist/Dr));
      }
      return Math.tanh(v * K);
    };
    const FADE = 7, bw = 3 * s;          // FADE: open-end fade; bw: band width
    // 1) draw the sharp glint + boundary bands onto the offscreen buffer
    octx.clearRect(0, 0, canvas._cw, canvas._ch);
    octx.lineCap = "butt"; octx.lineJoin = "round"; octx.lineWidth = bw;
    // the b's rotate with scroll, so rotate each rim edge (points + normal) about
    // the viewBox centre by rotRad before lighting/drawing it (lights are fixed)
    const cR = Math.cos(rotRad), sR = Math.sin(rotRad);
    const rX = (x, y) => 200 + (x - 200) * cR - (y - 200) * sR;
    const rY = (x, y) => 200 + (x - 200) * sR + (y - 200) * cR;
    if (hasGlint) for (const edges of strands) {
      const lastE = edges.length - 1;
      for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei];
        const eax = rX(e.ax, e.ay), eay = rY(e.ax, e.ay);
        const ebx = rX(e.bx, e.by), eby = rY(e.bx, e.by);
        const enx = e.nx * cR - e.ny * sR, eny = e.nx * sR + e.ny * cR;
        const ax = rect.left + eax*s, ay = rect.top + eay*s;
        const bx = rect.left + ebx*s, by = rect.top + eby*s;
        const len = Math.hypot(ebx-eax, eby-eay);
        const steps = Math.max(1, Math.round(len / 4));
        const grad = octx.createLinearGradient(ax, ay, bx, by);
        let any = false;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          let fade = 1;                  // soften only the open ends, not the inner tips
          if (ei === 0)     fade = Math.min(fade, (u * len) / FADE);
          if (ei === lastE) fade = Math.min(fade, ((1 - u) * len) / FADE);
          const a = lit(eax + (ebx-eax)*u, eay + (eby-eay)*u, enx, eny) * fade;
          if (a > 0.012) any = true;
          grad.addColorStop(u, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${a.toFixed(3)})`);
        }
        if (!any) continue;
        octx.strokeStyle = grad;
        octx.beginPath(); octx.moveTo(ax, ay); octx.lineTo(bx, by); octx.stroke();
      }
    }
    if (hasBands) drawBands(band);
    // 2) blit it back diffused (Gaussian blur ≈ the band width)
    const dpr = canvas._dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(DIFFUSE * s * dpr).toFixed(2)}px)`;
    ctx.drawImage(off, 0, 0);
    ctx.filter = "none";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 3) keep the diffusion on the logo (Option A); skip to let it glow (Option B)
    if (RESTRICT) {
      // one path for both b's, one stroke — destination-in must see the whole
      // mask at once (per-stroke would wipe the previous b's kept glint)
      ctx.globalCompositeOperation = "destination-in";
      ctx.strokeStyle = "#000"; ctx.lineWidth = HW * 2 * s;
      ctx.lineJoin = "miter"; ctx.miterLimit = 6; ctx.lineCap = "butt";
      ctx.beginPath();
      for (const C of centers) {
        ctx.moveTo(rect.left + C[0][0]*s, rect.top + C[0][1]*s);
        for (let i = 1; i < C.length; i++) ctx.lineTo(rect.left + C[i][0]*s, rect.top + C[i][1]*s);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
  }
  if (ctx) sizeCanvas();

  // ---- the circle, in viewport pixels ------------------------------------
  // The signet SVG is a 0..400 square rendered at its box width; the circle
  // is centred with r = 120 (so 120/400 = 0.3 of the width).
  function circle() {
    const s = signet.getBoundingClientRect();
    return { cx: s.left + s.width / 2, cy: s.top + s.height / 2, R: s.width * 0.3, scale: s.width / 400 };
  }

  // ---- draw the beams, tangent lines + illuminated arcs ------------------
  function draw() {
    const { cx, cy, R, scale } = circle();
    if (!R) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const f = n => n.toFixed(1);
    // the circumference as a fill shape, for interior lighting
    const circlePath = `M${f(cx - R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 0 ${f(cx + R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 0 ${f(cx - R)} ${f(cy)}Z`;
    let lineD = "";
    const interiorLights = [];                     // only these light the logo
    // the thickened circumference (the bb annulus): outer/inner boundary radii.
    // Its stroke-width (17.5370 viewBox units = 2× the logo stroke) gives the
    // lighting band twice the radial margin; half = 8.7685.
    const halfStroke = 8.7685 * scale, rOut = R + halfStroke, rIn = R - halfStroke;
    const rPt = 5;                                 // a point's (core) radius, screen px
    const exteriorLights = [], innerLights = [];   // light the outer / inner boundary
    dotEls.forEach((dot, i) => {
      const beam = beamPaths[i], grad = beamGrads[i];
      const r = dot.getBoundingClientRect();
      const px = r.left + r.width / 2, py = r.top + r.height / 2;
      // only points currently on screen are active (illuminate)
      const active = px >= 0 && px <= vw && py >= 0 && py <= vh;
      if (!active) { if (beam) beam.setAttribute("d", ""); return; }
      const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);               // common angular frame
      if (dist >= rOut) exteriorLights.push({ th, d: dist });        // lights the outer boundary
      if (dist < rIn - rPt) innerLights.push({ th, d: dist });       // lights the inner boundary
      if (dist <= R) {
        // inside the circumference: light the interior radially from the point.
        // The fill shape is the circle itself, so the light can't cross the border.
        if (beam) {
          beam.setAttribute("d", circlePath);
          grad.setAttribute("cx", f(px));
          grad.setAttribute("cy", f(py));
          grad.setAttribute("r", f(1.7 * R));
        }
        // only a point that has crossed the circumference lights the logo;
        // fade it in over the first fifth of the radius so there's no pop
        const t = Math.min(1, Math.max(0, (R - dist) / (0.22 * R)));
        interiorLights.push({ x: px, y: py, w: t * t * (3 - 2 * t) });
        return;
      }
      const phi = Math.atan2(dy, dx);
      const g   = Math.acos(R / dist);             // half the angular width seen
      const a1  = phi + g, a2 = phi - g;
      const t1x = cx + R * Math.cos(a1), t1y = cy + R * Math.sin(a1);
      const t2x = cx + R * Math.cos(a2), t2y = cy + R * Math.sin(a2);
      // two tangent segments, point -> each contact point
      lineD += `M${f(px)} ${f(py)}L${f(t1x)} ${f(t1y)}M${f(px)} ${f(py)}L${f(t2x)} ${f(t2y)}`;
      // the flashlight cone: P -> T1 -> near arc (T1->T2) -> back to P. The 1/ρ
      // gradient fades over a FIXED reach (not the tangent length), so a far
      // point's cone dims out before it ever reaches the ring.
      if (beam) {
        beam.setAttribute("d", `M${f(px)} ${f(py)}L${f(t1x)} ${f(t1y)}A${f(R)} ${f(R)} 0 0 0 ${f(t2x)} ${f(t2y)}Z`);
        beamGrads[i].setAttribute("cx", f(px));
        beamGrads[i].setAttribute("cy", f(py));
        beamGrads[i].setAttribute("r",  f(BEAM_REACH * R));
      }
    });
    // rotate the logo (the b's and the ring text) with scroll, as if the annulus
    // rolled with no slip down a wall on its right: a vertical travel d is the
    // fraction d/(2π·rOuter) of a turn, so rotation = scrollY / rOuter radians.
    // Counter-clockwise (rolling down a wall on the right): verified by render.
    rotRad = window.scrollY / rOut;
    const rotXf = `rotate(${(rotRad * 180 / Math.PI).toFixed(3)} 200 200) ${MARK_BASE}`;
    if (markEl) markEl.setAttribute("transform", rotXf);
    if (ringEl) ringEl.setAttribute("transform", rotXf);
    // ring text: fade each letter by the light reaching its (now-rotated) arc.
    // The letter's screen angle comes from its on-path position mapped through the
    // text's CTM, so it follows the rotation; same viewport frame as cx,cy.
    if (willChars.length) {
      const m = willText.getScreenCTM();
      if (m) for (let i = 0; i < willChars.length; i++) {
        let ang;
        try { const p = willText.getStartPositionOfChar(i).matrixTransform(m); ang = Math.atan2(p.y - cy, p.x - cx); }
        catch (e) { continue; }
        const lvl = Math.max(tone(outerIlluminance(ang, exteriorLights, rOut)),
                             tone(innerIlluminance(ang, innerLights, rIn)));
        willChars[i].setAttribute("opacity", smoothstep(WILL_ON, WILL_FULL, lvl).toFixed(3));
      }
    }
    // (the centre of the circumference is no longer a hidden hardcoded light —
    // it's the visible page-anchored centreDot, handled in the loop above.)
    lineEl.setAttribute("d", lineD);
    arcEl.setAttribute("d", "");                    // the lit arc is now the physical boundary band
    lineEl.setAttribute("stroke-width", (1 * scale).toFixed(2));
    lineEl.setAttribute("stroke-dasharray", `${(4 * scale).toFixed(1)} ${(5 * scale).toFixed(1)}`);
    if (illum) illum.classList.add("is-on");
    drawReflections(interiorLights,
      { ex: exteriorLights, inn: innerLights, cx, cy, rOut, rIn,
        maxReach: 0.5 * (rOut - rIn),               // cap: a band never crosses the mid-radius
        overshoot: 2.5 * scale });                  // gold spills this far past the boundary (rim fix)
  }

  // Size every dot and pin the two hardcoded ones, in page coordinates (so they
  // hold their page spot and scroll with the content). The dot size is set so the
  // centre dot's solid core (inner 45% of its radius) almost spans the 12.225-unit
  // gap between the two b's without touching them. The .pt box is positioned by
  // its top-left, so we offset by half its size to land its centre on the target.
  function layoutDots() {
    const c = circle();
    if (!c.R) return;
    const gapPx = 12.225 * KLOGO * c.scale;        // the b-to-b gap, in screen px
    const dotPx = (0.92 * gapPx) / 0.45;           // core (45% of radius) ≈ 0.92 × gap
    field.style.setProperty("--pt", dotPx.toFixed(1) + "px");
    const half = dotPx / 2;
    centreDot.style.left = (c.cx + window.scrollX - half).toFixed(1) + "px";
    centreDot.style.top  = (c.cy + window.scrollY - half).toFixed(1) + "px";
    if (iSpan) {                                    // the i-dot sits just over the 'i' of Barreiro
      const r = iSpan.getBoundingClientRect();
      iDot.style.left = (r.left + window.scrollX + r.width / 2 - half).toFixed(1) + "px";
      iDot.style.top  = (r.top + window.scrollY - r.height * 0.18 - half).toFixed(1) + "px";
    }
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { sizeCanvas(); layoutDots(); schedule(); });

  // first paint once layout (and fonts) have settled
  function start() { layoutDots(); draw(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  // a couple of follow-up redraws in case metrics shift after first paint
  requestAnimationFrame(draw);
  setTimeout(draw, 300);
})();
