// jonatanbb.xyz: the signet wired to six nodes on a triangular lattice. Streams walk the lattice in its six
// directions, and what their heads run into lights up: a link or a node sends the hit as pulses in to the
// signet's dynamo and out to its arrow, two heads that collide raise an equation, and the words the lattice
// hides surface where they are struck. Now and then a head writes a quote as it goes.
(() => {
// on a local checkout, follow the nodes to the sibling sources instead of the live sites
if (location.protocol === 'file:')
  for (const node of document.querySelectorAll('a[data-local]')) node.setAttribute('href', node.dataset.local);

const canvas = document.getElementById('lattice'), ctx = canvas.getContext('2d');
const INK = '28,26,22', HEAD = '214,148,14', CARMESI = '127,52,69';
const MONO = '"DejaVu Sans Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
const GLYPHS = '0123456789012345678901234567890123456789∑∏∫∂∇λζΓπ∞∈≤';
const STEP = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];   // the six ways to move, clockwise from east
const SQ3 = Math.sqrt(3) / 2;
const SIGNET = 3.85;       // the signet's radius, in lattice steps
const PAST = 3;            // how many levels a link runs on past its closed node, to its arrow's tip
const LINE = 2.6;          // the width of the links and the nodes' rims, in px
const LIFE = 2.4;          // how long a head's trail lingers, in seconds
const FRONT = 0.045;       // how long a struck headline takes to open up by one cell, in seconds
const PULSE = 15;          // how fast light runs along a link, in lattice steps per second
const OPENING = 5;         // the fastest a node opens or closes, in levels per second
const WAVE = 16;           // how fast an equation's wave runs out, in lattice steps per second
const EQUATION = { scale: 0.026, lag: 0.15, hold: 5, fade: 2, most: 2 };
const EGG = { pace: 0.15, hold: 6, fade: 2 };

const hexDistance = (i, j) => (Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2;
const key = (i, j) => (i + 4096) * 8192 + j + 4096;
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

let W, H, dpr, portrait, g, cx, cy, M, TIP, backdrop, t = 0;
const at = (i, j) => [cx + g * (i + j / 2), cy + g * j * SQ3];
const cellAt = (x, y) => { const j = Math.round((y - cy) / (g * SQ3)); return [Math.round((x - cx) / g - j / 2), j]; };
// how many levels out from a node's centre a point lies, counted in hexagons
const hexNorm = (dx, dy) => Math.max(Math.abs(dy), Math.abs(SQ3 * dx + dy / 2), Math.abs(SQ3 * dx - dy / 2)) / (SQ3 * g);

// ---------- the nodes: a hexagon around a lattice point, which opens two levels larger as the pointer nears
const nodes = [...document.querySelectorAll('.node')].map((el) => {
  const k = +el.dataset.direction;
  el.insertAdjacentHTML('afterbegin', '<i class="hit"></i>');
  return { el, k, step: STEP[k], ring: k % 3, way: k < 3 ? 0 : 1, warm: el.classList.contains('warm'),
           level: 1, shown: 1, latched: false, focused: false, heat: 0, heated: false };
});
const pointer = { x: 0, y: 0, on: false };
addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') Object.assign(pointer, { x: e.clientX, y: e.clientY, on: true }); });
document.documentElement.addEventListener('pointerleave', () => { pointer.on = false; });
for (const n of nodes) {
  n.el.addEventListener('focus', () => { n.focused = true; });
  n.el.addEventListener('blur', () => { n.focused = false; });
  // on touch, the first tap opens a node and the second follows it
  n.el.addEventListener('click', (e) => {
    if (n.latched || n.focused) return;
    e.preventDefault();
    for (const m of nodes) m.latched = m === n;
  });
}
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !e.target.closest('.node')) for (const n of nodes) n.latched = false; });

