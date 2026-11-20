// jonatanbb.xyz: the signet wired to six nodes on a triangular lattice. Streams walk the lattice in its six
// directions, and what half their heads run into lights up: a link or a node sends the hit as pulses in to the
// signet's capacitor and out to its arrow, and the words the lattice hides surface where they are struck. Where
// two heads collide, a pop-up is decoded out of the code: an equation, or a quote.
(() => {
// on a local checkout, follow the nodes to the sibling sources instead of the live sites
if (location.protocol === 'file:')
  for (const node of document.querySelectorAll('a[data-local]')) node.setAttribute('href', node.dataset.local);

const canvas = document.getElementById('lattice'), ctx = canvas.getContext('2d');
const INK = '28,26,22', HEAD = '214,148,14', CARMESI = [127, 52, 69], HEAT = [250, 200, 42];
const METAL = getComputedStyle(document.documentElement).getPropertyValue('--metal').trim().match(/\w\w/g).map((h) => parseInt(h, 16));
const MONO = '"DejaVu Sans Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
const GLYPHS = '0123456789012345678901234567890123456789∑∏∫∂∇λζΓπ∞∈≤';
const STEP = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];   // the six ways to move, clockwise from east
const SQ3 = Math.sqrt(3) / 2;
const HEX = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]);   // vertices on the six ways
const CELL = HEX.map(([x, y]) => [-y / SQ3 / 2, x / SQ3 / 2]);   // the hexagon of the plane a lattice point is nearest to, in steps
const COARSE = 6;          // the spacing of the lattice's coarse points, in steps
const M = 2 * COARSE;      // how far out the nodes sit, on coarse points
const SIGNET = COARSE * SQ3;   // the signet's radius, in steps: its rim inscribed in the coarse hexagon about the centre
const CLOSED = 2, OPEN = COARSE;   // a node's size, in levels: open, it fills the coarse points' hexagon about it
const TIP = M + OPEN;      // where a link's arrow ends: at the far vertex of its node, open
const LINE = 0.18;         // the width of the links and the nodes' rims, in steps
const DOT = 0.065, KNOT = 0.12;   // the size of the lattice's points, in steps: a fine one's radius, a coarse hexagon's circumradius
const LIFE = 2.4;          // how long a head's trail lingers, in seconds
const REFILL = 0.5;        // how long the lattice takes to come back where a piece of text has gone, in seconds
const FRONT = 0.045;       // how long a strike takes to decode one more cell, in seconds
const DECODE = 0.22;       // how long a struck cell shows code before what it hides, in seconds
const PULSE = 15;          // how fast light runs along a link, in lattice steps per second
const OPENING = 9;         // the fastest a node opens or closes, in levels per second
const POPUPS = 2;          // the most pop-ups up at once
const EQUATION = { scale: 0.022, hold: 5, fade: 2 };
const QUOTE = { cols: [24, 18, 14], hold: (length) => 3 + length / 14, fade: 1.6 };   // the widths a quote tries

