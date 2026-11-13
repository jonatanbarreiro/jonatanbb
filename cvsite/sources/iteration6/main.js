// jonatanbb.xyz — light progressive enhancement only

// fill the footer year
document.getElementById("year").textContent = new Date().getFullYear();

(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const field  = document.querySelector(".points");
  const signet = document.querySelector(".signet");
  if (!field || !signet) return;

  const TAU = 2 * Math.PI;
  const N = 180;          // uniform angular partition of each ring half (2° arcs)
  const LEVELS = 13;      // discrete heat levels for the letters: 0 (dark) .. 13 (full)

  // ---- scatter the sample field: a fresh draw on every load ---------------
  // seeded from the clock so the arrangement differs each time the page opens.
  (function scatter() {
    const M = 17, minGap = 7, margin = 3;
    let seed = Date.now() >>> 0;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const placed = [];
    for (let tries = 0; placed.length < M && tries < 800; tries++) {
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
  // page-anchored like all the others (so it scrolls away with the page). It is a
  // real, visible dot — the logo is only lit from within while it (or another
  // interior point) is on screen. Pixel position set by layoutDots().
  const centreDot = document.createElement("span");
  centreDot.className = "pt pt--centre";
  field.appendChild(centreDot);

  // A second hardcoded point on the 'i' of "Barreiro" (its tittle), page-anchored
  // to that letter; positioned by layoutDots() once the text is laid out.
  const iSpan = document.querySelector(".hero__i");
  const iDot = document.createElement("span");
  iDot.className = "pt pt--i";
  field.appendChild(iDot);

  const dotEls = [...field.querySelectorAll(".pt")];
  const dotPos = [];      // page-space centre of each dot, cached by layoutDots()

  // ---- the carved ring message, drawn on its own canvas (NOT a separate SVG
  // layer) so it repaints in the same pass as the bands and can't lag them ----
  const STR = "WILLING TO WORK";
  const chars = [...STR];
  let letterOff = [];     // each letter's signed angular offset from the string centre
  // The centre dot alone puts tone(GAIN_IN) ≈ 0.59 on the whole inner wall; the
  // letters must stay dark under that resting glow and only heat from EXTRA light.
  const TXT_T0 = 0.60, TXT_T1 = 1.0;
  const FAMILY = "'Inter', system-ui, -apple-system, sans-serif";
  const FONT_FRAC = 0.78;             // letter font px as a fraction of the ring thickness
  const R_OVER_THK = 120 / 17.537;    // mid radius / ring thickness (= 6.843), scale-free
  const CENTRE_ANG = Math.PI;         // the string is centred on the left arc (faces screen centre)
  const lettersCanvas = document.getElementById("letters-canvas");
  const lctx = lettersCanvas ? lettersCanvas.getContext("2d") : null;

  // letters heat up as they brighten: a black-body-ish ramp anchored at carmesí
  // (#7f3445, from the firecoat logo) — dark wine when barely lit, hot orange when
  // fully lit, so the sequence reads as the letters becoming incandescent.
  const HEAT = [
    [0.00,  70, 18, 30],   // very dark crimson
    [0.40, 127, 52, 69],   // carmesí #7f3445
    [0.72, 200, 54, 46],   // bright crimson
    [1.00, 242, 130, 48]   // hot orange
  ];
  function incandescent(t) {
    let a = HEAT[0], b = HEAT[HEAT.length - 1];
    for (let i = 0; i < HEAT.length - 1; i++)
      if (t >= HEAT[i][0] && t <= HEAT[i + 1][0]) { a = HEAT[i]; b = HEAT[i + 1]; break; }
    const f = (t - a[0]) / ((b[0] - a[0]) || 1);
    const r = Math.round(a[1] + (b[1] - a[1]) * f);
    const g = Math.round(a[2] + (b[2] - a[2]) * f);
    const c = Math.round(a[3] + (b[3] - a[3]) * f);
    return `rgb(${r},${g},${c})`;
  }

  // ---- the monogram's true outline, for a smooth boundary reflection -----
  const refTop  = document.querySelector(".signet--top");
  const markEl  = document.querySelector(".signet__mark");   // rotating logo group (b's)
  const MARK_BASE = "translate(200 200) scale(0.835096) translate(-107.637 -168.3)";
  let rotRad = 0;                                            // current logo rotation (radians)
  const reflectCanvas = document.getElementById("reflect-canvas");
  const ctx = reflectCanvas ? reflectCanvas.getContext("2d") : null;
  const castCanvas = document.getElementById("cast-canvas");
  const cctx = castCanvas ? castCanvas.getContext("2d") : null;
  const DIFFUSE = 1.4;                              // reflect-canvas blur (CSS px ≈ DIFFUSE × s)
  const CAST_ALPHA = 0.16;                          // peak alpha of an exterior point's cone
  const PRIM = [[27.5,86.5],[21,93],[21,58],[49.5,86.5],[0,136],[0,1.445],[4.856,8.7]];
  const USES = [[44.6,81.8],[119,57.75]];
  const KLOGO = 0.835096;
  const HW = 10.5 * KLOGO / 2;
  const gX = x => 200 + KLOGO * (x - 107.637);
  const gY = y => 200 + KLOGO * (y - 168.3);

  // Build the two rims of one b (each a list of straight edges with an outward
  // normal); convex joins keep the miter, concave joins bevel.
  const INSET = 1.4;
  const O = HW - INSET;
  function buildStrands(t) {
    const C = PRIM.map(p => [gX(p[0] + t[0]), gY(p[1] + t[1])]);
    const n = C.length, d = [], nL = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = C[i+1][0]-C[i][0], dy = C[i+1][1]-C[i][1], len = Math.hypot(dx,dy) || 1;
      d.push([dx/len, dy/len]); nL.push([-dy/len, dx/len]);
    }
    const vert = (i, sg) => {
      if (i === 0)     return [C[0][0]+sg*O*nL[0][0], C[0][1]+sg*O*nL[0][1]];
      if (i === n - 1) return [C[n-1][0]+sg*O*nL[n-2][0], C[n-1][1]+sg*O*nL[n-2][1]];
      let mx = nL[i-1][0]+nL[i][0], my = nL[i-1][1]+nL[i][1], ml = Math.hypot(mx,my) || 1;
      mx /= ml; my /= ml;
      let den = mx*nL[i][0] + my*nL[i][1];
      const turn = d[i-1][0]*d[i][1] - d[i-1][1]*d[i][0];
      const convex = sg * turn < 0;
      const floor = convex ? 0.17 : 0.82;
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
  const strands = refTop ? [].concat(...USES.map(buildStrands)) : [];

  function fitCanvas(cv, c, blurPx) {
    const dpr = window.devicePixelRatio || 1;
    cv._cw = window.innerWidth; cv._ch = window.innerHeight; cv._dpr = dpr;
    cv.width = Math.round(cv._cw * dpr); cv.height = Math.round(cv._ch * dpr);
    cv.style.width = cv._cw + "px"; cv.style.height = cv._ch + "px";
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.style.filter = blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : "none";
  }
  function sizeCanvas() {
    const s = signet.getBoundingClientRect().width / 400;
    if (ctx)  fitCanvas(reflectCanvas, ctx,  DIFFUSE * s);    // bands + glints, diffused
    if (cctx) fitCanvas(castCanvas,    cctx, 2.2 * s);        // cones, lightly softened
    if (lctx) fitCanvas(lettersCanvas, lctx, 0);              // letters, crisp
  }

  const GOLD = [232, 163, 23];
  const tone = v => 1 - Math.exp(-v);            // raw illuminance → 0..1 alpha
  const GAIN_OUT = 7.8;   // outer boundary (exterior lights)
  const GAIN_IN  = 0.9;   // inner boundary (interior lights): a central light gives tone(GAIN_IN)

  // raw illuminance at outer-boundary angle `a` from the exterior lights: each
  // lights only the arc it can see (±γ), peaking toward it and 0 at the edges.
  function outerIlluminance(a, ex, rOut) {
    let v = 0;
    for (const q of ex) {
      const ratio = rOut / q.d; if (ratio >= 1) continue;
      const gamma = Math.acos(ratio); if (gamma < 0.12) continue;
      let dd = a - q.th; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      if (Math.abs(dd) < gamma) {
        const E = Math.asin(ratio) / Math.PI;
        v += GAIN_OUT * (E / gamma) * (1 - Math.abs(dd) / gamma);
      }
    }
    return v;
  }
  // raw illuminance at inner-boundary angle `a` from the interior lights: physical
  // cosβ/dist on the inward normal; a central point (d=0) gives a uniform 1.
  function innerIlluminance(a, inn, rIn) {
    let v = 0;
    for (const p of inn) {
      const cosD = Math.cos(a - p.th);
      const dist2 = rIn * rIn + p.d * p.d - 2 * rIn * p.d * cosD;
      v += GAIN_IN * rIn * (rIn - p.d * cosD) / dist2;
    }
    return v;
  }

  // Paint one boundary band as a FILLED, variable-width ring from a per-arc alpha
  // array. The boundary (rB) is one edge; the other reaches `dir` (±1) toward the
  // mid-radius by alpha·maxReach. The fill spills `b.overshoot` past the boundary
  // so the diffusion blur leaves the boundary edge solid gold.
  function band(b, rB, dir, alpha) {
    const M = alpha.length;
    let mx = 0; for (let k = 0; k < M; k++) if (alpha[k] > mx) mx = alpha[k];
    if (mx < 0.004) return;
    const g = ctx.createConicGradient(0, b.cx, b.cy);
    for (let k = 0; k <= M; k++)
      g.addColorStop(k / M, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha[k % M].toFixed(3)})`);
    const fixed = rB - dir * b.overshoot;
    ctx.beginPath();
    for (let k = 0; k <= M; k++) {
      const a = (k / M) * TAU, x = b.cx + fixed * Math.cos(a), y = b.cy + fixed * Math.sin(a);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (let k = M; k >= 0; k--) {
      const a = (k / M) * TAU, r = rB + dir * alpha[k % M] * b.maxReach;
      ctx.lineTo(b.cx + r * Math.cos(a), b.cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }

  function drawReflections(lights, bnd) {
    if (!ctx) return;
    ctx.clearRect(0, 0, reflectCanvas._cw, reflectCanvas._ch);
    const hasGlint = lights && lights.length;
    let bandMx = 0;
    for (let k = 0; k < bnd.alphaOut.length; k++) {
      if (bnd.alphaOut[k] > bandMx) bandMx = bnd.alphaOut[k];
      if (bnd.alphaInner[k] > bandMx) bandMx = bnd.alphaInner[k];
    }
    const hasBands = bandMx > 0.004;
    if (!hasGlint && !hasBands) return;
    const rect = refTop.getBoundingClientRect(); const W = rect.width; if (!W) return;
    const s = W / 400;
    const L = (lights || []).map(p => ({ x: (p.x - rect.left) / s, y: (p.y - rect.top) / s, w: p.w }));
    const Dr = 95, K = 2.4;
    const lit = (x, y, nx, ny) => {
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
    const FADE = 7, bw = 3 * s;
    ctx.lineCap = "butt"; ctx.lineJoin = "round"; ctx.lineWidth = bw;
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
          let fade = 1;
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
    if (hasBands) {
      band(bnd, bnd.rOut, -1, bnd.alphaOut);
      band(bnd, bnd.rIn,  +1, bnd.alphaInner);
    }
  }

  // The focused cone an exterior point throws at the logo: a wedge bounded by the
  // two directions in which the point grazes the outer boundary, with a radial
  // gold falloff fading linearly to zero by the logo's diameter.
  function drawCast(ext, cx, cy, rOut) {
    if (!cctx) return;
    cctx.clearRect(0, 0, castCanvas._cw, castCanvas._ch);
    const reach = 2 * rOut;
    for (const q of ext) {
      const ratio = rOut / q.d; if (ratio >= 1) continue;
      const gm = Math.acos(ratio);
      const c1x = cx + rOut*Math.cos(q.th + gm), c1y = cy + rOut*Math.sin(q.th + gm);
      const c2x = cx + rOut*Math.cos(q.th - gm), c2y = cy + rOut*Math.sin(q.th - gm);
      const a1 = Math.atan2(c1y - q.py, c1x - q.px), a2 = Math.atan2(c2y - q.py, c2x - q.px);
      const f1x = q.px + reach*Math.cos(a1), f1y = q.py + reach*Math.sin(a1);
      const f2x = q.px + reach*Math.cos(a2), f2y = q.py + reach*Math.sin(a2);
      const g = cctx.createRadialGradient(q.px, q.py, 0, q.px, q.py, reach);
      g.addColorStop(0, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${CAST_ALPHA})`);
      g.addColorStop(1, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},0)`);
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.moveTo(q.px, q.py); cctx.lineTo(f1x, f1y); cctx.lineTo(f2x, f2y);
      cctx.closePath(); cctx.fill();
    }
  }

  // The incandescent ring letters, drawn crisp on their own canvas in this same
  // pass. Each letter rides the mid-radius circle at its own angle; its heat level
  // is the boundary illumination at that angle, above the resting glow.
  function drawLetters(cx, cy, R, thk, toneOut, toneIn) {
    if (!lctx || letterOff.length !== chars.length) return;
    lctx.clearRect(0, 0, lettersCanvas._cw, lettersCanvas._ch);
    lctx.font = `bold ${(FONT_FRAC * thk).toFixed(1)}px ${FAMILY}`;
    lctx.textAlign = "center"; lctx.textBaseline = "middle";
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === " ") continue;
      const ang = CENTRE_ANG + letterOff[i] + rotRad;
      const k = Math.round((((ang % TAU) + TAU) % TAU) / TAU * N) % N;
      const t = (Math.max(toneOut[k], toneIn[k]) - TXT_T0) / (TXT_T1 - TXT_T0);
      const lvl = Math.max(0, Math.min(LEVELS, Math.round(t * LEVELS)));
      if (lvl <= 0) continue;
      const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      lctx.save();
      lctx.translate(x, y);
      lctx.rotate(ang + Math.PI / 2);          // baseline tangent to the ring, tops outward
      lctx.fillStyle = incandescent(lvl / LEVELS);
      lctx.fillText(chars[i], 0, 0);
      lctx.restore();
    }
  }

  // ---- the circle, in viewport pixels ------------------------------------
  function circle() {
    const s = signet.getBoundingClientRect();
    return { cx: s.left + s.width / 2, cy: s.top + s.height / 2, R: s.width * 0.3, scale: s.width / 400 };
  }

  function draw() {
    const { cx, cy, R, scale } = circle();
    if (!R) return;
    const halfStroke = 8.7685 * scale, rOut = R + halfStroke, rIn = R - halfStroke, thk = rOut - rIn;
    const sx = window.scrollX, sy = window.scrollY, vw = window.innerWidth, vh = window.innerHeight;
    const ext = [], inn = [], interior = [];
    for (let i = 0; i < dotEls.length; i++) {
      const p = dotPos[i]; if (!p) continue;
      const px = p.x - sx, py = p.y - sy;
      if (px < 0 || px > vw || py < 0 || py > vh) continue;   // only on-screen points illuminate
      const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      if (dist >= rOut) ext.push({ th, d: dist, px, py });
      else if (dist < rIn) inn.push({ th, d: dist });
      if (dist <= R) {
        const t = Math.min(1, Math.max(0, (R - dist) / (0.22 * R)));
        interior.push({ x: px, y: py, w: t * t * (3 - 2 * t) });
      }
    }
    // turn the logo with scroll (no-slip roll down a wall on the right); the sign
    // is negated to spin the corrected direction
    rotRad = -sy / rOut;
    if (markEl) markEl.setAttribute("transform",
      `rotate(${(rotRad * 180 / Math.PI).toFixed(3)} 200 200) ${MARK_BASE}`);

    // the two boundary-illumination sequences over the uniform arc partition
    const toneOut = new Array(N), toneIn = new Array(N);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU;
      toneOut[k] = tone(outerIlluminance(a, ext, rOut));
      toneIn[k]  = tone(innerIlluminance(a, inn, rIn));
    }

    drawCast(ext, cx, cy, rOut);
    drawReflections(interior, { alphaOut: toneOut, alphaInner: toneIn, cx, cy, rOut, rIn,
      maxReach: 0.45 * thk,                          // reach trimmed 10% (flatter falloff)
      overshoot: 2.5 * scale });
    drawLetters(cx, cy, R, thk, toneOut, toneIn);
  }

  // Size every dot and pin the two hardcoded ones, in page coordinates. Each .pt
  // is centred on its left/top (CSS translate -50%). --pt is the perceived dot
  // DIAMETER (solid core to r, diffusion to zero at 2r) set so the centre dot's
  // perceived diameter is 95% of the b-to-b gap. Each dot's page-space centre is
  // cached here so draw() needs no per-frame layout reads.
  function layoutDots() {
    const c = circle();
    if (!c.R) return;
    const gapPx = 12.225 * KLOGO * c.scale;
    field.style.setProperty("--pt", (0.95 * gapPx).toFixed(1) + "px");
    centreDot.style.left = (c.cx + window.scrollX).toFixed(1) + "px";
    centreDot.style.top  = (c.cy + window.scrollY).toFixed(1) + "px";
    if (iSpan) {
      const r = iSpan.getBoundingClientRect();
      iDot.style.left = (r.left + window.scrollX + r.width / 2).toFixed(1) + "px";
      iDot.style.top  = (r.top + window.scrollY - r.height * 0.18).toFixed(1) + "px";
    }
    dotPos.length = 0;
    for (const dot of dotEls) {
      const r = dot.getBoundingClientRect();
      dotPos.push({ x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY });
    }
  }

  // Lay "WILLING TO WORK" out along the mid-radius arc: measure each letter's
  // advance and convert to an angular offset from the string centre. Offsets are
  // scale-free (advance ∝ font ∝ radius), so this runs once (re-run on font load).
  function layoutRingText() {
    if (!lctx) return;
    const Fref = 100, sp = Fref * 0.06;            // a probe size; letter spacing
    lctx.font = `bold ${Fref}px ${FAMILY}`;
    const w = chars.map(c => lctx.measureText(c).width);
    let total = 0; for (let i = 0; i < w.length; i++) { total += w[i]; if (i) total += sp; }
    const Rref = R_OVER_THK * (Fref / FONT_FRAC);  // the mid radius at this probe size
    letterOff = [];
    let cum = -total / 2;
    for (let i = 0; i < chars.length; i++) {
      letterOff.push((cum + w[i] / 2) / Rref);     // radians from the centre
      cum += w[i] + sp;
    }
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { sizeCanvas(); layoutDots(); schedule(); });

  function start() { sizeCanvas(); layoutDots(); layoutRingText(); draw(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { layoutRingText(); draw(); });
  requestAnimationFrame(draw);
  setTimeout(() => { layoutDots(); draw(); }, 300);
})();