// within two levels of a closed node the pointer starts opening it, so that the two meet one level out;
// there the node opens all the way, and stays open while the pointer stays on it
const steer = (n, dt) => {
  const d = pointer.on ? hexNorm(pointer.x - n.x, pointer.y - n.y) : Infinity;
  if (d <= 2) n.latched = true;
  else if (pointer.on && n.latched && d > 3.15) n.latched = false;
  const target = n.latched || n.focused ? 3 : clamp(4 - d, 1, 2);
  n.level += clamp(target - n.level, -OPENING * dt, OPENING * dt);
  if (Math.abs(n.level - n.shown) > 0.002) {
    n.shown = n.level;
    n.el.style.setProperty('--level', n.level.toFixed(3));
    n.el.style.zIndex = n.level > 1.01 ? 1 : '';
  }
};

// ---------- what the lattice hides
const HEADLINES = [...document.getElementById('headlines').content.children].map((e) => e.textContent.trim());
const EGGS = [...document.getElementById('eggs').content.children].map((p) => {
  const quote = p.querySelector('q'), by = p.querySelector('cite');
  const text = quote ? `${quote.textContent}   ${by.textContent.toUpperCase()}` : p.textContent.trim();
  return { chars: [...text], by: quote ? [...quote.textContent].length + 3 : Infinity, warm: p.classList.contains('warm') };
});
const clef = new Image(); clef.src = 'assets/icons/firecoat-clef.svg';

// the equations, cut from the notes' scans down to their ink, shown in an order shuffled once
const SHELF = ['affine-map', 'arc-length', 'conjugation', 'cosets', 'empirical', 'essential-singularity', 'expectation',
  'exponential-series', 'fatou', 'gamma', 'gradient', 'inclusion-reversal', 'integrating-factor', 'integrating-factor-ode',
  'lagrange', 'lifting', 'lyapunov', 'martingale', 'mascheroni', 'normalizer', 'nullstellensatz', 'product', 'projection',
  'quotient', 'rank-nullity', 'second-moment', 'sequence-limit', 'sine', 'substitution', 'tube-intersection', 'unprovable',
  'variance', 'zeta'].map((name) => { const img = new Image(); img.src = `assets/equations/${name}.png`; return img; });
for (let k = SHELF.length - 1; k > 0; k--) { const m = (Math.random() * (k + 1)) | 0; [SHELF[k], SHELF[m]] = [SHELF[m], SHELF[k]]; }
let shelfTurn = 0;
const gilded = new Map();      // each equation's ink turned gold, for the front of its pulse
const gold = (img) => {
  if (!gilded.has(img)) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fad02a'; x.fillRect(0, 0, c.width, c.height);
    gilded.set(img, c);
  }
  return gilded.get(img);
};

// a hidden text: its cells, each with the time a strike opened it up to
const headline = { turn: 0, cells: new Map(), armed: false, hold: 2.2, fade: 1.6 };
const setHeadline = (slot) => {
  const words = HEADLINES[headline.turn % HEADLINES.length].split(' '), rows = [];
  for (const w of words) {
    const last = rows[rows.length - 1];
    if (last && last.length + 1 + w.length <= slot.cols) rows[rows.length - 1] += ' ' + w; else rows.push(w);
  }
  headline.cells = new Map();
  // every other row of the lattice, so that the columns line up
  rows.forEach((row, l) => [...row].forEach((ch, c) => {
    if (ch === ' ') return;
    const i = slot.i + c - l, j = slot.j + 2 * l;
    headline.cells.set(key(i, j), { i, j, ch, open: Infinity });
  }));
  headline.armed = true;
};