const hexDistance = (i, j) => (Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2;
const key = (i, j) => (i + 4096) * 8192 + j + 4096;
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const mix = (from, to, k) => from.map((c, n) => Math.round(c + (to[n] - c) * k));

let W, H, dpr, portrait, g, lw, cx, cy, backdrop, bare, t = 0;
const at = (i, j) => [cx + g * (i + j / 2), cy + g * j * SQ3];
const cellAt = (x, y) => { const j = Math.round((y - cy) / (g * SQ3)); return [Math.round((x - cx) / g - j / 2), j]; };
// the lattice points inside a box
const pointsIn = ([x, y, w, h]) => {
  const points = [];
  for (let j = Math.ceil((y - cy) / (g * SQ3)); j <= Math.floor((y + h - cy) / (g * SQ3)); j++)
    for (let i = Math.ceil((x - cx) / g - j / 2); i <= Math.floor((x + w - cx) / g - j / 2); i++) points.push([i, j]);
  return points;
};
// how many levels out from a node's centre a point lies, counted in hexagons
const hexNorm = (dx, dy) => Math.max(Math.abs(dy), Math.abs(SQ3 * dx + dy / 2), Math.abs(SQ3 * dx - dy / 2)) / (SQ3 * g);

// ---------- the nodes: a hexagon around a coarse point, which opens to fill the coarse hexagon as the pointer nears
const nodes = [...document.querySelectorAll('.node')].map((el) => {
  const k = +el.dataset.direction;
  el.insertAdjacentHTML('afterbegin', '<i class="hit"></i>');
  return { el, k, step: STEP[k], ring: k % 3, way: k < 3 ? 0 : 1, warm: el.classList.contains('warm'),
           level: CLOSED, shown: 0, latched: false, focused: false, heat: 0, heated: false };
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
  if (d <= CLOSED + 1) n.latched = true;
  else if (pointer.on && n.latched && d > OPEN + 0.15) n.latched = false;
  const target = n.latched || n.focused ? OPEN : clamp(2 * CLOSED + 2 - d, CLOSED, CLOSED + 1);
  n.level += clamp(target - n.level, -OPENING * dt, OPENING * dt);
  if (Math.abs(n.level - n.shown) > 0.002) {
    n.shown = n.level;
    n.el.style.setProperty('--level', n.level.toFixed(3));
    n.el.style.zIndex = n.level > CLOSED + 0.01 ? 1 : '';
  }
};

// ---------- what the lattice hides
const HEADLINES = [...document.getElementById('headlines').content.children].map((e) => e.textContent.trim());
// the quotes, the words and then their author; one without words leads with its symbols, set in ink
const QUOTES = [...document.getElementById('quotes').content.children].map((p) => {
  const quote = p.querySelector('q'), by = p.querySelector('cite');
  const text = quote ? `${quote.textContent} —${by.textContent}` : p.textContent;
  return { text, symbols: quote ? 0 : [...text.split(' —')[0]].length };
});
const clef = new Image(); clef.src = 'assets/icons/firecoat-clef.svg';

// the equations, cut from the notes' scans tight about their ink, at one scale of handwriting
const EQUATIONS = ['affine-map', 'arc-length', 'conjugation', 'cosets', 'empirical', 'essential-singularity', 'expectation',
  'exponential-series', 'fatou', 'gamma', 'gradient', 'inclusion-reversal', 'integrating-factor', 'integrating-factor-ode',
  'lagrange', 'lyapunov', 'martingale', 'mascheroni', 'normalizer', 'nullstellensatz', 'product', 'projection',
  'quotient', 'rank-nullity', 'second-moment', 'sequence-limit', 'sine', 'substitution', 'tube-intersection', 'unprovable',
  'variance', 'zeta'].map((name) => { const img = new Image(); img.src = `assets/equations/${name}.png`; return img; });
// the pop-ups, equations and quotes in one bag, drawn in an order shuffled once
const BAG = [...EQUATIONS.map((img) => ({ img })), ...QUOTES.map((quote) => ({ quote }))];
for (let k = BAG.length - 1; k > 0; k--) { const m = (Math.random() * (k + 1)) | 0; [BAG[k], BAG[m]] = [BAG[m], BAG[k]]; }
let bagTurn = 0;
const gilded = new Map();      // each equation's ink turned to the gold of the headlines
const gold = (img) => {
  if (!gilded.has(img)) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${HEAD})`; x.fillRect(0, 0, c.width, c.height);
    gilded.set(img, c);
  }
  return gilded.get(img);
};

// a text broken into rows of at most cols characters
const wrap = (text, cols) => {
  const rows = [];
  for (const word of text.split(' ')) {
    const last = rows[rows.length - 1];
    if (last && [...last].length + 1 + [...word].length <= cols) rows[rows.length - 1] += ' ' + word; else rows.push(word);
  }
  return rows;
};
// rows set from (i, j) down the lattice, a cell per character, spaces included, each with its place in the text
// and the time a strike opens it up: a headline on every other row, so that its columns line up, a quote on every row
const typeset = (rows, i0, j0, gap) => {
  const cells = [];
  let n = 0;
  rows.forEach((row, l) => {
    [...row].forEach((ch, c) => {
      const i = i0 + c - Math.floor(l * gap / 2), j = j0 + gap * l, [x, y] = at(i, j);
      cells.push({ i, j, x, y, ch, n, open: Infinity });
      n++;
    });
    n++;
  });
  return cells;
};

// a hidden text: its cells, each with the time a strike opened it up to
const headline = { turn: 0, cells: new Map(), armed: false, hold: 2.2, fade: 1.6 };
const setHeadline = (slot) => {
  const rows = wrap(HEADLINES[headline.turn % HEADLINES.length], slot.cols);
  headline.cells = new Map(typeset(rows, slot.i, slot.j, 2).map((c) => [key(c.i, c.j), c]));
  headline.armed = true;
};

// ---------- geometry, and everything that does not move, drawn once
// the lattice points the name's letters cover, found by typing it out again on a canvas of its own: the
// lattice gives way under the letters and a little around them, and nowhere else
const nameBox = document.querySelector('h1');
const nameInk = () => {
  const box = nameBox.getBoundingClientRect(), pad = g, style = getComputedStyle(nameBox);
  const c = document.createElement('canvas'); c.width = Math.ceil(box.width + 2 * pad); c.height = Math.ceil(box.height + 2 * pad);
  const x = c.getContext('2d');
  x.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`; x.lineWidth = 0.4 * g; x.lineJoin = 'round';
  const ascent = x.measureText(nameBox.textContent).fontBoundingBoxAscent;
  const walk = document.createTreeWalker(nameBox, NodeFilter.SHOW_TEXT), range = document.createRange();
  for (let node; (node = walk.nextNode());) [...node.textContent].forEach((ch, k) => {
    if (!ch.trim()) return;
    range.setStart(node, k); range.setEnd(node, k + 1);
    const r = range.getBoundingClientRect(), u = r.left - box.left + pad, v = r.top - box.top + pad + ascent;
    x.fillText(ch, u, v); x.strokeText(ch, u, v);
  });
  const ink = x.getImageData(0, 0, c.width, c.height).data, keys = new Set();
  for (const [i, j] of pointsIn([box.left - pad, box.top - pad, c.width, c.height])) {
    const [px, py] = at(i, j), u = Math.round(px - box.left + pad), v = Math.round(py - box.top + pad);
    if (u >= 0 && v >= 0 && u < c.width && v < c.height && ink[4 * (v * c.width + u) + 3]) keys.add(key(i, j));
  }
  return keys;
};

// the paper, bare: what shows wherever the lattice gives way to text
const paper = () => {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const b = c.getContext('2d'); b.scale(dpr, dpr);
  const glow = b.createRadialGradient(cx, cy, 0, cx, cy, M * g * 1.45);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = '#f8f6f1'; b.fillRect(0, 0, W, H); b.fillStyle = glow; b.fillRect(0, 0, W, H);
  return c;
};

const links = new Map(), edges = new Set();
let nameRect, inked = new Set(), hushed = new Set(), taken = [], segments = [];
const layout = () => {
  dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; portrait = W < H * 0.9;
  canvas.width = W * dpr; canvas.height = H * dpr;
  if (portrait) { g = Math.min(W / 38, H / 42); cx = W / 2; cy = H * 0.58; }
  else { g = Math.min(H / 35, W / 48); cx = W * 0.42; cy = H * 0.5; }
  lw = LINE * g;
  document.documentElement.style.setProperty('--g', `${g}px`);
  Signet.place(cx, cy, g * SIGNET);

  // the name's letters, and the points next to them, where the code runs low
  nameRect = nameBox.getBoundingClientRect();
  inked = nameInk(); hushed = new Set();
  for (const k of inked) for (const [di, dj] of [[0, 0], ...STEP]) hushed.add(k + di * 8192 + dj);

  // what a pop-up may not cover, besides the links and edges: the signet, the nodes open, the arrows, the name
  // and the headline
  const r = g * SIGNET * 1.1;
  taken = [[cx - r, cy - r, 2 * r, 2 * r], [nameRect.left, nameRect.top, nameRect.width, nameRect.height]];
  links.clear(); edges.clear(); segments = [];
  for (const n of nodes) {
    [n.i, n.j] = [n.step[0] * M, n.step[1] * M]; [n.x, n.y] = at(n.i, n.j);
    n.el.style.transform = `translate(${n.x.toFixed(1)}px, ${n.y.toFixed(1)}px)`;
    n.ux = n.step[0] + n.step[1] / 2; n.uy = n.step[1] * SQ3;
    // the link, from its terminal on the coarse hexagon about the centre out to its arrow's tip
    n.terminal = at(n.step[0] * COARSE, n.step[1] * COARSE);
    for (let m = COARSE; m <= TIP; m++) links.set(key(n.step[0] * m, n.step[1] * m), { n, m });
    const tip = TIP * g + BEYOND * lw;
    segments.push([...n.terminal, cx + n.ux * tip, cy + n.uy * tip]);
    taken.push([n.x - OPEN * g, n.y - OPEN * SQ3 * g, 2 * OPEN * g, 2 * OPEN * SQ3 * g]);
    taken.push([cx + n.ux * tip - g / 2, cy + n.uy * tip - g / 2, g, g]);
  }
  // the edges between neighbours: terminal to terminal round the inner hexagon, node to node round the outer
  nodes.forEach((n, k) => {
    const next = nodes[(k + 1) % 6], side = STEP[(n.k + 2) % 6];
    for (const r of [COARSE, M]) {
      for (let m = 1; m < r; m++) edges.add(key(n.step[0] * r + side[0] * m, n.step[1] * r + side[1] * m));
      segments.push(r === M ? [n.x, n.y, next.x, next.y] : [...n.terminal, ...next.terminal]);
    }
  });

  // the headline under the name, flush left with it, as wide as the screen allows
  const [hi, hj] = cellAt(nameRect.left + g / 2, nameRect.bottom + g * 2.6);
  headline.slot = { i: hi, j: hj, cols: Math.floor((W - g - nameRect.left) / g) };
  setHeadline(headline.slot);
  const [sx, sy] = at(hi, hj);
  taken.push([sx - 1.5 * g, sy - 0.7 * g, headline.slot.cols * g + 2 * g, 4 * SQ3 * g + 1.4 * g]);

  bare = paper(); backdrop = paper();
  const b = backdrop.getContext('2d');
  for (const [i, j] of pointsIn([-5, -5, W + 10, H + 10])) {
    if (inked.has(key(i, j))) continue;
    const [x, y] = at(i, j), coarse = i % COARSE === 0 && j % COARSE === 0;
    b.fillStyle = `rgba(${INK},${coarse ? 0.32 : 0.21})`; b.beginPath();
    if (coarse) for (const [vx, vy] of HEX) b.lineTo(x + vx * KNOT * g, y + vy * KNOT * g);
    else b.arc(x, y, DOT * g, 0, 7);
    b.fill();
  }
};

// ---------- the code: heads that walk the lattice and leave glyphs behind them
const heads = [], cells = new Map(), pulses = [], flashes = [], popups = [];
// a head enters from anywhere just off the screen's edge, heading for anywhere on it; one in two will collide
// with the signet and its network, the rest pass through
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
  s.d = best; s.wait = 0; s.pace = 0.07 + Math.random() * 0.06; s.solid = Math.random() < 0.5;
  return s;
};
const quiet = (i, j, x, y) => {                 // how much the code is hushed at a point: silent by the signet, low by the name
  if (Math.hypot(x - cx, y - cy) < g * (SIGNET + 0.7)) return 0;
  return hushed.has(key(i, j)) ? 0.1 : 1;
};

