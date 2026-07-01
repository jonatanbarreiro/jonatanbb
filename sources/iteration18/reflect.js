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
// hollow, corner-rounded black outline (replacing the native highlight); clicking a word toggles it
// gold. (Gold words behaving as light sources is a later milestone.)
(function () {
  "use strict";
  const API = window.LITAPI;
  if (!API) return;
  const F_SEL = API.TEXT_SEL;
  const GOLD = "#fad02a";

  // ---------- WebGL ----------
  let gl = null, glcv = null, mcv = null, mc = null, tex = null, prog = null, glok = true, prepped = false;
  const uni = {}; let words = [], bars = [], lastKey = "";
  const VERT = "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2((p.x+1.0)*0.5, (1.0-p.y)*0.5); gl_Position = vec4(p,0.0,1.0); }";
  const FRAG =
    "precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform vec2 res;" +
    "uniform vec2 lp[8]; uniform float li[8]; uniform float lr[8]; uniform int ln;" +
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
    "  lit = clamp(lit, 0.0, 1.0);" +
    "  vec3 gold = vec3(1.0, 0.82, 0.26);" +
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
    for (const k of ["tex","res","lp","li","lr","ln"]) uni[k] = gl.getUniformLocation(prog, k);
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
  function wrapWords(el) {
    if (el.dataset.litWrapped) return;
    const texts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    for (let n; (n = walk.nextNode()); ) if (n.nodeValue.trim()) texts.push(n);
    for (const t of texts) {
      const frag = document.createDocumentFragment();
      for (const part of t.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else { const s = document.createElement("span"); s.className = "litw"; s.textContent = part; frag.appendChild(s); }
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
      words.push({ text: s.textContent, tt: cs.textTransform, font,
        px: r.left + sx, baseline: r.top + sy + r.height / 2 + (asc - desc) / 2 });
    }
    // the section-rule bars (.kicker::after): rasterise a rect so they light like text
    bars = [];
    for (const k of document.querySelectorAll(".kicker")) {
      const ws = k.querySelectorAll(".litw"); if (!ws.length) continue;
      const kr = k.getBoundingClientRect(), last = ws[ws.length - 1].getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(k).fontSize);
      const left = last.right + sx + 0.4 * fs, right = kr.right + sx, barH = 0.24 * fs;
      const yTop = kr.top + sy + kr.height / 2 + 0.04 * fs - barH / 2;
      if (right - left > 4) bars.push({ x: left, y: yTop, w: right - left, h: barH });
    }
    prepped = true;
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
    for (const w of words) {
      const yb = w.baseline - sy; if (yb < -30 || yb > innerHeight + 30) continue;
      mc.font = w.font;
      let txt = w.text;
      if (w.tt === "uppercase") txt = txt.toUpperCase();
      else if (w.tt === "lowercase") txt = txt.toLowerCase();
      else if (w.tt === "capitalize") txt = txt.replace(/\b\w/g, ch => ch.toUpperCase());
      mc.fillText(txt, w.px - sx, yb);
    }
    for (const b of bars) { const y = b.y - sy; if (y < -20 || y > innerHeight + 20) continue; mc.fillRect(b.x - sx, y, b.w, b.h); }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mcv);
  }
  window.TEXT_LIGHT = function (lights, f) {
    if (!prepped) prep();
    if (!glok || gl.isContextLost()) return;
    const dpr = ensureSize();
    const key = f.sx + ":" + f.sy + ":" + glcv.width + ":" + glcv.height;
    if (key !== lastKey) { raster(dpr, f.sx, f.sy); lastKey = key; }
    const n = Math.min(8, lights.length), lp = new Float32Array(16), li = new Float32Array(8), lr = new Float32Array(8);
    for (let k = 0; k < n; k++) { lp[k*2] = lights[k].x*dpr; lp[k*2+1] = lights[k].y*dpr; li[k] = lights[k].i; lr[k] = lights[k].r*dpr*2; }
    gl.useProgram(prog);
    gl.uniform2f(uni.res, glcv.width, glcv.height);
    gl.uniform2fv(uni.lp, lp); gl.uniform1fv(uni.li, li); gl.uniform1fv(uni.lr, lr); gl.uniform1i(uni.ln, n);
    gl.uniform1i(uni.tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ---------- selection & click: turn words gold, hollow black outline ----------
  const clicked = new Set(); let selected = new Set(); let selOverlay = null;
  function setGold(el, on) {
    if (on && !el._gold) { el.style.color = GOLD; el._gold = true; }
    else if (!on && el._gold) { el.style.color = ""; el._gold = false; }
  }
  function applyHighlights() { for (const s of document.querySelectorAll(".litw")) setGold(s, clicked.has(s) || selected.has(s)); }
  document.addEventListener("click", e => {
    const w = e.target.closest && e.target.closest(".litw");
    if (!w || (e.target.closest && e.target.closest("a")) || !getSelection().isCollapsed) return;
    if (clicked.has(w)) clicked.delete(w); else clicked.add(w);
    applyHighlights();
  });
  let selRAF = 0;
  document.addEventListener("selectionchange", () => { if (!selRAF) selRAF = requestAnimationFrame(() => { selRAF = 0; updateSelection(); }); });
  function updateSelection() {
    if (!selOverlay) { selOverlay = document.createElement("div"); selOverlay.id = "reflect-selbox"; document.body.appendChild(selOverlay); }
    const sel = getSelection(); selected = new Set(); selOverlay.textContent = "";
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      for (const s of document.querySelectorAll(".litw")) if (range.intersectsNode(s)) selected.add(s);
      const sx = scrollX, sy = scrollY, lines = [];
      for (const r of range.getClientRects()) {           // one rounded box per line
        if (r.width < 1 || r.height < 1) continue;
        const g = lines.find(L => Math.abs(L.top - r.top) < 4 && Math.abs(L.bottom - r.bottom) < 6);
        if (g) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right); g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
        else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
      for (const L of lines) {
        const d = document.createElement("div"); d.className = "reflect-selrect";
        d.style.cssText = "left:" + (L.left + sx - 3) + "px;top:" + (L.top + sy - 1) + "px;width:" + (L.right - L.left + 6) + "px;height:" + (L.bottom - L.top + 2) + "px;";
        selOverlay.appendChild(d);
      }
    }
    applyHighlights();
  }

  // ---------- recache on any reflow, so the gold stays registered ----------
  const reprep = () => { prepped = false; };
  window.addEventListener("litrelayout", reprep);
  window.addEventListener("resize", reprep);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", reprep);   // browser zoom
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reprep);
})();