// ---------- geometry, and everything that does not move, drawn once
const links = new Map();
const nameBox = document.querySelector('h1');
let nameRect, taken = [], eggRows = [];
const layout = () => {
  dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; portrait = W < H * 0.9;
  canvas.width = W * dpr; canvas.height = H * dpr;
  if (portrait) { M = 8; g = Math.min(W / 26, H / 46); cx = W / 2; cy = H * 0.55; }
  else { M = 12; g = Math.min(H / 33, W / 46); cx = W * 0.6; cy = H * 0.5; }
  TIP = M + 1 + PAST;
  document.documentElement.style.setProperty('--g', `${g}px`);
  Signet.place(cx, cy, g * SIGNET);

  // what an equation may not cover, besides the links: the signet, the nodes open with their names, the
  // arrows, the name and the headline
  nameRect = nameBox.getBoundingClientRect();
  const r = g * SIGNET * 1.1;
  taken = [[cx - r, cy - r, 2 * r, 2 * r], [nameRect.left, nameRect.top, nameRect.width, nameRect.height]];
  links.clear();
  for (const n of nodes) {
    [n.i, n.j] = [n.step[0] * M, n.step[1] * M]; [n.x, n.y] = at(n.i, n.j);
    n.el.style.transform = `translate(${n.x.toFixed(1)}px, ${n.y.toFixed(1)}px)`;
    n.ux = n.step[0] + n.step[1] / 2; n.uy = n.step[1] * SQ3;
    for (let m = Math.ceil(SIGNET); m <= TIP; m++) links.set(key(n.step[0] * m, n.step[1] * m), { n, m });
    taken.push([n.x - 3 * g, n.y - 3 * SQ3 * g, 6 * g, 6 * SQ3 * g + 1.6 * g]);
    const [tx, ty] = at(n.step[0] * TIP, n.step[1] * TIP);
    taken.push([tx - g / 2, ty - g / 2, g, g]);
  }

  // the headline under the name
  const left = nameRect.left;
  const room = portrait ? W - 2 * left : cx - M * g / 2 - 3.6 * g - left;
  const [hi, hj] = cellAt(left + g / 2, nameRect.bottom + g * 1.3);
  headline.slot = { i: hi, j: hj, cols: Math.floor(room / g) };
  setHeadline(headline.slot);
  const [sx, sy] = at(hi, hj);
  taken.push([sx - 1.5 * g, sy - 0.7 * g, headline.slot.cols * g + 2 * g, 4 * SQ3 * g + 1.4 * g]);

  // the rows a quote can be written along: the lowest two clear from edge to edge, next to each other
  eggRows = [];
  for (let j = Math.floor((H - 0.6 * g - cy) / (g * SQ3)); eggRows.length < 2 && cy + j * SQ3 * g > H / 2; j--) {
    const y = cy + j * SQ3 * g;
    if (!taken.some((box) => overlap(box, [0, y - g / 2, W, g]))) eggRows.push(j);
    else if (eggRows.length) break;
  }

  backdrop = document.createElement('canvas'); backdrop.width = canvas.width; backdrop.height = canvas.height;
  const b = backdrop.getContext('2d'); b.scale(dpr, dpr);
  const glow = b.createRadialGradient(cx, cy, 0, cx, cy, M * g * 1.45);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = '#f8f6f1'; b.fillRect(0, 0, W, H); b.fillStyle = glow; b.fillRect(0, 0, W, H);
  const nj = Math.ceil(H / (g * SQ3)), ni = Math.ceil(W / g) + nj;
  for (let j = -nj; j <= nj; j++) for (let i = -ni; i <= ni; i++) {
    const [x, y] = at(i, j); if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
    if (overlap([x, y, 0, 0], [nameRect.left - 4, nameRect.top, nameRect.width + 8, nameRect.height])) continue;   // no dots in the name
    const coarse = i % 6 === 0 && j % 6 === 0;
    b.fillStyle = `rgba(${INK},${coarse ? 0.32 : 0.21})`;
    b.beginPath(); b.arc(x, y, coarse ? 2 : 0.85, 0, 7); b.fill();
  }
  b.fillStyle = `rgb(${INK})`; b.beginPath(); b.arc(cx, cy, 3, 0, 7); b.fill();       // where the links meet
  b.strokeStyle = `rgba(${INK},.13)`; b.lineWidth = 1; b.beginPath();             // the hexagon the nodes sit on, and its echo
  for (const k of [1, 0.5]) nodes.forEach((n, i) => {
    const m = nodes[(i + 1) % 6];
    b.moveTo(cx + (n.x - cx) * k, cy + (n.y - cy) * k); b.lineTo(cx + (m.x - cx) * k, cy + (m.y - cy) * k);
  });
  b.stroke();
};