// a hit on a link at m steps out, or on a node's rim, sends a pulse each way: in to the capacitor, out to the arrow
const hit = (n, m, x, y) => {
  if (m === null) { n.heat = 1; pulses.push({ n, d: M - n.level, v: -1, through: true }, { n, d: M + n.level, v: 1, through: true }); }
  else pulses.push({ n, d: m, v: 1 }, { n, d: m, v: -1 });
  flashes.push({ x, y, born: t });
};

// a head has stepped onto (i, j): whatever it runs into takes it in, the signet and its network only if the
// head is one that collides with them
const strike = (s, x, y) => {
  const { i, j } = s;
  if (s.solid || s.spark) {
    if (hexDistance(i, j) <= SIGNET) return true;
    for (const n of nodes) if (hexDistance(i - n.i, j - n.j) <= n.level + 0.01) { hit(n, null, x, y); return true; }
    const link = links.get(key(i, j));
    if (link) { hit(link.n, link.m, x, y); return true; }
    if (edges.has(key(i, j))) { flashes.push({ x, y, born: t }); return true; }
  }
  const word = headline.armed && headline.cells.get(key(i, j));
  if (word) {
    headline.armed = false;
    for (const c of headline.cells.values()) c.open = t + hexDistance(c.i - i, c.j - j) * FRONT;
    return true;
  }
  return false;
};

