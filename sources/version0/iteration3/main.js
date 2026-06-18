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
      // steep near the point, then a long faint tail (≈ inverse-square, not linear)
      grad.append(mkStop("0", "0.7"), mkStop("0.07", "0.34"), mkStop("0.18", "0.14"),
                  mkStop("0.4", "0.045"), mkStop("1", "0"));
      defs.appendChild(grad);
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("class", "illum__beam");
      path.setAttribute("fill", "url(#beam" + i + ")");
      beamsG.appendChild(path);
      beamGrads.push(grad);
      beamPaths.push(path);
    });
  }

  // ---- the monogram's true outline, for a smooth boundary reflection -----
  // Each b is a stroked polyline; we build its two rims (offset edges with
  // outward normals, asymmetric miters), then light each edge with a single
  // linear-gradient stroke. Coordinates are the signet's 0..400 viewBox
  // (matching the path transforms in index.html).
  const refTop = document.querySelector(".signet--top");
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

  function drawBands(b) {
    if (b.ex.length) {                                   // outer: external points, reaching inward
      band(b, b.rOut, -1, a => {
        let v = 0;
        for (const q of b.ex) {                          // each lights only the arc it can see (±γ),
          const ratio = b.rOut / q.d; if (ratio >= 1) continue;        // peaking toward it, 0 at the
          const gamma = Math.acos(ratio); if (gamma < 0.12) continue;  // edges — a clean triangular hump
          let d = a - q.th; d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) < gamma) {
            const E = Math.asin(ratio) / Math.PI;        // share of the point's light the circle catches
            v += GAIN_OUT * (E / gamma) * (1 - Math.abs(d) / gamma);
          }
        }
        return v;
      });
    }
    if (b.inn.length) {                                  // inner: internal points, reaching outward
      band(b, b.rIn, +1, a => {
        // physical illuminance on the inner boundary from an interior point at
        // (p.d, p.th): cosβ / dist, with cosβ = (rIn − d·cosΔ)/dist the incidence
        // on the inward normal. It peaks sharply toward the point (Δ=0: rIn/(rIn−d),
        // diverging as the point nears the wall) and tapers to the far side, so the
        // reach is a single bulge per light — not the old half-ring plateau. A
        // central point (d=0) gives a uniform rIn/rIn = 1 → tone(GAIN_IN).
        let v = 0;
        for (const p of b.inn) {
          const cosD = Math.cos(a - p.th);
          const dist2 = b.rIn * b.rIn + p.d * p.d - 2 * b.rIn * p.d * cosD;
          v += GAIN_IN * b.rIn * (b.rIn - p.d * cosD) / dist2;
        }
        return v;
      });
    }
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
    if (hasGlint) for (const edges of strands) {
      const lastE = edges.length - 1;
      for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei];
        const ax = rect.left + e.ax*s, ay = rect.top + e.ay*s;
        const bx = rect.left + e.bx*s, by = rect.top + e.by*s;
        const len = Math.hypot(e.bx-e.ax, e.by-e.ay);
        const steps = Math.max(1, Math.round(len / 4));
        const grad = octx.createLinearGradient(ax, ay, bx, by);
        let any = false;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          let fade = 1;                  // soften only the open ends, not the inner tips
          if (ei === 0)     fade = Math.min(fade, (u * len) / FADE);
          if (ei === lastE) fade = Math.min(fade, ((1 - u) * len) / FADE);
          const a = lit(e.ax + (e.bx-e.ax)*u, e.ay + (e.by-e.ay)*u, e.nx, e.ny) * fade;
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
      const L   = Math.sqrt(dist * dist - R * R);  // tangent length = beam reach
      // two tangent segments, point -> each contact point
      lineD += `M${f(px)} ${f(py)}L${f(t1x)} ${f(t1y)}M${f(px)} ${f(py)}L${f(t2x)} ${f(t2y)}`;
      // the flashlight cone: P -> T1 -> near arc (T1->T2) -> back to P
      if (beam) {
        beam.setAttribute("d", `M${f(px)} ${f(py)}L${f(t1x)} ${f(t1y)}A${f(R)} ${f(R)} 0 0 0 ${f(t2x)} ${f(t2y)}Z`);
        beamGrads[i].setAttribute("cx", f(px));
        beamGrads[i].setAttribute("cy", f(py));
        beamGrads[i].setAttribute("r",  f(L));
      }
    });
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

  // pin the centre dot to the circle's centre, in page coordinates (so it holds
  // that page spot and scrolls with the content). The .pt box is positioned by
  // its top-left, so offset by half its size to land its centre on the circle's.
  function placeCentre() {
    const c = circle();
    if (!c.R) return;
    const half = (centreDot.offsetWidth || 24) / 2;
    centreDot.style.left = (c.cx + window.scrollX - half).toFixed(1) + "px";
    centreDot.style.top  = (c.cy + window.scrollY - half).toFixed(1) + "px";
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { sizeCanvas(); placeCentre(); schedule(); });

  // first paint once layout (and fonts) have settled
  function start() { placeCentre(); draw(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  // a couple of follow-up redraws in case metrics shift after first paint
  requestAnimationFrame(draw);
  setTimeout(draw, 300);
})();