// ---------- the code: heads that walk the lattice and leave glyphs behind them
const heads = [], cells = new Map(), pulses = [], flashes = [], equations = [], letters = new Map();
// a head enters from anywhere just off the screen's edge, heading for anywhere on it
const spawn = (s = {}) => {
  const rim = 2 * (W + H), u = Math.random() * rim, m = g * 1.5;
  const [x, y] = u < W ? [u, -m] : u < W + H ? [W + m, u - W] : u < 2 * W + H ? [2 * W + H - u, H + m] : [-m, rim - u];
  [s.i, s.j] = cellAt(x, y);
  const tx = W * (0.15 + 0.7 * Math.random()) - x, ty = H * (0.15 + 0.7 * Math.random()) - y;
  let best = 0, dot = -Infinity;
  STEP.forEach(([di, dj], k) => {
    const v = (di + dj / 2) * tx + dj * SQ3 * ty;
    if (v > dot) { dot = v; best = k; }
  });
  s.d = best; s.wait = 0; s.pace = 0.07 + Math.random() * 0.06; return s;
};
const quiet = (x, y) => {                       // how much the code is hushed at a point: silent by the signet, low by the words
  if (Math.hypot(x - cx, y - cy) < g * (SIGNET + 0.7)) return 0;
  const r = nameRect;
  if (x > r.left - g && x < r.right + g && y > r.top - g && y < r.bottom + g / 2) return 0.1;
  for (const n of nodes) if (Math.abs(x - n.x) < 2.6 * g && y > n.y + n.level * g * SQ3 && y < n.y + n.level * g * SQ3 + 1.7 * g) return 0.12;
  return 1;
};

// a hit on a link at m steps out, or on a node's rim, sends a pulse each way: in to the dynamo, out to the arrow
const hit = (n, m, x, y) => {
  if (m === null) { n.heat = 1; pulses.push({ n, d: M - n.level, v: -1, through: true }, { n, d: M + n.level, v: 1, through: true }); }
  else pulses.push({ n, d: m, v: 1 }, { n, d: m, v: -1 });
  flashes.push({ x, y, born: t });
};

// a head has stepped onto (i, j): whatever it runs into takes it in
const strike = (s, x, y) => {
  const { i, j } = s;
  if (hexDistance(i, j) <= SIGNET) return true;
  for (const n of nodes) if (hexDistance(i - n.i, j - n.j) <= n.level + 0.01) { hit(n, null, x, y); return true; }
  const link = links.get(key(i, j));
  if (link) { hit(link.n, link.m, x, y); return true; }
  const word = headline.armed && headline.cells.get(key(i, j));
  if (word) {
    headline.armed = false;
    for (const c of headline.cells.values()) c.open = t + hexDistance(c.i - i, c.j - j) * FRONT;
    return true;
  }
  return false;
};