// two heads have met at (i, j): if one of the next pop-ups in the bag has room for its box to hold the meeting
// point, the collision decodes it out of the code
const popUp = (i, j) => {
  if (popups.length >= POPUPS) return false;
  const [x, y] = at(i, j), busy = [...taken, ...popups.map((p) => p.box)], m = g / 3;
  for (let turn = bagTurn; turn < bagTurn + 4; turn++) {
    const item = BAG[turn % BAG.length];
    if (item.img && !(item.img.complete && item.img.naturalWidth)) continue;
    for (const width of item.quote ? QUOTE.cols : [0]) for (const fy of [0.5, 0.2, 0.8]) for (const fx of [0.5, 0.3, 0.7, 0.1, 0.9]) {
      let box, place;
      if (item.img) {
        const w = item.img.naturalWidth * EQUATION.scale * g, h = item.img.naturalHeight * EQUATION.scale * g;
        box = [x - w * fx, y - h * fy, w, h];
        place = () => decode(item.img, box, i, j);
      } else {
        // the quote's rows set so that the meeting point falls on one of its cells
        const rows = wrap(item.quote.text, width), cols = Math.max(...rows.map((row) => [...row].length));
        const l = Math.round(fy * (rows.length - 1)), c = Math.round(fx * (cols - 1));
        const cells = typeset(rows, i - c + Math.floor(l / 2), j - l, 1);
        const xs = cells.map((cell) => cell.x), ys = cells.map((cell) => cell.y);
        box = [Math.min(...xs) - g / 2, Math.min(...ys) - g / 2, Math.max(...xs) - Math.min(...xs) + g, Math.max(...ys) - Math.min(...ys) + g];
        place = () => strikeOut(item.quote, cells, i, j, box);
      }
      const [bx, by, w, h] = box;
      if (bx < g / 2 || by < g / 2 || bx + w > W - g / 2 || by + h > H - g / 2) continue;
      const around = [bx - m, by - m, w + 2 * m, h + 2 * m];
      if (busy.some((other) => overlap(around, other)) || crosses(around)) continue;
      popups.push(place());
      // what went up leaves the bag's turn; what had no room waits for the next
      const placed = turn % BAG.length, next = bagTurn % BAG.length;
      [BAG[placed], BAG[next]] = [BAG[next], BAG[placed]];
      bagTurn++;
      return true;
    }
  }
  return false;
};
// an equation as the strike decodes it: the cells of the lattice its box reaches into, each with the time the
// strike gets there, and the halo of bare paper its ink keeps clear of dots and code: the ink spread a little,
// cut out of the paper. Once all of it shows, it holds, and fades as one
const decode = (img, box, i0, j0) => {
  const [bx, by, bw, bh] = box, pad = 0.4 * g;
  const halo = document.createElement('canvas');
  halo.width = Math.ceil((bw + 2 * pad) * dpr); halo.height = Math.ceil((bh + 2 * pad) * dpr);
  const x = halo.getContext('2d');
  x.scale(dpr, dpr);
  for (const r of [0, pad / 4, pad / 2, 3 * pad / 4, pad]) for (let k = 0; k < 12; k++)
    x.drawImage(img, pad + r * Math.cos(k * Math.PI / 6), pad + r * Math.sin(k * Math.PI / 6), bw, bh);
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in';
  x.drawImage(bare, (bx - pad) * dpr, (by - pad) * dpr, halo.width, halo.height, 0, 0, halo.width, halo.height);
  const cells = pointsIn([bx - g / 2, by - g / SQ3 / 2, bw + g, bh + g / SQ3]).map(([i, j]) => {
    const [px, py] = at(i, j);
    return { i, j, x: px, y: py, open: t + hexDistance(i - i0, j - j0) * FRONT };
  });
  const fade = Math.max(...cells.map((cell) => cell.open)) + DECODE + EQUATION.hold;
  return { img, box, halo: [halo, bx - pad, by - pad, halo.width / dpr, halo.height / dpr], cells, fade,
           end: fade + EQUATION.fade + REFILL };
};
// a quote as the strike brings it out, cell by cell from where the heads met, the way a headline surfaces
const strikeOut = (quote, cells, i0, j0, box) => {
  const hold = QUOTE.hold(quote.text.length);
  for (const c of cells) { c.open = t + hexDistance(c.i - i0, c.j - j0) * FRONT; c.ink = c.n < quote.symbols; }
  return { box, cells, hold, fade: QUOTE.fade, end: Math.max(...cells.map((c) => c.open)) + hold + QUOTE.fade + REFILL };
};
// whether a box lies across any of the links or edges
const crosses = (box) => segments.some(([x0, y0, x1, y1]) => {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (g / 2));
  for (let k = 0; k <= n; k++) if (overlap(box, [x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, 0, 0])) return true;
  return false;
});

