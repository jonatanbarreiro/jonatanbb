// jonatanbb.xyz — REFLECTIVE lighting of the page copy
// The site's illumination has two layers. The GLOWING layer (the radial glow, the cones onto the
// annulus) is the atmospheric light around a point; the logo occludes it. This file is the other
// layer: REFLECTIVE light — the illuminating points actually lighting the page text. It is
// deliberately independent of the logo (main.js hands it the point field un-gated), so a point near
// the logo still lights nearby copy.
//
// How: every word (and the section-rule bars) is rasterised into a coverage mask at its own screen
// rect; a WebGL fragment shader reads edge normals from that coverage and shades each glyph ink→gold
// by how lit it is, ADDED over the real DOM text (which is never hidden — so it degrades to plain
// copy if a GPU ever drops the context, and section rules / links keep rendering). Word rects and
// baselines are taken from real font metrics and recached on any reflow (load / font / resize / zoom),
// so the gold stays registered with the text.
//
// Selection & click borrow the interaction idea: selecting text turns those words gold inside a
// hollow, sharp-cornered black outline (replacing the native highlight); clicking a word toggles it
// gold. Both golds are illumination, so the master light (bulb) gates them: lights off, a click does
// nothing and a selection shows only the box. (Gold words as light sources is a later milestone.)
//
// The ignition pulse also lights this layer: the shader carries the wave's envelope (announcer ->
// front -> requiem, the same three circumferences the logo reads), so every masked pixel rises as
// the wave passes — raked from the i-dot's side, resolving to flat full gold at the front — and
// hands back to the steady point light as it drains.
(function () {
  "use strict";
  const API = window.LITAPI;
  if (!API) return;
  const F_SEL = API.TEXT_SEL;   // clicked/selected words go --gold via the .goldw class (styles.css)

  // ---------- WebGL ----------
  let gl = null, glcv = null, mcv = null, mc = null, tex = null, prog = null, glok = true, prepped = false;
  const uni = {}; let words = [], bars = [], tips = [], frames = [], icons = [], lastKey = "";
  const VERT = "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2((p.x+1.0)*0.5, (1.0-p.y)*0.5); gl_Position = vec4(p,0.0,1.0); }";
  const FRAG =
    "precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform vec2 res;" +
    "uniform vec2 lp[8]; uniform float li[8]; uniform float lr[8]; uniform int ln;" +
    // the ignition wave: pc = i-dot (device px), pw = (front radius, lead, trail), pon = live
    "uniform vec2 pc; uniform vec3 pw; uniform int pon;" +
    "void main(){" +
    "  float a = texture2D(tex, uv).a;" +
    "  if (a < 0.01) { gl_FragColor = vec4(0.0); return; }" +
    "  vec2 px = uv * res;" +
    "  float e = 1.4;" +
    "  float ax = texture2D(tex, uv+vec2(e/res.x,0.0)).a - texture2D(tex, uv-vec2(e/res.x,0.0)).a;" +
    "  float ay = texture2D(tex, uv+vec2(0.0,e/res.y)).a - texture2D(tex, uv-vec2(0.0,e/res.y)).a;" +
    "  vec3 n = normalize(vec3(-ax, -ay, 0.85));" +
    "  float lit = 0.0;" +
    "  for (int k=0;k<8;k++){ if(k>=ln) break;" +
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
    for (const k of ["tex","res","lp","li","lr","ln","pc","pw","pon"]) uni[k] = gl.getUniformLocation(prog, k);
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
  function wrapWords(el) {
    if (el.dataset.litWrapped) return;
    const texts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    for (let n; (n = walk.nextNode()); ) if (n.nodeValue.trim()) texts.push(n);
    let group = 0;                       // open group; whitespace closes it
    for (const t of texts) {
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
    el.dataset.litWrapped = "1";
  }
  function prep() {
    if (!gl && glok) initGL();
    if (!glok) return;
    for (const el of document.querySelectorAll(F_SEL)) wrapWords(el);
    const sx = scrollX, sy = scrollY; words = [];
    for (const s of document.querySelectorAll(".litw")) {
      const r = s.getBoundingClientRect(); if (r.width < 1) continue;
      const cs = getComputedStyle(s), fs = parseFloat(cs.fontSize);
      const caps = (cs.fontVariantCaps === "small-caps" || cs.fontVariant === "small-caps") ? "small-caps " : "";
      const font = cs.fontStyle + " " + caps + cs.fontWeight + " " + fs + "px " + cs.fontFamily;
      mc.font = font;
      const m = mc.measureText("Mg");           // real font metrics -> the alphabetic baseline within the line box
      const asc = m.fontBoundingBoxAscent || fs * 0.8, desc = m.fontBoundingBoxDescent || fs * 0.2;
      words.push({ el: s, text: s.textContent, tt: cs.textTransform, font,
        ls: cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing,
        w: r.width,                             // the DOM width the raster must land on
        px: r.left + sx, top: r.top + sy,       // page coords; top doubles as the sentinel reference
        baseline: r.top + sy + r.height / 2 + (asc - desc) / 2 });
    }
    // The section rules (.kicker::after) are STRAIGHTENED b's (see styles.css): a bar
    // as thick as the b's ribbon with the b's top tip on each end (hook up left, hook
    // down right). Lit as three superimposed gold pieces — tip / bar / tip — hairline
    // seams between them, so the joints read subtly like the b's own middle joint.
    // Tip corners in b-primitive units of u = thickness/10.5 (from bb.svg's top tip).
    bars = []; tips = []; frames = []; icons = [];
    const SEAM = 0.8;                    // the hairline left dark between ink pieces
    for (const k of document.querySelectorAll(".kicker")) {
      const ws = k.querySelectorAll(".litw"); if (!ws.length) continue;
      const kr = k.getBoundingClientRect(), last = ws[ws.length - 1].getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(k).fontSize);
      // the bar sits .85em off the name (flex gap) and .85em short of the right edge
      // (its margin-right) — keep in step with .kicker in styles.css
      const xL = last.right + sx + 0.85 * fs, xR = kr.right + sx - 0.85 * fs;
      const T = 0.2875 * fs, u = T / 10.5;                   // ribbon thickness; tip unit
      const cY = kr.top + sy + kr.height / 2 + 0.16 * fs;    // the bar's centreline (the ::after translateY)
      const tipL = 24.2734 * u;                              // apex -> joint plane
      if (xR - xL < 2 * tipL + 12) {                         // too narrow for tips: plain bar
        bars.push({ x: xL, y: cY - T / 2, w: xR - xL, h: T });
        continue;
      }
      tips.push([[xL, cY + 5.25*u], [xL + 21.6169*u, cY - 9.2189*u], [xL + tipL, cY - 5.25*u], [xL + tipL, cY + 5.25*u]]);
      tips.push([[xR, cY - 5.25*u], [xR - 21.6169*u, cY + 9.2189*u], [xR - tipL, cY + 5.25*u], [xR - tipL, cY - 5.25*u]]);
      bars.push({ x: xL + tipL + SEAM, y: cY - T / 2, w: xR - xL - 2 * (tipL + SEAM), h: T });
    }
    // The photo frame: the hooked-bar band (see frameGeom in main.js), lit by
    // Jonatan's own dissection — 4 straight runs, each profiled across the whole
    // band like a section rule's body, and 8 solid corner primitives (the paired
    // hook-end 7-gons), hairline seams between runs and primitives and along each
    // corner's 45° diagonal, so the joints read like the b's.
    if (API.frameGeom) for (const ph of document.querySelectorAll(".about__photo")) {
      const T2 = parseFloat(getComputedStyle(ph).paddingTop) || 0;
      if (T2 < 2) continue;
      const r = ph.getBoundingClientRect(), x0 = r.left + sx + T2, y0 = r.top + sy + T2;
      const g = API.frameGeom(r.width - 2 * T2, r.height - 2 * T2, T2 / 2, SEAM);
      const off = pts => pts.map(p => [p[0] + x0, p[1] + y0]);
      for (const q of g.prims) tips.push(off(q));      // the corner primitives: solid, like the rules' tips
      for (const rn of g.runs) frames.push({ pts: off(rn.pts), grad: off(rn.grad) });
    }
    // The contact icons are the same line-art ink as the b's — rasterise their SVG
    // paths (stroked at their own width) so points and the pulse light them too.
    for (const svg of document.querySelectorAll(".contact__icon svg")) {
      const r = svg.getBoundingClientRect(); if (r.width < 1) continue;
      const vb = svg.viewBox.baseVal, k = r.width / (vb && vb.width ? vb.width : 24);
      icons.push({ x: r.left + sx, y: r.top + sy, k, h: r.height,
        sw: parseFloat(svg.getAttribute("stroke-width")) || 1.5,
        ml: parseFloat(svg.getAttribute("stroke-miterlimit")) || 4,
        paths: [...svg.querySelectorAll("path")].map(p => new Path2D(p.getAttribute("d"))) });
    }
    prepped = true;
    lastKey = "";   // a fresh cache always re-rasters — even if scroll/canvas look unchanged
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
      if (Math.abs(r.left + sx - w.px) > 0.5 || Math.abs(r.top + sy - w.top) > 0.5) return false;
    }
    return true;
  }
  function ensureSize() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (glcv.width !== W || glcv.height !== H) {
      glcv.width = W; glcv.height = H; mcv.width = W; mcv.height = H;
      glcv.style.width = innerWidth + "px"; glcv.style.height = innerHeight + "px"; gl.viewport(0, 0, W, H);
    }
    return dpr;
  }
  function raster(dpr, sx, sy) {
    mc.setTransform(dpr, 0, 0, dpr, 0, 0); mc.clearRect(0, 0, innerWidth, innerHeight);
    mc.textBaseline = "alphabetic"; mc.textAlign = "left"; mc.fillStyle = "#fff";
    const hasLS = "letterSpacing" in mc;
    for (const w of words) {
      const yb = w.baseline - sy; if (yb < -30 || yb > innerHeight + 30) continue;
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
        mc.save(); mc.translate(w.px - sx, yb); mc.scale(w.w / tw, 1); mc.fillText(txt, 0, 0); mc.restore();
      } else mc.fillText(txt, w.px - sx, yb);
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
      pts.forEach((p, i) => i ? mc.lineTo(p[0] - sx, p[1] - sy) : mc.moveTo(p[0] - sx, p[1] - sy));
      mc.closePath();
    };
    // the straight run of each section rule: profiled across its thickness, square ends
    for (const b of bars) {
      const y = b.y - sy; if (y + b.h < -20 || y > innerHeight + 20) continue;
      mc.fillStyle = shoulders(mc.createLinearGradient(0, y, 0, y + b.h));
      mc.fillRect(b.x - sx, y, b.w, b.h);
    }
    // the rules' b-tips: solid ink pieces — their own sharp boundary carries the normals
    mc.fillStyle = "#fff";
    for (const t of tips) {
      const y = t[1][1] - sy; if (y < -40 || y > innerHeight + 40) continue;
      poly(t); mc.fill();
    }
    // profiled polygon pieces — the photo frame's bar runs, and the selection
    // outline's mitre-cut sides — each lit across its own thickness
    const profiled = f => {
      const ys = f.pts.map(p => p[1]);
      const y0 = Math.min(...ys) - sy, y1 = Math.max(...ys) - sy;
      if (y1 < -20 || y0 > innerHeight + 20) return;
      mc.fillStyle = shoulders(mc.createLinearGradient(
        f.grad[0][0] - sx, f.grad[0][1] - sy, f.grad[1][0] - sx, f.grad[1][1] - sy));
      poly(f.pts); mc.fill();
    };
    for (const f of frames) profiled(f);
    for (const f of selPieces) profiled(f);
    // the contact icons: their own line-art, stroked at their SVG width
    mc.strokeStyle = "#fff"; mc.lineJoin = "miter"; mc.lineCap = "butt";
    for (const ic of icons) {
      const y = ic.y - sy; if (y > innerHeight + 20 || y + ic.h < -20) continue;
      mc.save(); mc.translate(ic.x - sx, y); mc.scale(ic.k, ic.k);
      mc.lineWidth = ic.sw; mc.miterLimit = ic.ml;
      for (const p of ic.paths) mc.stroke(p);
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
    // the key carries the zoom state too (dpr + CSS viewport): zooming in and back
    // out can land on the SAME canvas size with a different world underneath, and
    // a raster drawn at one zoom shown at another is scaled off the origin — the
    // proportional right-and-down gold drift of the zoom captures
    const key = f.sx + ":" + f.sy + ":" + glcv.width + ":" + glcv.height + ":" + dpr + ":" + innerWidth;
    if (key !== lastKey) { raster(dpr, f.sx, f.sy); lastKey = key; }
    const n = Math.min(8, lights.length), lp = new Float32Array(16), li = new Float32Array(8), lr = new Float32Array(8);
    for (let k = 0; k < n; k++) { lp[k*2] = lights[k].x*dpr; lp[k*2+1] = lights[k].y*dpr; li[k] = lights[k].i; lr[k] = lights[k].r*dpr*2; }
    gl.useProgram(prog);
    gl.uniform2f(uni.res, glcv.width, glcv.height);
    gl.uniform2fv(uni.lp, lp); gl.uniform1fv(uni.li, li); gl.uniform1fv(uni.lr, lr); gl.uniform1i(uni.ln, n);
    if (f.pulse) {           // the ignition wave, from main.js while it travels
      gl.uniform2f(uni.pc, f.pulse.x * dpr, f.pulse.y * dpr);
      gl.uniform3f(uni.pw, f.pulse.R * dpr,
        Math.max(1, f.pulse.lead * dpr), Math.max(1, f.pulse.trail * dpr));
      gl.uniform1i(uni.pon, 1);
    } else gl.uniform1i(uni.pon, 0);
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
