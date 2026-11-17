// jonatanbb.xyz, sketch 2: the lattice.
// The placeholder grown up: the signet wired to six nodes on a hexagon, on a triangular lattice. Code runs
// along the lattice in its six directions rather than falling one way, and where it settles it leaves an
// equation, in the handwriting of the notebooks. Each node is a lens that already shows its project.
(() => {
const canvas = document.getElementById('field'), ctx = canvas.getContext('2d');
const net = document.getElementById('net'), readout = document.getElementById('readout');
const INK = '28,26,22', MONO = '"DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace';
const GLYPHS = '0123456789012345678901234567890123456789∑∏∫∂∇λζΓπ∞∈≤';
const STEP = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];          // the six ways to move on the lattice
const SQ3 = Math.sqrt(3) / 2;

let W, H, dpr, cx, cy, R, g, backdrop, portrait;
const at = (i, j) => [cx + g * (i + j / 2), cy + g * j * SQ3];

// ---------- the network: signet at the centre, six lenses on the hexagon
net.innerHTML = `<div id="signet"><svg viewBox="${BB.viewBox}"><path d="${BB.svgPath('bb')}" fill="currentColor" fill-rule="evenodd"/></svg></div>`;
const signet = net.firstChild;
let active = -1, hovered = -1e9;
const open = (i) => { active = i; nodes.forEach((n, k) => n.el.classList.toggle('active', k === i)); };
const nodes = NODES.map((n, i) => {
  const el = document.createElement('a');
  el.className = 'node' + (n.warm ? ' warm' : ''); el.href = n.href;
  el.innerHTML = `<span class="lens"><span class="mini"></span></span><span class="tag"><b>${n.name}</b><small>${n.data}</small><em>${n.line}</em></span>`;
  MINI[n.id](el.querySelector('.mini'));
  el.addEventListener('mouseenter', () => { hovered = performance.now(); open(i); });
  net.appendChild(el);
  return { ...n, el, a: [-120, -60, 0, 60, 120, 180][i] * Math.PI / 180, pulses: [Math.random(), Math.random() + 0.5] };
});

// ---------- the fixed points: corners where the code settles into a formula
const SHELF = Object.keys(EQ), inks = {};
const slots = [0, 1, 2, 3].map((k) => ({ k, clock: -3 - k * 3.4, turn: k, img: null }));
const place = () => {
  const m = Math.max(40, W * 0.06), w = Math.min(430, W * 0.3), h = 84;
  const boxes = portrait ? [[m, H - h - 30, W - 2 * m, h]] : [[m, 44, w, h], [W - m - w * 0.8, H - 24 - 58, w * 0.8, 58], [m, H - 60 - h, w, h], [W - m - 170, 78, 170, 56]];
  slots.forEach((s, k) => { s.box = boxes[k] || null; });
};
const settle = (s) => {
  const name = SHELF[s.turn % SHELF.length]; s.turn += slots.length;
  (inks[name] || (inks[name] = loadEq(name, [28, 26, 22]))).then((img) => { s.img = img; });
};

// ---------- geometry, and everything that does not move, drawn once
const resize = () => {
  dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; portrait = W < H;
  canvas.width = W * dpr; canvas.height = H * dpr;
  cx = portrait ? W / 2 : W * 0.64; cy = portrait ? H * 0.6 : H * 0.49;
  R = portrait ? W * 0.34 : Math.min(H * 0.33, W * 0.215); g = R / 12;
  const r = portrait ? R * 0.2 : R * 0.2;
  signet.style.cssText = `left:${cx}px;top:${cy}px;width:${R * 0.56}px;height:${R * 0.56}px`;
  nodes.forEach((n) => {
    n.x = cx + R * Math.cos(n.a); n.y = cy + R * Math.sin(n.a); n.r = r;
    n.el.style.cssText = `left:${n.x}px;top:${n.y}px;--r:${r}px`;
  });
  place();

  backdrop = document.createElement('canvas'); backdrop.width = canvas.width; backdrop.height = canvas.height;
  const b = backdrop.getContext('2d'); b.scale(dpr, dpr);
  const glow = b.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = '#f8f6f1'; b.fillRect(0, 0, W, H); b.fillStyle = glow; b.fillRect(0, 0, W, H);
  b.fillStyle = `rgba(${INK},.17)`;
  const nj = Math.ceil(H / (g * SQ3)), ni = Math.ceil(W / g) + nj;
  for (let j = -nj; j <= nj; j++) for (let i = -ni; i <= ni; i++) {
    const [x, y] = at(i, j); if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
    b.beginPath(); b.arc(x, y, (i % 6 === 0 && j % 6 === 0) ? 1.5 : 0.75, 0, 7); b.fill();
  }
  b.strokeStyle = `rgba(${INK},.16)`; b.lineWidth = 1; b.beginPath();                 // the hexagon the nodes sit on, and its echo
  for (const k of [1, 0.5]) nodes.forEach((n, i) => { const m = nodes[(i + 1) % 6]; b.moveTo(cx + (n.x - cx) * k, cy + (n.y - cy) * k); b.lineTo(cx + (m.x - cx) * k, cy + (m.y - cy) * k); });
  b.stroke();
  b.strokeStyle = `rgb(${INK})`; b.lineWidth = 1.6; b.beginPath();                    // the wires
  nodes.forEach((n) => { b.moveTo(cx + Math.cos(n.a) * R * 0.3, cy + Math.sin(n.a) * R * 0.3); b.lineTo(n.x - Math.cos(n.a) * n.r, n.y - Math.sin(n.a) * n.r); });
  b.stroke();
};
addEventListener('resize', resize); resize();

// ---------- the code: heads that walk the lattice and leave glyphs behind them
const cells = new Map(), LIFE = 2.8;
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const spawn = (s = {}) => {
  const a = Math.random() * 6.283, d = Math.hypot(W, H) * 0.56;
  const x = W / 2 + Math.cos(a) * d - cx, y = H / 2 + Math.sin(a) * d - cy;
  s.j = Math.round(y / (g * SQ3)); s.i = Math.round(x / g - s.j / 2);
  let best = 0, dot = -9;
  STEP.forEach(([di, dj], k) => { const v = -((di + dj / 2) * Math.cos(a) + dj * SQ3 * Math.sin(a)) + Math.random() * 0.5; if (v > dot) { dot = v; best = k; } });
  s.d = best; s.wait = 0; s.pace = 0.05 + Math.random() * 0.06; return s;
};
const heads = Array.from({ length: portrait ? 34 : 78 }, () => spawn());
const quiet = (x, y) => {                                 // how much the code is hushed at a point: silent in the lenses, low by the text
  let k = 1;
  const d0 = Math.hypot(x - cx, y - cy); if (d0 < R * 0.34) return 0;
  for (const n of nodes) { const d = Math.hypot(x - n.x, y - n.y); if (d < n.r * 1.35) return 0; if (y > n.y && y < n.y + n.r + 62 && Math.abs(x - n.x) < 95) k = 0.12; }
  if (!portrait && x < W * 0.06 + Math.min(W * 0.27, 384) + 30 && y > H * 0.17 && y < H * 0.8) k = Math.min(k, 0.1);
  if (portrait && y < H * 0.33) k = 0.08;
  return k;
};

let t = 0, last = performance.now(), tour = 0, shown = 0;
const frame = (nowMs) => {
  const dt = Math.min((nowMs - last) / 1000, 0.05); last = nowMs; t += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(backdrop, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (const s of heads) {
    s.wait -= dt;
    while (s.wait <= 0) {
      s.wait += s.pace; s.i += STEP[s.d][0]; s.j += STEP[s.d][1];
      if (Math.random() < 0.04) s.d = (s.d + (Math.random() < 0.5 ? 1 : 5)) % 6;
      const [x, y] = at(s.i, s.j);
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) { spawn(s); continue; }
      cells.set(s.i * 4096 + s.j, { x, y, ch: pick(), born: t, q: quiet(x, y) });
    }
  }

  // where a formula is about to appear the code first gathers, in gold; then it gives way to the handwriting
  slots.forEach((s) => {
    if (!s.box) return; s.clock += dt;
    if (s.clock > 0 && !s.busy) { s.busy = true; s.img = null; settle(s); }
    if (s.clock > 19) { s.clock = -2.5; s.busy = false; }
    s.gather = s.clock > 0 && s.clock < 2.2 ? Math.sin(s.clock / 2.2 * Math.PI) : 0;
    s.hush = s.clock > 1.2 && s.busy ? Math.min(1, (s.clock - 1.2) / 1.2, (19 - s.clock) / 1.5) : 0;
  });

  ctx.font = `${(g * 0.6).toFixed(1)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [key, c] of cells) {
    const age = t - c.born; if (age > LIFE) { cells.delete(key); continue; }
    let a = Math.pow(1 - age / LIFE, 1.6) * 0.62 * c.q, gold = age < 0.09 ? 1 : 0;
    for (const s of slots) {
      if (!s.box || c.x < s.box[0] - 14 || c.x > s.box[0] + s.box[2] + 14 || c.y < s.box[1] - 10 || c.y > s.box[1] + s.box[3] + 10) continue;
      gold = Math.max(gold, s.gather); a = a * (1 - s.hush) + s.gather * 0.5 * (1 - age / LIFE);
    }
    if (a < 0.012) continue;
    ctx.fillStyle = gold > 0.5 ? `rgba(214,148,14,${Math.min(1, a * 1.9 + 0.25 * gold).toFixed(3)})` : `rgba(${INK},${a.toFixed(3)})`;
    ctx.fillText(c.ch, c.x, c.y);
  }

  slots.forEach((s) => {
    if (!s.box || !s.img || s.clock < 1.6) return;
    const [bx, by, bw, bh] = s.box, k = Math.min(bw / s.img.width, bh / s.img.height), w = s.img.width * k, h = s.img.height * k;
    const x = bx + (bx > W / 2 ? bw - w : 0), y = by + (bh - h) / 2, pen = Math.min(1, (s.clock - 1.6) / 3.2);
    ctx.save(); ctx.globalAlpha = Math.min(1, (19 - s.clock) / 1.5);
    ctx.shadowColor = 'rgba(250,208,42,.95)'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.rect(x - 20, y - 20, (w + 40) * pen, h + 40); ctx.clip();
    ctx.drawImage(s.img, x, y, w, h); ctx.drawImage(s.img, x, y, w, h); ctx.restore();
    if (pen < 1) { ctx.fillStyle = 'rgba(232,163,23,.9)'; ctx.beginPath(); ctx.arc(x + w * pen, y + h * 0.55, 3, 0, 7); ctx.fill(); }
  });

  // light on the wires: out to the nodes and back
  nodes.forEach((n, i) => {
    const on = i === active, r0 = R * 0.3, r1 = R - n.r, ca = Math.cos(n.a), sa = Math.sin(n.a);
    if (on) { ctx.strokeStyle = n.warm ? '#7f3445' : '#e8a317'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + ca * r0, cy + sa * r0); ctx.lineTo(cx + ca * r1, cy + sa * r1); ctx.stroke(); }
    n.pulses.forEach((p, k) => {
      const u = ((t * (0.16 + k * 0.05) + p) % 1), d = r0 + (r1 - r0) * (k ? 1 - u : u);
      ctx.fillStyle = n.warm ? '#b0475c' : '#fad02a'; ctx.strokeStyle = n.warm ? '#7f3445' : '#e8a317'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx + ca * d, cy + sa * d, 3.4, 0, 7); ctx.fill(); ctx.stroke();
    });
  });

  if (t > 3 && performance.now() - hovered > 7000 && t - tour > 4.4) { tour = t; open((active + 1) % nodes.length); }
  if (t - shown > 0.5) { shown = t; readout.innerHTML = `<b>6</b> nodes · <b>${heads.length}</b> heads · <b>${cells.size}</b> glyphs · <b>${slots.filter((s) => s.busy && s.img).length}</b> fixed points`; }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
})();
