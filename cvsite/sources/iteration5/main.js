// jonatanbb.xyz — light progressive enhancement only

// fill the footer year
document.getElementById("year").textContent = new Date().getFullYear();

(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const field  = document.querySelector(".points");
  const signet = document.querySelector(".signet");
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
      dot.style.left = p.x.toFixed(2) + "%";   // .pt is centred on its left/top (translate -50%)
      dot.style.top  = p.y.toFixed(2) + "%";
      frag.appendChild(dot);
    }
    field.appendChild(frag);
  })();

  // An 18th sample point, pinned to the circle's centre at load and then
  // page-anchored like all the others (so it scrolls away with the page). It is
  // a real, visible dot — identical to the rest — which is why the logo is only
  // lit from within when this point (or some other interior point) is actually
  // on screen. Its pixel position is set in layoutDots(), once the box is measured.
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

  const dotEls = [...field.querySelectorAll(".pt")];

  // ---- the carved ring text: split into per-letter tspans so each can fade with
  // the light that reaches its own piece of arc ----------------------------
  const willText = document.querySelector(".willtext");
  const willPath = willText ? willText.querySelector("textPath") : null;
  const WILL_STR = willPath ? willPath.textContent : "";
  const willChars = [];
  let willBaseAng = [];                  // each letter's angle on the mid curve (group space)
  if (willPath) {
    willPath.textContent = "";
    for (const ch of WILL_STR) {
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
  const refTop  = document.querySelector(".signet--top");
  const markEl  = document.querySelector(".signet__mark");   // the rotating logo group (b's)
  const ringEl  = document.querySelector(".signet__ring");   // the rotating ring-text group
  const ringTxtG = document.querySelector(".signet__text");  // the text's (untransformed) inner group
  const MARK_BASE = "translate(200 200) scale(0.835096) translate(-107.637 -168.3)";
  let rotRad = 0;                                           // current logo rotation (radians)
  const canvas = document.getElementById("reflect-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const DIFFUSE  = 1.4;                              // canvas diffusion blur (CSS px ≈ DIFFUSE × s)
  const PRIM = [[27.5,86.5],[21,93],[21,58],[49.5,86.5],[0,136],[0,1.445],[4.856,8.7]];
  const USES = [[44.6,81.8],[119,57.75]];
  const KLOGO = 0.835096;                           // maps the bb annulus mid-radius (143.696) to r=120
  const HW = 10.5 * KLOGO / 2;                      // half b-stroke, viewBox units (= 4.384)
  const gX = x => 200 + KLOGO * (x - 107.637);      // group transform (bb annulus centre -> 200,200)
  const gY = y => 200 + KLOGO * (y - 168.3);

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
    // The diffusion is now a GPU blur on the layer itself (set once per resize),
    // instead of a per-frame software blur of an offscreen buffer.
    const s = signet.getBoundingClientRect().width / 400;
    canvas.style.filter = `blur(${(DIFFUSE * s).toFixed(2)}px)`;
  }

  // Light each rim edge with ONE linear-gradient stroke, so the gold band is a
  // continuous gradient (no discrete slices). Per stop: how squarely the rim
  // faces an interior light, falling off quadratically, rolled off with tanh.
  const GOLD = [232, 163, 23];

  // illuminance → displayed alpha. 1 - e^(-v) saturates gently, so overlapping
  // lights still read as brighter. The per-boundary gains below fold into v.
  const tone = v => 1 - Math.exp(-v);
  const GAIN_OUT = 7.8;   // outer boundary (exterior lights): glow stays perceptible far out
  const GAIN_IN  = 0.9;   // inner boundary (interior lights): a central light gives tone(GAIN_IN)

  // Draw one boundary band as a FILLED, variable-width ring directly on the
  // (CSS-blurred) reflect canvas. The boundary itself (rB) is one edge; the
  // other reaches `dir` (±1) toward the mid-radius by an amount that grows with
  // the illuminance. The fill also spills `b.overshoot` PAST the boundary so the
  // blur leaves the boundary edge itself solid gold. Alpha is a per-angle conic
  // gradient; `f(a)` is the raw illuminance at angle a.
  function band(b, rB, dir, f) {
    const TAU = 2 * Math.PI, N = 140;
    const reach = new Array(N + 1);
    const g = ctx.createConicGradient(0, b.cx, b.cy);
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * TAU, alpha = tone(f(a));
      reach[k] = alpha * b.maxReach;
      g.addColorStop(k / N, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha.toFixed(3)})`);
    }
    const fixed = rB - dir * b.overshoot;                  // edge just past the boundary
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * TAU, x = b.cx + fixed * Math.cos(a), y = b.cy + fixed * Math.sin(a);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (let k = N; k >= 0; k--) {                          // reaching edge (rB + dir*reach)
      const a = (k / N) * TAU, r = rB + dir * reach[k];
      ctx.lineTo(b.cx + r * Math.cos(a), b.cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }

  // raw illuminance at outer-boundary angle `a` from the exterior lights: each
  // lights only the arc it can see (±γ), peaking toward it and 0 at the edges.
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
  // cosβ/dist on the inward normal. A central point (d=0) gives a uniform 1.
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

  function drawReflections(lights, bnd) {    // lights: logo interior; bnd: circumference
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas._cw, canvas._ch);
    const hasGlint = lights && lights.length;
    const hasBands = bnd && (bnd.ex.length || bnd.inn.length);
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
    ctx.lineCap = "butt"; ctx.lineJoin = "round"; ctx.lineWidth = bw;
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
        const grad = ctx.createLinearGradient(ax, ay, bx, by);
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
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    if (hasBands) drawBands(bnd);
  }
  if (ctx) sizeCanvas();

  // ---- the circle, in viewport pixels ------------------------------------
  // The signet SVG is a 0..400 square rendered at its box width; the circle
  // is centred with r = 120 (so 120/400 = 0.3 of the width).
  function circle() {
    const s = signet.getBoundingClientRect();
    return { cx: s.left + s.width / 2, cy: s.top + s.height / 2, R: s.width * 0.3, scale: s.width / 400 };
  }

  // ---- per-frame: classify the on-screen points, turn the logo, fade the
  // ring text, repaint the lit bands + glints ------------------------------
  function draw() {
    const { cx, cy, R, scale } = circle();
    if (!R) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    // the thickened circumference (the bb annulus): outer/inner boundary radii.
    const halfStroke = 8.7685 * scale, rOut = R + halfStroke, rIn = R - halfStroke;
    const interiorLights = [];                     // inside the circle: light the b's
    const exteriorLights = [], innerLights = [];   // light the outer / inner boundary
    dotEls.forEach((dot) => {
      const r = dot.getBoundingClientRect();
      const px = r.left + r.width / 2, py = r.top + r.height / 2;
      // only points currently on screen are active (illuminate)
      if (px < 0 || px > vw || py < 0 || py > vh) return;
      const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);               // common angular frame
      if (dist >= rOut) exteriorLights.push({ th, d: dist });
      else if (dist < rIn) innerLights.push({ th, d: dist });
      if (dist <= R) {
        // only a point that has crossed the circumference lights the logo;
        // fade it in over the first fifth of the radius so there's no pop
        const t = Math.min(1, Math.max(0, (R - dist) / (0.22 * R)));
        interiorLights.push({ x: px, y: py, w: t * t * (3 - 2 * t) });
      }
    });
    // rotate the logo (the b's and the ring text) with scroll, as if the annulus
    // rolled with no slip down a wall on its right: a vertical travel d is the
    // fraction d/(2π·rOuter) of a turn, so the magnitude is scrollY / rOuter
    // radians. The sign is negated from last round to flip the spin direction.
    rotRad = -window.scrollY / rOut;
    const rotXf = `rotate(${(rotRad * 180 / Math.PI).toFixed(3)} 200 200) ${MARK_BASE}`;
    if (markEl) markEl.setAttribute("transform", rotXf);
    if (ringEl) ringEl.setAttribute("transform", rotXf);
    // ring text: fade each letter by the light reaching its arc. The letter's
    // base angle on the mid curve is fixed (measured once in layoutRingText), so
    // its current screen angle is just baseAng + rotRad — no per-frame layout.
    if (willChars.length && willBaseAng.length === willChars.length) {
      for (let i = 0; i < willChars.length; i++) {
        const ang = willBaseAng[i] + rotRad;
        const lvl = Math.max(tone(outerIlluminance(ang, exteriorLights, rOut)),
                             tone(innerIlluminance(ang, innerLights, rIn)));
        willChars[i].setAttribute("opacity", smoothstep(WILL_ON, WILL_FULL, lvl).toFixed(3));
      }
    }
    drawReflections(interiorLights,
      { ex: exteriorLights, inn: innerLights, cx, cy, rOut, rIn,
        maxReach: 0.5 * (rOut - rIn),               // cap: a band never crosses the mid-radius
        overshoot: 2.5 * scale });                  // gold spills this far past the boundary (rim fix)
  }

  // Size every dot and pin the two hardcoded ones, in page coordinates (so they
  // hold their page spot and scroll with the content). Each .pt is centred on its
  // left/top (CSS translate -50%), so the hardcoded ones land on the target with
  // no half-size offset.
  //   --pt   the perceived dot DIAMETER: solid core out to r, diffusion fading to
  //          zero at 2r. We set it so the centre dot's perceived diameter is 95%
  //          of the b-to-b gap (so 4r = 0.95·gap).
  //   --glow the cast-light box: the radial glow drops to zero at the logo's
  //          diameter (2·rOut) from the dot, so the box spans 4·rOut.
  function layoutDots() {
    const c = circle();
    if (!c.R) return;
    const halfStroke = 8.7685 * c.scale, rOut = c.R + halfStroke;
    const gapPx  = 12.225 * KLOGO * c.scale;       // the b-to-b gap, in screen px
    field.style.setProperty("--pt", (0.95 * gapPx).toFixed(1) + "px");
    field.style.setProperty("--glow", (4 * rOut).toFixed(1) + "px");
    centreDot.style.left = (c.cx + window.scrollX).toFixed(1) + "px";
    centreDot.style.top  = (c.cy + window.scrollY).toFixed(1) + "px";
    if (iSpan) {                                    // the i-dot sits just over the 'i' of Barreiro
      const r = iSpan.getBoundingClientRect();
      iDot.style.left = (r.left + window.scrollX + r.width / 2).toFixed(1) + "px";
      iDot.style.top  = (r.top + window.scrollY - r.height * 0.18).toFixed(1) + "px";
    }
  }

  // Bend "WILLING TO WORK" into the ring (task: redone). The text rides willpath,
  // the MID-radius circle. We measure the flat text band, scale the font so the
  // band height is HALF the ring thickness (10.5 group units = half of the 21
  // stroke), and let dominant-baseline:central keep it centred on that curve — so
  // it sits well inside both boundaries (no drip) and the curving alone gives the
  // carve look. Each letter's angle on the curve is recorded for the glow.
  function layoutRingText() {
    if (!willText || !ringTxtG || !willChars.length) return;
    const H_TARGET = 10.5, F0 = 10;                 // half the ring thickness; a probe size
    const probe = document.createElementNS(SVG, "text");
    probe.setAttribute("class", "willtext");
    probe.setAttribute("font-size", F0);
    probe.setAttribute("opacity", "0");
    probe.textContent = WILL_STR;
    ringTxtG.appendChild(probe);
    let h = 0;
    try { h = probe.getBBox().height; } catch (e) {}
    ringTxtG.removeChild(probe);
    if (h > 0) willText.setAttribute("font-size", (F0 * H_TARGET / h).toFixed(3));
    // record each letter's angle on the mid curve, in the group's (bb) frame
    // whose centre is the annulus centre (107.637, 168.3)
    willBaseAng = [];
    for (let i = 0; i < willChars.length; i++) {
      try {
        const p = willText.getStartPositionOfChar(i);
        willBaseAng.push(Math.atan2(p.y - 168.3, p.x - 107.637));
      } catch (e) { willBaseAng.push(0); }
    }
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { sizeCanvas(); layoutDots(); schedule(); });

  // first paint once layout (and fonts) have settled
  function start() { layoutDots(); layoutRingText(); draw(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  // re-fit the ring text once the web font is ready (metrics shift), then redraw
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { layoutRingText(); draw(); });
  // a couple of follow-up redraws in case metrics shift after first paint
  requestAnimationFrame(draw);
  setTimeout(() => { layoutDots(); draw(); }, 300);
})();