// two heads have met at (x, y): if the next equation has room there, a wave runs out and it surfaces
const raise = (x, y) => {
  if (equations.length >= EQUATION.most) return false;
  const img = SHELF[shelfTurn % SHELF.length];
  if (!img.complete || !img.naturalWidth) return false;
  const w = img.naturalWidth * EQUATION.scale * g, h = img.naturalHeight * EQUATION.scale * g, m = g / 3;
  const busy = [...taken, ...equations.map((e) => e.box), ...(egg ? [egg.row] : [])];
  for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.2], [0.5, 0.8], [0.1, 0.5], [0.9, 0.5]]) {
    const box = [x - w * fx, y - h * fy, w, h];
    if (box[0] < g / 2 || box[1] < g / 2 || box[0] + w > W - g / 2 || box[1] + h > H - g / 2) continue;
    const around = [box[0] - m, box[1] - m, w + 2 * m, h + 2 * m];
    if (busy.some((other) => overlap(around, other)) || crosses(around)) continue;
    const far = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([dx, dy]) => Math.hypot(box[0] + dx - x, box[1] + dy - y)));
    const shows = far / (WAVE * g) + EQUATION.lag + EQUATION.hold;
    equations.push({ img, box, x, y, far, born: t, shows, end: t + shows + EQUATION.fade });
    shelfTurn++;
    return true;
  }
  return false;
};
// whether a box lies across any of the links, which run from the centre out to their arrows' tips
const crosses = (box) => nodes.some((n) => {
  for (let d = 0; d <= TIP; d += 0.5) if (overlap(box, [cx + n.ux * d * g, cy + n.uy * d * g, 0, 0])) return true;
  return false;
});
// when the wave reaches a point of its equation's box
const swept = (e, x, y) => e.born + Math.hypot(x - e.x, y - e.y) / (WAVE * g);

// ---------- the quotes, each written by a head of its own along clear rows, a line at a time: on two rows
// taking turns where there is room for them, so that a line stays to be read while the next is written
let egg = null, eggTurn = 0, eggNext = 10 + Math.random() * 8;
const writeLine = (text, from, line) => {
  const j = eggRows.length > 1 ? eggRows[1 - line % 2] : eggRows[0];
  const y = cy + j * SQ3 * g, [i0] = cellAt(g * 0.75, y), [i1] = cellAt(W - g * 0.75, y);
  let to = Math.min(text.chars.length, from + i1 - i0 + 1);
  if (to < text.chars.length) { const space = text.chars.lastIndexOf(' ', to); if (space > from) to = space; }
  const rows = eggRows.slice(0, 2).map((r) => cy + r * SQ3 * g);
  egg = { text, line, to, at: from, i: i0 - 1, j, wait: 0.4, row: [0, Math.min(...rows) - g / 2, W, Math.abs(rows[0] - (rows[1] ?? rows[0])) + g] };
};
const stepEgg = (dt) => {
  if (!egg) {
    if (t < eggNext || !eggRows.length) return;
    writeLine(EGGS[eggTurn++ % EGGS.length], 0, 0);
  }
  egg.wait -= dt;
  while (egg.wait <= 0) {
    egg.wait += EGG.pace; egg.i++;
    const ch = egg.text.chars[egg.at];
    if (ch !== ' ') letters.set(key(egg.i, egg.j), { i: egg.i, j: egg.j, ch, born: t, by: egg.at >= egg.text.by, warm: egg.text.warm });
    if (++egg.at < egg.to) continue;
    // the line is written: what is left of the text starts over at the row's left end
    const { text, line } = egg, next = text.chars.findIndex((c, k) => k >= egg.at && c !== ' ');
    egg = null;
    if (next < 0) eggNext = t + 45 + Math.random() * 45;
    else { writeLine(text, next, line + 1); egg.wait = eggRows.length > 1 ? 0.8 : EGG.hold + EGG.fade; }
    return;
  }
};

// how much of a struck cell shows: nothing until the strike reaches it, then all of it, then less and less
const shown = (open, hold, fade) => {
  const age = t - open;
  if (age < 0) return 0;
  return age < hold ? 1 : Math.max(0, 1 - (age - hold) / fade);
};
// the strike reaches a cell as a head's gold, then a moment of code, then the letter
const drawLetter = (x, y, ch, open, hold, fade) => {
  const age = t - open, a = shown(open, hold, fade);
  if (a <= 0) return;
  if (age < 0.1) { ctx.fillStyle = `rgba(${HEAD},.95)`; ctx.fillText(pick(), x, y); return; }
  if (age < 0.22) { ctx.fillStyle = `rgba(${INK},.55)`; ctx.fillText(pick(), x, y); return; }
  ctx.fillStyle = `rgba(${HEAD},${a.toFixed(3)})`; ctx.fillText(ch, x, y);
};