// how much of a struck cell shows: nothing until the strike reaches it, then all of it, then less and less
const shown = (open, hold, fade) => {
  const age = t - open;
  if (age < 0) return 0;
  return age < hold ? 1 : Math.max(0, 1 - (age - hold) / fade);
};
// a struck cell, before it shows what it hides: a head's gold, then a moment of code
const scramble = (x, y, age) => {
  ctx.fillStyle = age < 0.1 ? `rgba(${HEAD},.95)` : `rgba(${INK},.55)`;
  ctx.fillText(pick(), x, y);
};

// ---------- the metal: links, edges, arrows and rims are one piece of the signet's satin black, lit only by the
// capacitor and the pulses
// the arrow at a link's end: the db form's two tips, the d slid over until it meets the b, with the link one
// stroke of a b wide (10.5 units), and the hooks cut back square to the link
const ARROW = [[0, -15.84], [14.47, 5.78], [5.25, 11.96], [-5.25, 11.96], [-14.47, 5.78]];
const NECK = (11.96 + 15.84) / 10.5;   // from the tip back to the neck, in link widths
// how far the tip runs past the open node's far vertex, in link widths: so far that the hooks rest on the
// rim's outer edge, and the arrow reads as that vertex, sharpened
const BEYOND = 0.5 / SQ3 + (5.78 + 15.84) / 10.5 - 14.47 / 10.5 / Math.sqrt(3);
const drawLink = (n, light) => {
  const along = (d) => [cx + n.ux * d, cy + n.uy * d];
  const neck = TIP * g + (BEYOND - NECK) * lw, past = (M + n.level) * g;
  ctx.strokeStyle = `rgb(${METAL})`; ctx.lineWidth = lw; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(...along(COARSE * g)); ctx.lineTo(...along((M - n.level) * g));
  if (past < neck) { ctx.moveTo(...along(past)); ctx.lineTo(...along(neck)); }
  ctx.stroke();
  // the capacitor's light, a little way along the link from its terminal
  if (light <= 0) return;
  const shine = ctx.createLinearGradient(...along(COARSE * g), ...along((COARSE + 1.5) * g));
  shine.addColorStop(0, `rgba(250,208,42,${(0.85 * light).toFixed(3)})`); shine.addColorStop(1, 'rgba(250,208,42,0)');
  ctx.strokeStyle = shine;
  ctx.beginPath(); ctx.moveTo(...along(COARSE * g)); ctx.lineTo(...along(Math.min(COARSE + 1.5, M - n.level) * g)); ctx.stroke();
};
// the edges round the two hexagons, under the nodes and terminals
const drawEdges = () => {
  ctx.strokeStyle = `rgb(${METAL})`; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath();
  nodes.forEach((n, k) => {
    const next = nodes[(k + 1) % 6];
    ctx.moveTo(n.x, n.y); ctx.lineTo(next.x, next.y); ctx.moveTo(...n.terminal); ctx.lineTo(...next.terminal);
  });
  ctx.stroke();
};
// a link's terminal: a hexagon like the capacitor, glowing as it does
const drawTerminal = (n, glow) => {
  const r = Signet.CORE * SIGNET * g, [x, y] = n.terminal;
  ctx.fillStyle = glow; ctx.beginPath();
  for (const [vx, vy] of HEX) ctx.lineTo(x + vx * r, y + vy * r);
  ctx.fill();
};
// the rim's colour, heat included
const rim = (n) => mix(n.warm ? CARMESI : METAL, HEAT, 0.6 * n.heat);
// the arrow, drawn over its node: as the node opens, it takes on the colour of the rim it sharpens
const drawArrow = (n) => {
  const unit = lw / 10.5, tip = TIP * g + BEYOND * lw, [tx, ty] = [cx + n.ux * tip, cy + n.uy * tip];
  ctx.fillStyle = `rgb(${mix(METAL, rim(n), clamp((n.level - CLOSED) / (OPEN - CLOSED), 0, 1))})`; ctx.beginPath();
  for (const [px, py] of ARROW) {
    const back = (py + 15.84) * unit, side = px * unit;
    ctx.lineTo(tx - n.ux * back - n.uy * side, ty - n.uy * back + n.ux * side);
  }
  ctx.fill();
};
const drawNode = (n) => {
  const R = n.level * g;
  ctx.beginPath(); for (const [vx, vy] of HEX) ctx.lineTo(n.x + vx * R, n.y + vy * R); ctx.closePath();
  ctx.fillStyle = n.warm ? '#121212' : '#ffffff'; ctx.fill();
  ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.strokeStyle = `rgb(${rim(n)})`; ctx.stroke();
};
// the paper bared under a piece of text, as much as it shows
const clear = (x, y, a) => {
  if (a <= 0) return;
  const r = 0.4 * g;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(bare, (x - r) * dpr, (y - r) * dpr, 2 * r * dpr, 2 * r * dpr, x - r, y - r, 2 * r, 2 * r);
  ctx.globalAlpha = 1;
};
// the paper under a piece of text that goes at a given time, the lattice coming back once it has gone
const bared = (x, y, gone) => clear(x, y, t < gone ? 1 : 1 - (t - gone) / REFILL);

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
      cells.set(key(s.i, s.j), { x, y, ch: pick(), born: t, q: quiet(s.i, s.j, x, y) });
    }
  }
  // two heads on the same point have met
  const met = new Map();
  for (const s of heads) {
    if (s.spark) continue;
    const k = key(s.i, s.j), other = met.get(k);
    if (!other) met.set(k, s);
    else if (popUp(s.i, s.j)) { spawn(s); spawn(other); }
  }

  // the headline: once a struck one has faded and the lattice has come back, the next takes its place
  if (!headline.armed && [...headline.cells.values()].every((c) => t > c.open + headline.hold + headline.fade + REFILL)) {
    headline.turn++; setHeadline(headline.slot);
  }
  for (let k = popups.length - 1; k >= 0; k--) if (t > popups[k].end) popups.splice(k, 1);

  // ---------- the text, and under it bare paper: wherever text shows the lattice gives way, and once it has
  // gone, comes back. Where a headline, a pop-up or the name shows, the code does not
  const texts = [{ cells: [...headline.cells.values()], hold: headline.hold, fade: headline.fade },
                 ...popups.filter((p) => !p.img)];
  const covered = new Set(inked);
  for (const text of texts) for (const c of text.cells) {
    if (t < c.open) continue;
    const gone = c.open + text.hold + text.fade;
    if (t < gone) covered.add(key(c.i, c.j));
    bared(c.x, c.y, gone);
  }
  for (const e of popups) if (e.img) for (const c of e.cells) {
    if (t < c.open) continue;
    if (t < c.open + DECODE) covered.add(key(c.i, c.j));
    bared(c.x, c.y, c.open + DECODE);
  }
  const trail = [];
  for (const [k, c] of cells) {
    const age = t - c.born, a = covered.has(k) ? 0 : Math.pow(Math.max(0, 1 - age / LIFE), 1.6) * 0.42 * c.q;
    if (a >= 0.012) { trail.push([c, a, age]); c.seen = true; clear(c.x, c.y, 1); continue; }
    if (!c.seen) { if (age > LIFE) cells.delete(k); continue; }
    c.gone ??= t;
    if (t > c.gone + REFILL) cells.delete(k); else bared(c.x, c.y, c.gone);
  }

  ctx.font = `${(g * 0.6).toFixed(1)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [c, a, age] of trail) {
    ctx.fillStyle = age < 0.09 ? `rgba(${HEAD},${Math.min(1, a * 1.9).toFixed(3)})` : `rgba(${INK},${a.toFixed(3)})`;
    ctx.fillText(c.ch, c.x, c.y);
  }
  // a headline or a quote: gold, but for a wordless quote's symbols, in ink, and its clef, in carmesí
  for (const text of texts) for (const c of text.cells) {
    const age = t - c.open;
    if (age < 0 || c.ch === ' ') continue;
    if (age < DECODE) { scramble(c.x, c.y, age); continue; }
    const a = shown(c.open, text.hold, text.fade);
    if (a <= 0) continue;
    if (c.ch === '𝄞') { ctx.globalAlpha = a; ctx.drawImage(clef, c.x - g * 0.22, c.y - g * 0.62, g * 0.44, g * 1.24); ctx.globalAlpha = 1; continue; }
    ctx.fillStyle = `rgba(${c.ink ? INK : HEAD},${a.toFixed(3)})`; ctx.fillText(c.ch, c.x, c.y);
  }

  // an equation: from where the heads met the strike runs out over its box, and cell by cell the code gives
  // way to its ink, on its halo of paper. Once it all shows, the ink fades as one, and then the halo, letting
  // the lattice back
  for (const e of popups) {
    if (!e.img) continue;
    const open = [];
    for (const c of e.cells) {
      const age = t - c.open;
      if (age >= DECODE) open.push(c); else if (age >= 0) scramble(c.x, c.y, age);
    }
    if (!open.length) continue;
    ctx.save();
    if (open.length < e.cells.length) {
      ctx.beginPath();
      for (const c of open) { for (const [vx, vy] of CELL) ctx.lineTo(c.x + vx * g, c.y + vy * g); ctx.closePath(); }
      ctx.clip();
    }
    ctx.globalAlpha = clamp(1 - (t - e.fade - EQUATION.fade) / REFILL, 0, 1); ctx.drawImage(...e.halo);
    ctx.globalAlpha = clamp(1 - (t - e.fade) / EQUATION.fade, 0, 1); ctx.drawImage(gold(e.img), ...e.box);
    ctx.restore();
  }

  // the links, and the light a hit sets running along them both ways
  const light = Signet.light(), glow = Signet.glow();
  drawEdges();
  for (const n of nodes) drawLink(n, light);
  for (let p = pulses.length - 1; p >= 0; p--) {
    const u = pulses[p], n = u.n;
    u.d += u.v * PULSE * dt;
    if (!u.through && u.d > M - n.level && u.d < M + n.level) { n.heat = 1; u.through = true; u.d = u.v > 0 ? M + n.level : M - n.level; }
    if (u.v < 0 && u.d <= COARSE) { Signet.bump(n.ring, n.way); pulses.splice(p, 1); continue; }
    if (u.v > 0 && u.d >= TIP) {
      // the arrow lets the light go on, half the time, as a head of its own
      if (Math.random() < 0.5) heads.push({ i: n.step[0] * TIP, j: n.step[1] * TIP, d: n.k, wait: 0.05, pace: 0.08, spark: true });
      pulses.splice(p, 1); continue;
    }
    const [lo, hi] = u.d < M ? [COARSE, M - n.level] : [M + n.level, TIP];
    const tail = clamp(u.d - u.v * 2.4, lo, hi), head = clamp(u.d, lo, hi);
    if (head === tail) continue;
    const [hx, hy] = [cx + n.ux * head * g, cy + n.uy * head * g], [tx, ty] = [cx + n.ux * tail * g, cy + n.uy * tail * g];
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'rgba(250,208,42,0)'); grad.addColorStop(1, 'rgba(255,236,150,1)');
    ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(250,208,42,.9)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
  }
  for (const n of nodes) { drawTerminal(n, glow); drawNode(n); drawArrow(n); }
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
