// jonatanbb.xyz — REFLECTIVE lighting of the page copy
// The site's illumination has two layers. The GLOWING layer is the atmospheric radial glow around a
// point, painted on the cast canvas out to r₋ and clipped out of the logo disc. This file is the
// other layer: REFLECTIVE light — the points actually shading the page ink gold, out to 2·r₋. It is
// deliberately independent of the logo (main.js hands it the point field un-gated, un-clipped), so a
// point just outside the annulus still shades nearby copy well inside it though its glow never enters.
// The illuminating points are the only light sources — gold copy stays gold but casts nothing.
//
// How: every word (and the section-rule bars) is rasterised into a coverage mask at its own PAGE
// rect — the mask covers the whole page and is uploaded once per reflow, scrolling only moves a
// shader uniform; a WebGL fragment shader reads edge normals from that coverage and shades each
// glyph ink→gold by how lit it is, ADDED over the real DOM text (which is never hidden — so it
// degrades to plain copy if a GPU ever drops the context, and section rules / links keep
// rendering). Word rects and baselines are taken from real font metrics and recached on any
// reflow (load / font / resize / zoom), so the gold stays registered with the text.
//
// Selection & click borrow the interaction idea: selecting text turns those words gold inside a
// hollow, sharp-cornered black outline (replacing the native highlight); clicking a word toggles it
// gold. Both golds are interaction light, so the master light (bulb) gates them: lights off, a click
// does nothing and a selection shows only the box. The gold is the word's own colour — it lights no
// neighbours (gold words as light sources was tried in iteration 22 and dropped in 23).
//
// The ignition pulse also lights this layer: the shader carries the wave's envelope (announcer ->
// front -> requiem, the same three circumferences the logo reads), so every masked pixel rises as
// the wave passes — raked from the i-dot's side, resolving to flat full gold at the front — and
// hands back to the steady point light as it drains.
(function () {
  "use strict";
  const API = window.LITAPI;
  if (!API) return;

  // ---------- WebGL ----------
  let gl = null, glcv = null, mcv = null, mc = null, tex = null, prog = null, glok = true, prepped = false;
  const uni = {}; let words = [], bars = [], tips = [], frames = [], icons = [], rules = [], lastKey = "";
  const MAXL = 24;   // shader light slots (the illuminating points, each reaching 2·r₋)
  const VERT = "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2((p.x+1.0)*0.5, (1.0-p.y)*0.5); gl_Position = vec4(p,0.0,1.0); }";
  const FRAG =
    // highp where available: the mask coords now span the whole PAGE (thousands of
    // px), and mediump's half-float ulp at that range is a visible fraction of a texel
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n" +
    "varying vec2 uv; uniform sampler2D tex; uniform vec2 res;" +
    "uniform vec2 lp[" + MAXL + "]; uniform float li[" + MAXL + "]; uniform float lr[" + MAXL + "]; uniform int ln;" +
    // the ignition wave: pc = i-dot (device px), pw = (front radius, lead, trail), pon = live
    "uniform vec2 pc; uniform vec3 pw; uniform int pon;" +
    // The mask texture holds the WHOLE PAGE, not the viewport: ts its device size,
    // so the live scroll (in mask px), kk the view->mask scale. Scrolling is just
    // these uniforms — no re-raster, no texture upload (that per-scroll upload was
    // the scroll stutter). Lights and the wave stay in viewport device px.
    "uniform vec2 ts; uniform vec2 so; uniform float kk;" +
    "void main(){" +
    "  vec2 px = uv * res;" +
    "  vec2 mp = (px * kk + so) / ts;" +
    "  float a = texture2D(tex, mp).a;" +
    "  if (a < 0.01) { gl_FragColor = vec4(0.0); return; }" +
    "  float e = 1.4;" +
    "  float ax = texture2D(tex, mp+vec2(e/ts.x,0.0)).a - texture2D(tex, mp-vec2(e/ts.x,0.0)).a;" +
    "  float ay = texture2D(tex, mp+vec2(0.0,e/ts.y)).a - texture2D(tex, mp-vec2(0.0,e/ts.y)).a;" +
    "  vec3 n = normalize(vec3(-ax, -ay, 0.85));" +
    "  float lit = 0.0;" +
    "  for (int k=0;k<" + MAXL + ";k++){ if(k>=ln) break;" +
    "    vec2 d = lp[k]-px; float dist=length(d); if(dist>lr[k]) continue;" +
    "    float fall = 1.0 - dist/lr[k]; fall*=fall;" +
    "    vec3 Ld = normalize(vec3(d, 60.0));" +
    "    float dif = max(dot(n, Ld), 0.0);" +
    "    float spec = pow(max(dot(reflect(-Ld, n), vec3(0.0,0.0,1.0)), 0.0), 16.0);" +
    "    lit += li[k]*fall*(1.2*dif + 1.5*spec);" +
    "  }" +
    // the wave's tent envelope by distance to the i-dot (rise announcer->front, drain to half
    // at the requiem, to zero a trail later). While rising, the light is RAKED from the i-dot's
    // direction; `rise` morphs it to a flat, direction-free full gold as the front lands (the
    // b elements' own treatment). Taken as max against the steady light, so the wave lifts each
    // piece over its resting glow and hands back as it leaves.
    "  if (pon == 1) {" +
    "    vec2 pd = pc - px; float x = pw.x - length(pd);" +
    "    float rise = clamp((x + pw.y) / pw.y, 0.0, 1.0);" +
    "    float env = x < 0.0 ? rise" +
    "              : x < pw.z ? 1.0 - 0.5 * x / pw.z" +
    "              : x < 2.0 * pw.z ? 0.5 - 0.5 * (x - pw.z) / pw.z : 0.0;" +
    "    if (env > 0.001) {" +
    "      vec3 Ld = normalize(vec3(pd, 60.0));" +
    "      float dif = max(dot(n, Ld), 0.0);" +
    "      float spec = pow(max(dot(reflect(-Ld, n), vec3(0.0,0.0,1.0)), 0.0), 16.0);" +
    "      float shape = min(1.2 * dif + 1.5 * spec, 1.0);" +
    "      lit = max(lit, env * mix(shape, 1.0, rise));" +
    "    }" +
    "  }" +
    "  lit = clamp(lit, 0.0, 1.0);" +
    // the lit colour warms through dark amber to the official gold #fad02a (the site's
    // gold&black mixing path, same stops as main.js HEAT), so half-lit ink reads warm
    "  vec3 gold = mix(vec3(0.620, 0.486, 0.110), vec3(0.980, 0.816, 0.165), lit);" +
    "  gl_FragColor = vec4(gold * lit * a, lit * a);" +   // gold added over the real text
    "}";
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn("reflect shader:", gl.getShaderInfoLog(s)); return s; }
  function initResources() {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, "p"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { glok = false; console.warn("reflect link:", gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["tex","res","lp","li","lr","ln","pc","pw","pon","ts","so","kk"]) uni[k] = gl.getUniformLocation(prog, k);
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    glcv.width = 0; lastKey = "";
  }
  function initGL() {
    glcv = document.createElement("canvas"); glcv.id = "reflect-gl"; document.body.appendChild(glcv);
    gl = glcv.getContext("webgl", { alpha: true });
    if (!gl) { glok = false; return; }
    glcv.addEventListener("webglcontextlost", e => e.preventDefault());          // allow restore
    glcv.addEventListener("webglcontextrestored", () => initResources());        // rebuild GPU objects
    mcv = document.createElement("canvas"); mc = mcv.getContext("2d");
    initResources();
  }

  // ---------- words, bars, robust baselines ----------
  // A visual word can span several spans (inline markup splits its text nodes —
  // "Barreiro" is Barre|i|ro around the i-dot anchor). Pieces not separated by
  // whitespace share one data-g group, so the word clicks and selects as a unit.
  let GID = 0;
  const groupOf = w => w.dataset.g
    ? document.querySelectorAll('.litw[data-g="' + w.dataset.g + '"]') : [w];
  // subtrees that never host reflective TEXT (decorative layers; svg is lit as
  // line-art icons instead; the skip link sits offscreen)
  const SKIP_SEL = ".points, .signet, .ring-letters, #reflect-selbox, .skip, svg, script, style";
  const blkCache = new WeakMap();
  function blockOf(el) {                 // the nearest non-inline ancestor
    let e = el;
    while (e && e !== document.body) {
      let d = blkCache.get(e);
      if (d === undefined) { d = getComputedStyle(e).display; blkCache.set(e, d); }
      if (d.indexOf("inline") !== 0) return e;
      e = e.parentElement;
    }
    return document.body;
  }
  // Wrap EVERY visible text node on the page — geometry over selectors, so
  // whatever copy the page grows stays reflective. Idempotent (already-wrapped
  // text is skipped), so an i18n refill just gets its fresh nodes wrapped on the
  // next prep.
  function wrapWords() {
    const texts = [], walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const p = n.parentElement;
        return n.nodeValue.trim() && p && !p.closest(SKIP_SEL) && !p.closest(".litw")
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    for (let n; (n = walk.nextNode()); ) texts.push(n);
    let group = 0, lastBlk = null;       // open group; whitespace or a new block closes it
    for (const t of texts) {
      const blk = blockOf(t.parentElement);
      if (blk !== lastBlk) { group = 0; lastBlk = blk; }
      const frag = document.createDocumentFragment();
      for (const part of t.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { group = 0; frag.appendChild(document.createTextNode(part)); }
        else {
          const s = document.createElement("span"); s.className = "litw"; s.textContent = part;
          s.dataset.g = group || (group = ++GID);
          frag.appendChild(s);
        }
      }
      t.parentNode.replaceChild(frag, t);
    }
  }
  function prep() {
    if (!gl && glok) initGL();
    if (!glok) return;
    wrapWords();
    const sx = scrollX, sy = scrollY; words = [];
    for (const s of document.querySelectorAll(".litw")) {
      const r = s.getBoundingClientRect(); if (r.width < 1) continue;
      const cs = getComputedStyle(s), fs = parseFloat(cs.fontSize);
      const caps = (cs.fontVariantCaps === "small-caps" || cs.fontVariant === "small-caps") ? "small-caps " : "";
      const font = cs.fontStyle + " " + caps + cs.fontWeight + " " + fs + "px " + cs.fontFamily;
      mc.font = font;
      const m = mc.measureText("Mg");           // real font metrics -> the alphabetic baseline within the line box
      const asc = m.fontBoundingBoxAscent || fs * 0.8, desc = m.fontBoundingBoxDescent || fs * 0.2;
      const base = { el: s, tt: cs.textTransform, font,
        ls: cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing,
        blk: blockOf(s),                        // block, for the reflective boxes
        cx: r.left + sx, cy: r.top + sy };      // the span's own rect — the sentinel reference
      const push = (text, f) => words.push(Object.assign({ text,
        w: f.right - f.left,                    // the DOM width the raster must land on
        px: f.left + sx, top: f.top + sy, bot: f.bottom + sy,   // page coords
        baseline: f.top + sy + (f.bottom - f.top) / 2 + (asc - desc) / 2 }, base));
      // A span can fragment across a line break (the breaker takes a dash mid-token as
      // a break point): the whole-span rect then smears both lines, so raster one entry
      // per line fragment, each with its own slice of the text at its own rect
      const rects = s.getClientRects();
      if (rects.length < 2) { push(s.textContent, r); continue; }
      const node = s.firstChild, range = document.createRange();
      let f = null, from = 0;
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i); range.setEnd(node, i + 1);
        const cr = range.getBoundingClientRect();
        if (cr.width < 0.01 && cr.height < 0.01) continue;
        if (f && Math.abs(cr.top - f.top) < cr.height / 2) {   // same line: extend
          f.left = Math.min(f.left, cr.left); f.right = Math.max(f.right, cr.right);
          f.top = Math.min(f.top, cr.top); f.bottom = Math.max(f.bottom, cr.bottom);
        } else {                                               // a new line begins at i
          if (f) push(node.data.slice(from, i), f);
          from = i; f = { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom };
        }
      }
      if (f) push(node.data.slice(from), f);
    }
    // The section rules (.kicker::after) are STRAIGHTENED b's (see styles.css): a bar
    // as thick as the b's ribbon with the b's top tip on each end (hook up left, hook
    // down right). Lit as three superimposed gold pieces — tip / bar / tip — hairline
    // seams between them, so the joints read subtly like the b's own middle joint.
    // Tip corners in b-primitive units of u = thickness/10.5 (from bb.svg's top tip).
    bars = []; tips = []; frames = []; icons = []; rules = [];
    const SEAM = 0.8;                    // the hairline left dark between ink pieces
    const BAR_DY = -0.075;               // nudge the bar up onto the name's midline (em; matches styles.css)
    for (const k of document.querySelectorAll(".kicker")) {
      const ws = k.querySelectorAll(".litw"); if (!ws.length) continue;
      const kr = k.getBoundingClientRect(), last = ws[ws.length - 1].getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(k).fontSize);
      // the bar sits .85em off the name (flex gap) and .85em short of the right edge
      // (its margin-right) — keep in step with .kicker in styles.css
      const xL = last.right + sx + 0.85 * fs, xR = kr.right + sx - 0.85 * fs;
      const T = 0.2875 * fs, u = T / 10.5;                   // ribbon thickness; tip unit
      const cY = kr.top + sy + kr.height / 2 + BAR_DY * fs;  // the bar's centreline, level with the name
      // the section rule is ink on its heading's line — feed its full extent (xL..xR,
      // past where the straight run is inset for the tips) in as a box, so the tight
      // segmentation groups it WITH the heading. Live geometry, no baked positions.
      rules.push({ x0: xL, y0: cY - T / 2, x1: xR, y1: cY + T / 2, blk: k });
      const tipL = 24.2734 * u;                              // apex -> joint plane
      if (xR - xL < 2 * tipL + 12) {                         // too narrow for tips: plain bar
        bars.push({ x: xL, y: cY - T / 2, w: xR - xL, h: T });
        continue;
      }
      tips.push([[xL, cY + 5.25*u], [xL + 21.6169*u, cY - 9.2189*u], [xL + tipL, cY - 5.25*u], [xL + tipL, cY + 5.25*u]]);
      tips.push([[xR, cY - 5.25*u], [xR - 21.6169*u, cY + 9.2189*u], [xR - tipL, cY + 5.25*u], [xR - tipL, cY - 5.25*u]]);
      bars.push({ x: xL + tipL + SEAM, y: cY - T / 2, w: xR - xL - 2 * (tipL + SEAM), h: T });
    }
    // The photo frame: the crossed-tips band (see frameGeom in main.js) — 4
    // straight runs, each profiled across the band like a section rule's body,
    // and the corner tip primitives (the over/under weave pieces, per the box's
    // data-frame mode), solid with hairline seams so the joints read like the b's.
    if (API.frameGeom) for (const ph of document.querySelectorAll(".about__photo")) {
      const T2 = parseFloat(getComputedStyle(ph).paddingTop) || 0;
      if (T2 < 2) continue;
      const r = ph.getBoundingClientRect(), x0 = r.left + sx + T2, y0 = r.top + sy + T2;
      const g = API.frameGeom(r.width - 2 * T2, r.height - 2 * T2, T2 / 2, SEAM, ph.dataset.frame);
      const off = pts => pts.map(p => [p[0] + x0, p[1] + y0]);
      for (const q of g.prims) tips.push(off(q));      // the corner primitives: solid, like the rules' tips
      for (const rn of g.runs) frames.push({ pts: off(rn.pts), grad: off(rn.grad) });
    }
    // Every line-art svg on the page (contact icons, the bulb, the language
    // pill — anything but the logo and the frame ink) is the b's own kind of
    // ink: rasterise its stroked shapes and its text so points and the pulse
    // light them too.
    for (const svg of document.querySelectorAll("svg")) {
      if (svg.closest(".signet") || svg.classList.contains("frame-svg")) continue;
      const r = svg.getBoundingClientRect(); if (r.width < 1) continue;
      const vb = svg.viewBox.baseVal, k = r.width / (vb && vb.width ? vb.width : r.width);
      const shapes = [];
      for (const el of svg.querySelectorAll("path, rect, line, circle, text")) {
        const cs = getComputedStyle(el);
        if (el.tagName === "text") {
          shapes.push({ kind: "text", str: el.textContent,
            x: parseFloat(el.getAttribute("x")) || 0, y: parseFloat(el.getAttribute("y")) || 0,
            font: cs.fontStyle + " " + cs.fontWeight + " " + parseFloat(cs.fontSize) + "px " + cs.fontFamily,
            mid: cs.textAnchor === "middle" });
          continue;
        }
        const sw = parseFloat(cs.strokeWidth) || 0;
        if (!sw || cs.stroke === "none") continue;
        const d = new Path2D();
        if (el.tagName === "path") d.addPath(new Path2D(el.getAttribute("d")));
        else if (el.tagName === "rect") {
          const x = +el.getAttribute("x") || 0, y = +el.getAttribute("y") || 0;
          const w2 = +el.getAttribute("width") || 0, h2 = +el.getAttribute("height") || 0;
          const rx = +el.getAttribute("rx") || 0;
          if (rx && d.roundRect) d.roundRect(x, y, w2, h2, rx); else d.rect(x, y, w2, h2);
        }
        else if (el.tagName === "line") { d.moveTo(+el.getAttribute("x1") || 0, +el.getAttribute("y1") || 0); d.lineTo(+el.getAttribute("x2") || 0, +el.getAttribute("y2") || 0); }
        else if (el.tagName === "circle") d.arc(+el.getAttribute("cx") || 0, +el.getAttribute("cy") || 0, +el.getAttribute("r") || 0, 0, 2 * Math.PI);
        shapes.push({ kind: "stroke", d, sw, ml: parseFloat(cs.strokeMiterlimit) || 4 });
      }
      if (shapes.length) icons.push({ x: r.left + sx, y: r.top + sy, k, w: r.width, h: r.height, shapes });
    }
    window.LITBOXES = buildBoxes(sx, sy);   // the tight page segmentation, kept for later use
    prepped = true;
    lastKey = "";   // a fresh cache always re-rasters — even if scroll/canvas look unchanged
  }

  // ---------- the reflective boxes: tight line groups (page segmentation) ----------
  // A tight bounding box per visual line group (window.LITBOXES, page coords). Nothing
  // consumes it right now (the cones that used to are gone), but it is deliberately kept
  // — the segmentation is sound and a near-future step will want it.
  // Words cluster into visual LINES (same vertical band, small gaps bridged even
  // across elements — a chips row reads as one line); lines then merge downward
  // only within the same block and only while the box stays TIGHT (a line that
  // would widen the box much starts a new one — the lede splits where its float
  // ends). A section rule is fed in as ink on its heading's line, so it joins that
  // box; the line-art svgs and the photo frames are boxes of their own. All from
  // live geometry each prep — no positions baked in, so it survives content edits.
  function buildBoxes(sx, sy) {
    const rows = [];
    const ink = words.map(w => ({ px: w.px, w: w.w, top: w.top, bot: w.bot, blk: w.blk }));
    for (const r of rules) ink.push({ px: r.x0, w: r.x1 - r.x0, top: r.y0, bot: r.y1, blk: r.blk });
    for (const w of ink) {
      const h = w.bot - w.top; if (h <= 0) continue;
      const R = rows.find(R =>
        Math.min(R.y1, w.bot) - Math.max(R.y0, w.top) > 0.55 * Math.min(h, R.y1 - R.y0) &&
        w.px - R.x1 < 1.6 * h && w.px - R.x1 > -8);
      if (R) {
        R.x1 = Math.max(R.x1, w.px + w.w);
        R.y0 = Math.min(R.y0, w.top); R.y1 = Math.max(R.y1, w.bot);
        R.blks.add(w.blk);
      } else rows.push({ x0: w.px, x1: w.px + w.w, y0: w.top, y1: w.bot, blks: new Set([w.blk]) });
    }
    rows.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
    const share = (A, B) => { for (const b of B.blks) if (A.blks.has(b)) return true; return false; };
    const boxes = [];
    for (const R of rows) {
      const B = boxes[boxes.length - 1], W = B ? B.x1 - B.x0 : 0;
      if (B && share(B, R) && R.y0 - B.y1 < 0.9 * (R.y1 - R.y0) &&
          R.x1 <= B.x1 + 0.18 * W && R.x0 >= B.x0 - 0.18 * W) {
        B.x0 = Math.min(B.x0, R.x0); B.x1 = Math.max(B.x1, R.x1); B.y1 = Math.max(B.y1, R.y1);
        for (const b of R.blks) B.blks.add(b);
      } else boxes.push(R);
    }
    const out = boxes.map(B => ({ x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1 }));
    for (const ic of icons) out.push({ x0: ic.x, y0: ic.y, x1: ic.x + ic.w, y1: ic.y + ic.h });
    for (const ph of document.querySelectorAll(".about__photo")) {
      const r = ph.getBoundingClientRect();
      if (r.width > 2) out.push({ x0: r.left + sx, y0: r.top + sy, x1: r.right + sx, y1: r.bottom + sy });
    }
    return out;
  }
  // Sentinels: three cached words re-measured against the live DOM. If any has moved,
  // the whole cache is stale — some reflow arrived without (or before) its event: a
  // browser zoom's settling, a restored scroll mid-load, a late image or font. Cheap
  // (three rect reads on an already-clean layout), self-healing within one frame.
  function cacheFresh() {
    if (!words.length) return true;
    const sx = scrollX, sy = scrollY;
    for (const i of [0, words.length >> 1, words.length - 1]) {
      const w = words[i], r = w.el.getBoundingClientRect();
      if (Math.abs(r.left + sx - w.cx) > 0.5 || Math.abs(r.top + sy - w.cy) > 0.5) return false;
    }
    return true;
  }
  function ensureSize() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (glcv.width !== W || glcv.height !== H) {
      glcv.width = W; glcv.height = H;
      gl.viewport(0, 0, W, H);
    }
    // the CSS size updates OUTSIDE the resize branch: a zoom can land the device
    // size back on the same backing (1920-wide window at 110%: round(1745.45×1.1)
    // = 1920) — the branch skips, and a stale CSS size would show the whole layer
    // scaled off the origin (the "name displaced" zoom capture)
    if (glcv.style.width !== innerWidth + "px" || glcv.style.height !== innerHeight + "px") {
      glcv.style.width = innerWidth + "px"; glcv.style.height = innerHeight + "px";
    }
    return dpr;
  }
  // The mask is rasterised over the WHOLE PAGE, once per reflow — not per scroll.
  // Scrolling then only moves a shader uniform: the old viewport mask re-drew every
  // word and re-uploaded ~2M device px to the GPU on every scrolled frame, which is
  // what kept the main thread late and the gold (and the cracks) trailing the page.
  // texDpr matches the view dpr but yields to MAX_TEXTURE_SIZE on very tall pages
  // (the gold softens rather than the layer breaking).
  let texDpr = 1, maxTex = 0;
  function raster(dpr, pw, ph) {
    if (!maxTex) maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    texDpr = Math.min(dpr, (maxTex - 2) / pw, (maxTex - 2) / ph);
    mcv.width = Math.max(1, Math.round(pw * texDpr));
    mcv.height = Math.max(1, Math.round(ph * texDpr));
    mc.setTransform(texDpr, 0, 0, texDpr, 0, 0);
    mc.textBaseline = "alphabetic"; mc.textAlign = "left"; mc.fillStyle = "#fff";
    const hasLS = "letterSpacing" in mc;
    for (const w of words) {
      mc.font = w.font;
      if (hasLS) mc.letterSpacing = w.ls;       // canvas ignores CSS letter-spacing unless told
      let txt = w.text;
      if (w.tt === "uppercase") txt = txt.toUpperCase();
      else if (w.tt === "lowercase") txt = txt.toLowerCase();
      else if (w.tt === "capitalize") txt = txt.replace(/\b\w/g, ch => ch.toUpperCase());
      // pin BOTH ends of the word to its DOM rect: whatever advance-width quirks remain
      // (spacing, small-caps, engine kerning), scale the raster onto the real width so the
      // gold can never drift along the word
      const tw = mc.measureText(txt).width;
      if (tw > 1 && Math.abs(tw - w.w) > 0.25) {
        mc.save(); mc.translate(w.px, w.baseline); mc.scale(w.w / tw, 1); mc.fillText(txt, 0, 0); mc.restore();
      } else mc.fillText(txt, w.px, w.baseline);
    }
    // Ink strokes are NOT flat rects (a flat interior reads as a dead plateau to the
    // normal-reading shader — only the edges would ever light) but profiled: full
    // coverage in the middle, soft shoulders at the long edges, so the shader sees
    // stroke-like normals along the whole piece and lights it like a glyph stem.
    const shoulders = g => {
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.28, "#fff");
      g.addColorStop(0.72, "#fff");             g.addColorStop(1, "rgba(255,255,255,0)");
      return g;
    };
    const poly = pts => {
      mc.beginPath();
      pts.forEach((p, i) => i ? mc.lineTo(p[0], p[1]) : mc.moveTo(p[0], p[1]));
      mc.closePath();
    };
    // the straight run of each section rule: profiled across its thickness, square ends
    for (const b of bars) {
      mc.fillStyle = shoulders(mc.createLinearGradient(0, b.y, 0, b.y + b.h));
      mc.fillRect(b.x, b.y, b.w, b.h);
    }
    // the rules' b-tips: solid ink pieces — their own sharp boundary carries the normals
    mc.fillStyle = "#fff";
    for (const t of tips) { poly(t); mc.fill(); }
    // profiled polygon pieces — the photo frame's bar runs, and the selection
    // outline's mitre-cut sides — each lit across its own thickness
    const profiled = f => {
      mc.fillStyle = shoulders(mc.createLinearGradient(
        f.grad[0][0], f.grad[0][1], f.grad[1][0], f.grad[1][1]));
      poly(f.pts); mc.fill();
    };
    for (const f of frames) profiled(f);
    for (const f of selPieces) profiled(f);
    // the line-art svgs: their own ink, stroked (or text-filled) at their size
    mc.strokeStyle = "#fff"; mc.lineJoin = "miter"; mc.lineCap = "butt";
    for (const ic of icons) {
      mc.save(); mc.translate(ic.x, ic.y); mc.scale(ic.k, ic.k);
      for (const s of ic.shapes) {
        if (s.kind === "stroke") { mc.lineWidth = s.sw; mc.miterLimit = s.ml; mc.stroke(s.d); }
        else { mc.font = s.font; mc.textAlign = s.mid ? "center" : "left"; mc.fillText(s.str, s.x, s.y); }
      }
      mc.restore();
    }
    mc.fillStyle = "#fff";
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mcv);
  }
  window.TEXT_LIGHT = function (lights, f) {
    if (!prepped || !cacheFresh()) prep();
    if (!glok || gl.isContextLost()) return;
    const dpr = ensureSize();
    // The key carries the layout world, NOT the scroll: page size, zoom state
    // (dpr + CSS viewport — zooming in and back out can land on the SAME canvas
    // size with a different world underneath, the proportional gold drift of the
    // zoom captures). Scroll rides the shader uniforms below; a re-raster only
    // happens when the page itself changes.
    const pw = document.documentElement.scrollWidth, ph = document.documentElement.scrollHeight;
    const key = pw + ":" + ph + ":" + glcv.width + ":" + glcv.height + ":" + dpr + ":" + innerWidth;
    if (key !== lastKey) { raster(dpr, pw, ph); lastKey = key; }
    // the light list the shader reads: the point field, each reaching its passed r (2·r₋).
    // The illuminating points are the only reflective light sources — gold words no longer
    // light their neighbours (they stay gold as copy, but cast nothing).
    const src = [];
    for (const L of lights) src.push({ x: L.x, y: L.y, r: L.r, i: L.i });
    const n = Math.min(MAXL, src.length), lp = new Float32Array(MAXL * 2), li = new Float32Array(MAXL), lr = new Float32Array(MAXL);
    for (let k = 0; k < n; k++) { lp[k*2] = src[k].x*dpr; lp[k*2+1] = src[k].y*dpr; li[k] = src[k].i; lr[k] = src[k].r*dpr; }
    gl.useProgram(prog);
    gl.uniform2f(uni.res, glcv.width, glcv.height);
    gl.uniform2fv(uni.lp, lp); gl.uniform1fv(uni.li, li); gl.uniform1fv(uni.lr, lr); gl.uniform1i(uni.ln, n);
    if (f.pulse) {           // the ignition wave, from main.js while it travels
      gl.uniform2f(uni.pc, f.pulse.x * dpr, f.pulse.y * dpr);
      gl.uniform3f(uni.pw, f.pulse.R * dpr,
        Math.max(1, f.pulse.lead * dpr), Math.max(1, f.pulse.trail * dpr));
      gl.uniform1i(uni.pon, 1);
    } else gl.uniform1i(uni.pon, 0);
    // where the page-space mask sits under this viewport: its size, the scroll
    // (in mask px) and the view->mask scale — all the scrolling ever touches
    gl.uniform2f(uni.ts, mcv.width, mcv.height);
    gl.uniform2f(uni.so, f.sx * texDpr, f.sy * texDpr);
    gl.uniform1f(uni.kk, texDpr / dpr);
    gl.uniform1i(uni.tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ---------- selection & click: turn words gold, hollow black outline ----------
  // The gold is interaction-layer light, so it wears a class the lights-off CSS can
  // mute; with the master light off a click toggles nothing at all.
  const clicked = new Set(); let selected = new Set(); let selOverlay = null;
  let selPieces = [];         // the outline's lit pieces, page coords — rasterised as ink too
  const lightsOff = () => document.body.classList.contains("lights-off");
  function applyHighlights() {
    for (const s of document.querySelectorAll(".litw"))
      s.classList.toggle("goldw", clicked.has(s) || selected.has(s));
  }
  document.addEventListener("click", e => {
    if (lightsOff()) return;                          // gold-on-click is illumination
    const w = e.target.closest && e.target.closest(".litw");
    if (!w || (e.target.closest && e.target.closest("a")) || !getSelection().isCollapsed) return;
    const on = !clicked.has(w);                       // the whole word toggles together
    for (const m of groupOf(w)) on ? clicked.add(m) : clicked.delete(m);
    applyHighlights();
  });
  let selRAF = 0;
  document.addEventListener("selectionchange", () => { if (!selRAF) selRAF = requestAnimationFrame(() => { selRAF = 0; updateSelection(); }); });
  function updateSelection() {
    if (!selOverlay) { selOverlay = document.createElement("div"); selOverlay.id = "reflect-selbox"; document.body.appendChild(selOverlay); }
    const sel = getSelection(); selected = new Set(); selOverlay.textContent = ""; selPieces = [];
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      for (const s of document.querySelectorAll(".litw")) if (range.intersectsNode(s)) selected.add(s);
      for (const s of [...selected]) for (const m of groupOf(s)) selected.add(m);   // whole words go gold
      const sx = scrollX, sy = scrollY, lines = [];
      for (const r of range.getClientRects()) {           // one box per line
        if (r.width < 1 || r.height < 1) continue;
        const g = lines.find(L => Math.abs(L.top - r.top) < 4 && Math.abs(L.bottom - r.bottom) < 6);
        if (g) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right); g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
        else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
      lines.sort((a, b) => a.top - b.top);
      // Only the selection's overall beginning and end are CLOSED (a side stroke with
      // mitre-cut corners); where the stroke continues on the next line the end stays
      // OPEN — no side, the top/bottom strokes running a little past the text to say
      // so. Sharp corners throughout (roundedness is the annulus' and the points').
      const t = 3, g = 0.8;                               // stroke thickness; corner seam
      lines.forEach((L, i) => {
        const closedL = i === 0, closedR = i === lines.length - 1;
        const ext = Math.round((L.bottom - L.top) * 0.35);         // the open-end run-past
        const x = L.left + sx - (closedL ? t : ext);
        const xr = L.right + sx + (closedR ? t : ext);
        const y = L.top + sy - 1, y1 = L.bottom + sy + 1;
        const d = document.createElement("div"); d.className = "reflect-selrect";
        d.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + (xr - x) +
          "px;height:" + (y1 - y) + "px;" +
          (closedL ? "" : "border-left:0;") + (closedR ? "" : "border-right:0;");
        selOverlay.appendChild(d);
        // the lit pieces, in the photo frame's schematic: mitre cuts + hairline seams
        // at the closed corners, square open ends
        selPieces.push(
          { pts: [[x + (closedL ? g : 0), y], [xr - (closedR ? g : 0), y],
                  [xr - (closedR ? t + g : 0), y + t], [x + (closedL ? t + g : 0), y + t]],
            grad: [[x, y], [x, y + t]] },
          { pts: [[x + (closedL ? g : 0), y1], [x + (closedL ? t + g : 0), y1 - t],
                  [xr - (closedR ? t + g : 0), y1 - t], [xr - (closedR ? g : 0), y1]],
            grad: [[x, y1], [x, y1 - t]] });
        if (closedL) selPieces.push(
          { pts: [[x, y + g], [x + t, y + t + g], [x + t, y1 - t - g], [x, y1 - g]],
            grad: [[x, y], [x + t, y]] });
        if (closedR) selPieces.push(
          { pts: [[xr, y + g], [xr, y1 - g], [xr - t, y1 - t - g], [xr - t, y + t + g]],
            grad: [[xr, y], [xr - t, y]] });
      });
    }
    applyHighlights();
    lastKey = "";                                       // the outline is part of the mask now
    window.dispatchEvent(new Event("scroll"));          // ask main.js for a lighting frame
  }

  // ---------- recache on any reflow, so the gold stays registered ----------
  const reprep = () => { prepped = false; };
  // A browser zoom fires a burst of resizes while layout is still settling, and rects
  // read mid-burst can be a fraction stale — so besides the immediate recache, take a
  // second one once the burst has quieted (and ask for a frame to repaint from it).
  let settleT = 0;
  const reprepSettle = () => {
    reprep();
    clearTimeout(settleT);
    settleT = setTimeout(() => { reprep(); window.dispatchEvent(new Event("scroll")); }, 150);
  };
  window.addEventListener("litrelayout", reprep);
  window.addEventListener("resize", reprepSettle);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", reprepSettle);   // browser zoom
  // a late font swap reflows the text without a resize — recache AND repaint
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { reprep(); window.dispatchEvent(new Event("scroll")); });
})();