// ---------- the metal: links, arrows and rims share the signet's satin black, lit where light falls on it
const LIGHT = [-0.45, -0.89];                                         // towards the signet's key light, up and left
const metal = (shade, base = [36, 32, 27], lit = [134, 121, 104]) =>
  `rgb(${base.map((c, k) => Math.round(c + (lit[k] - c) * shade * shade * 0.75)).join(',')})`;
// the arrow at a link's end: the db form's two tips, the d slid over until it meets the b
const ARROW = [[0, -15.84], [14.47, 5.78], [10.5, 8.44], [10.5, 20.5], [-10.5, 20.5], [-10.5, 8.44], [-14.47, 5.78]];
const ARROW_UNIT = LINE * 2 / 10.5, ARROW_LENGTH = (20.5 + 15.84) * ARROW_UNIT;
const drawLink = (n, glow) => {
  const along = (d) => [cx + n.ux * d * g, cy + n.uy * d * g];
  ctx.lineWidth = LINE; ctx.lineCap = 'butt';
  ctx.strokeStyle = ctx.fillStyle = metal(Math.abs(-n.uy * LIGHT[0] + n.ux * LIGHT[1]));
  const [ax, ay] = along(M - n.level), [bx, by] = along(M + n.level), [ex, ey] = along(TIP - ARROW_LENGTH / g);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  const [tx, ty] = along(TIP);
  ctx.beginPath();
  for (const [px, py] of ARROW) {
    const back = (py + 15.84) * ARROW_UNIT, side = px * ARROW_UNIT;
    ctx.lineTo(tx - n.ux * back - n.uy * side, ty - n.uy * back + n.ux * side);
  }
  ctx.fill();
  // the dynamo's light, reaching a little way along the link
  const reach = Math.min(SIGNET + 2.5, M - n.level), shine = ctx.createLinearGradient(cx, cy, ...along(SIGNET + 2.5));
  shine.addColorStop(0, `rgba(250,208,42,${(0.55 + 0.45 * glow).toFixed(3)})`);
  shine.addColorStop(SIGNET / (SIGNET + 2.5), `rgba(232,163,23,${(0.3 + 0.5 * glow).toFixed(3)})`);
  shine.addColorStop(1, 'rgba(232,163,23,0)');
  ctx.strokeStyle = shine; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...along(reach)); ctx.stroke();
};
const HEX = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]);
const drawNode = (n) => {
  const R = n.level * g;
  ctx.beginPath(); for (const [vx, vy] of HEX) ctx.lineTo(n.x + vx * R, n.y + vy * R); ctx.closePath();
  ctx.fillStyle = n.warm ? '#121212' : '#ffffff'; ctx.fill();
  ctx.lineWidth = LINE; ctx.lineCap = 'square';
  const heat = 0.6 * n.heat;
  for (let k = 0; k < 6; k++) {                                       // each side catches the light at its own angle
    const [ux, uy] = HEX[k], [vx, vy] = HEX[(k + 1) % 6], a = (k + 0.5) * Math.PI / 3;
    const shade = Math.max(0, Math.cos(a) * LIGHT[0] + Math.sin(a) * LIGHT[1]);
    const [r, gr, b] = (n.warm ? metal(shade, [127, 52, 69], [196, 98, 116]) : metal(shade)).match(/\d+/g).map(Number);
    ctx.strokeStyle = `rgb(${Math.round(r + (250 - r) * heat)},${Math.round(gr + (200 - gr) * heat)},${Math.round(b + (42 - b) * heat)})`;
    ctx.beginPath(); ctx.moveTo(n.x + ux * R, n.y + uy * R); ctx.lineTo(n.x + vx * R, n.y + vy * R); ctx.stroke();
  }
  ctx.lineCap = 'butt';
};

let last = performance.now();
const frame = (now) => {
  const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(backdrop, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const n of nodes) steer(n, dt);

  for (let h = heads.length - 1; h >= 0; h--) {
    const s = heads[h];
    s.wait -= dt;
    while (s.wait <= 0) {
      s.wait += s.pace; s.i += STEP[s.d][0]; s.j += STEP[s.d][1];
      if (!s.spark && Math.random() < 0.04) s.d = (s.d + (Math.random() < 0.5 ? 1 : 5)) % 6;
      const [x, y] = at(s.i, s.j);
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60 || strike(s, x, y)) {
        if (s.spark) { heads.splice(h, 1); break; }
        spawn(s); continue;
      }
      cells.set(key(s.i, s.j), { x, y, ch: pick(), born: t, q: quiet(x, y) });
    }
  }
  // two heads on the same point have met
  const met = new Map();
  for (const s of heads) {
    if (s.spark) continue;
    const k = key(s.i, s.j), other = met.get(k);
    if (!other) met.set(k, s);
    else if (raise(...at(s.i, s.j))) { spawn(s); spawn(other); }
  }
  stepEgg(dt);

  // the headline: once a struck one has faded, the next takes its place
  if (!headline.armed && [...headline.cells.values()].every((c) => t > c.open + headline.hold + headline.fade)) {
    headline.turn++; setHeadline(headline.slot);
  }
  for (let k = equations.length - 1; k >= 0; k--) if (t > equations[k].end) equations.splice(k, 1);

  ctx.font = `${(g * 0.6).toFixed(1)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [k, c] of cells) {
    const age = t - c.born; if (age > LIFE) { cells.delete(k); continue; }
    const word = headline.cells.get(k);
    if ((word && shown(word.open, headline.hold, headline.fade) > 0) || letters.has(k)) continue;
    // a wave wipes out what was written before it passed
    if (equations.some((e) => { const p = swept(e, c.x, c.y); return c.born < p && t >= p && overlap(e.box, [c.x, c.y, 0, 0]); })) continue;
    const a = Math.pow(1 - age / LIFE, 1.6) * 0.42 * c.q;
    if (a < 0.012) continue;
    ctx.fillStyle = age < 0.09 ? `rgba(${HEAD},${Math.min(1, a * 1.9).toFixed(3)})` : `rgba(${INK},${a.toFixed(3)})`;
    ctx.fillText(c.ch, c.x, c.y);
  }
  for (const c of headline.cells.values()) drawLetter(...at(c.i, c.j), c.ch, c.open, headline.hold, headline.fade);

  // what the quotes' heads have written: the head's gold, then the letter, and firecoat's its own way
  for (const [k, c] of letters) {
    const age = t - c.born, a = shown(c.born, EGG.hold, EGG.fade);
    if (a <= 0) { letters.delete(k); continue; }
    const [x, y] = at(c.i, c.j);
    if (age < 0.09) ctx.fillStyle = c.warm ? 'rgba(226,92,48,.95)' : `rgba(${HEAD},.95)`;
    else ctx.fillStyle = c.warm ? `rgba(${CARMESI},${a.toFixed(3)})` : c.by ? `rgba(150,120,60,${(0.9 * a).toFixed(3)})` : `rgba(${INK},${(0.85 * a).toFixed(3)})`;
    if (c.warm) { ctx.shadowColor = `rgba(214,52,60,${(0.55 * a).toFixed(3)})`; ctx.shadowBlur = 6; }
    if (c.ch === '𝄞') { ctx.globalAlpha = a; ctx.drawImage(clef, x - g * 0.22, y - g * 0.62, g * 0.44, g * 1.24); ctx.globalAlpha = 1; }
    else ctx.fillText(c.ch, x, y);
    ctx.shadowBlur = 0;
  }

  // an equation: its wave runs out from where the heads met, and the ink follows it in, gold at its front
  for (const e of equations) {
    const [bx, by, bw, bh] = e.box, reach = (t - e.born) * WAVE * g, front = reach - EQUATION.lag * WAVE * g, band = g * 1.2;
    const a = shown(e.born, e.shows, EQUATION.fade);
    ctx.save(); ctx.beginPath(); ctx.rect(bx - g / 2, by - g / 2, bw + g, bh + g); ctx.clip();
    if (reach < e.far + g) {
      ctx.strokeStyle = `rgba(232,163,23,${(0.6 * (1 - reach / (e.far + g))).toFixed(3)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, reach, 0, 7); ctx.stroke();
    }
    if (front > 0) {
      ctx.globalAlpha = 0.9 * a;
      if (front - band > e.far) ctx.drawImage(e.img, bx, by, bw, bh);
      else {
        ctx.save(); ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0, front - band), 0, 7); ctx.clip(); ctx.drawImage(e.img, bx, by, bw, bh); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(e.x, e.y, front, 0, 7); ctx.arc(e.x, e.y, Math.max(0, front - band), 0, 7, true); ctx.clip();
        ctx.shadowColor = 'rgba(250,208,42,.9)'; ctx.shadowBlur = 8; ctx.drawImage(gold(e.img), bx, by, bw, bh); ctx.restore();
      }
    }
    ctx.restore();
  }

  // the links, and the light a hit sets running along them both ways
  const glow = Signet.glow();
  for (const n of nodes) drawLink(n, glow);
  for (let p = pulses.length - 1; p >= 0; p--) {
    const u = pulses[p], n = u.n;
    u.d += u.v * PULSE * dt;
    if (!u.through && u.d > M - n.level && u.d < M + n.level) { n.heat = 1; u.through = true; u.d = u.v > 0 ? M + n.level : M - n.level; }
    if (u.v < 0 && u.d <= 0) { Signet.bump(n.ring, n.way); pulses.splice(p, 1); continue; }
    if (u.v > 0 && u.d >= TIP) {
      // the arrow lets the light go on, half the time, as a head of its own
      if (Math.random() < 0.5) heads.push({ i: n.step[0] * TIP, j: n.step[1] * TIP, d: n.k, wait: 0.05, pace: 0.08, spark: true });
      pulses.splice(p, 1); continue;
    }
    const [lo, hi] = u.d < M ? [0, M - n.level] : [M + n.level, TIP];
    const tail = clamp(u.d - u.v * 2.4, lo, hi), head = clamp(u.d, lo, hi);
    const [hx, hy] = [cx + n.ux * head * g, cy + n.uy * head * g], [tx, ty] = [cx + n.ux * tail * g, cy + n.uy * tail * g];
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'rgba(250,208,42,0)'); grad.addColorStop(1, 'rgba(255,236,150,1)');
    ctx.strokeStyle = grad; ctx.lineWidth = LINE; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(250,208,42,.9)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
  }
  for (const n of nodes) drawNode(n);
  for (let k = flashes.length - 1; k >= 0; k--) {
    const f = flashes[k], age = (t - f.born) / 0.4;
    if (age > 1) { flashes.splice(k, 1); continue; }
    ctx.strokeStyle = `rgba(232,163,23,${(0.8 * (1 - age)).toFixed(3)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(f.x, f.y, g * (0.15 + 0.5 * age), 0, 7); ctx.stroke();
  }

  // a node a pulse reaches warms up, and cools down
  for (const n of nodes) {
    if (n.heat < 0.002 && !n.heated) continue;
    n.heat *= Math.exp(-dt / 0.6);
    n.heated = n.heat >= 0.002;
    n.el.style.setProperty('--heat', n.heated ? n.heat.toFixed(3) : 0);
  }

  Signet.frame(dt);
  requestAnimationFrame(frame);
};

const start = () => {
  heads.push(...Array.from({ length: portrait ? 12 : 22 }, () => spawn()));
  requestAnimationFrame(frame);
};
addEventListener('resize', layout);
document.fonts.ready.then(() => { layout(); start(); });
})();
