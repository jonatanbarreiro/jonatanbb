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
  const LEVELS = 32;      // discrete heat levels for the letters — many, so the cool-down reads smooth

  // ---- scatter the sample field: a fresh draw on every load ---------------
  // seeded from the clock so the arrangement differs each time the page opens.
  // BLUE NOISE, by best-candidate sampling: each point is the best of K uniform
  // candidates — the one farthest from every point already placed. Well-spread
  // like a grid never is, irregular like a uniform draw, but without the weird
  // clusters a uniform draw sometimes lands.
  (function scatter() {
    // Density, not a fixed count: the field spreads over the WHOLE page width (the side
    // margins included, on purpose — they decorate a wide screen), and the density sets
    // what the CONTENT COLUMN (max-width 1080px) would hold — on a wide screen that means
    // proportionally more points overall. HALVED from the old ~17-per-column: the cracks
    // only flash with the pulse now, so the field reads sparse, not like a fracture map.
    const fullW = Math.max(360, window.innerWidth || 1024);
    const contentW = Math.min(fullW, 1080);
    const M = Math.max(9, Math.min(32, Math.round(8.5 * 1.15 * fullW / contentW)));
    const K = 24, margin = 3;
    let seed = Date.now() >>> 0;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const placed = [];
    while (placed.length < M) {
      let best = null, bestD = -1;
      for (let c = 0; c < K; c++) {
        const x = margin + rand() * (100 - 2 * margin);
        const y = 8 + rand() * 84;              // kept between the two anchors (see layoutDots' exact clip)
        let d = Infinity;
        for (const p of placed) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < d) d = dd; }
        if (d > bestD) { bestD = d; best = { x, y }; }
      }
      placed.push(best);
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
  // to that letter; positioned by layoutDots() once the text is laid out. This is the
  // 'I' — the pulse root, and the root of the crack tree.
  const iSpan = document.querySelector(".hero__i");
  const iDot = document.createElement("span");
  iDot.className = "pt pt--i";
  field.appendChild(iDot);

  // A third hardcoded point on the 'i' of "get in touch" — the field's bottom anchor
  // (the 'i'). A plain illuminating point otherwise; positioned by layoutDots().
  const iDotB = document.createElement("span");
  iDotB.className = "pt";
  field.appendChild(iDotB);

  const dotEls = [...field.querySelectorAll(".pt")];
  const dotPos = [];      // page-space centre of each dot, cached by layoutDots()
  let ptPx = 24;          // perceived dot diameter in px (set by layoutDots); also the drag hit size

  // ---- ignition: the load sequence ----------------------------------------
  // On load nothing is lit — only the page and the bare black dots. The dot on the
  // 'i' first GATHERS light: it begins wrapped in a glow as wide as the whole page
  // and pulls it inward over PREAMBLE seconds, warming from black to gold along the
  // annulus' own colour path as the glow tightens onto the point's natural reach.
  // Then it FREES that light as a pulse — a main front from the point, an announcer
  // born a natural-reach ahead (the gathered glow itself), a requiem born a moment
  // behind — draining the i-dot back to black as it goes. The pulse sweeps the page:
  // each point lights up as the announcer reaches it, is full at the main front, then
  // drains LINEARLY to half at the requiem and EMBER-COOLS to black (the ring message's
  // own fade) — and only once it is that first-load black dot again does it bulb on as a
  // real light whose glow and logo-light track the bulb. The logo (each b element, each
  // ring arc) responds in step, timed from the i-dot, but excited only while the wave
  // passes: rising to the front, then draining linearly to zero a requiem-gap behind it.
  // Reloads must not replay the browser's remembered scroll: the spacers sized below
  // (the lede clear, the logo margin fix) land after the restore and shift the page
  // under it, so every F5 compounded into a fresh, random-feeling jump. The load
  // sequence is built from the top anyway — every load starts there.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const iIndex = dotEls.indexOf(iDot);       // the 'I' (top anchor / pulse root)
  const iIndexB = dotEls.indexOf(iDotB);     // the 'i' (bottom anchor)
  const centreIndex = dotEls.indexOf(centreDot);   // the logo-centre dot (not a crack node)
  const IGN = {
    SPEED: 640,        // pulse radius growth (px/s)
    PREAMBLE: 2.0,     // the i-dot gathers its glow this long before the pulse (s)
    TRAIL: 130,        // requiem ring, born this far behind the main front (px)
    P_BULB: 0.80,      // a point's own bulb, once it has ember-cooled back to black (s)
  };
  // lead/trail are refreshed per frame: the announcer leads by the point's natural
  // reach (so the gathered glow becomes the announcer); the requiem trails by TRAIL.
  const ign = { on: !reduceMotion, start: 0, Tp: 0, lead: 0, trail: 130 };

  // a hesitant light-bulb: black, a couple of near-deaths, then a steady glow
  const BULB_KF = [[0,0],[0.06,0.55],[0.12,0.07],[0.22,0.82],[0.30,0.20],
                   [0.46,1],[0.56,0.50],[0.66,1],[1,1]];
  function bulb(t) {
    if (t <= 0) return 0; if (t >= 1) return 1;
    for (let i = 0; i < BULB_KF.length - 1; i++) {
      const a = BULB_KF[i], b = BULB_KF[i + 1];
      if (t <= b[0]) return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
    }
    return 1;
  }
  // The pulse envelope a logo piece feels, by its distance r from the i-dot. The pulse
  // is three expanding circumferences: announcer (lead ahead), main front (at r), requiem
  // (trail behind). A piece is excited only while the wave is actually passing it: dark
  // until the announcer arrives, rising linearly to full at the main front, then DRAINING
  // linearly — to half at the requiem, to zero a requiem-gap later (same rate) — and dark
  // after. This is only TIMING and level; the direction is applied where the piece paints.
  function pulseEnv(r) {
    const Tp = ign.Tp; if (Tp < 0) return 0;
    const leadT = ign.lead / IGN.SPEED, delta = ign.trail / IGN.SPEED;
    const aT = (r - ign.lead) / IGN.SPEED, mT = r / IGN.SPEED, rT = (r + ign.trail) / IGN.SPEED;
    if (Tp < aT) return 0;
    if (Tp < mT) return (Tp - aT) / (leadT || 1);             // rise 0 -> 1 (announcer -> main)
    if (Tp < rT) return 1 - 0.5 * (Tp - mT) / (delta || 1);   // 1 -> 0.5 (main -> requiem)
    if (Tp < rT + delta) return 0.5 - 0.5 * (Tp - rT) / (delta || 1);   // 0.5 -> 0, same rate
    return 0;
  }
  // The pulse envelope a b ELEMENT feels. An element has extent, so it reads the wave by
  // two distances from the i-dot: its nearest VERTEX rV (where the announcer first touches —
  // it begins to light) and its CENTRE OF MASS rC (where the main front sits — it is FULLY
  // lit, mostly yellow). It rises linearly from the first to the second, then drains linearly
  // to half as the requiem reaches the centre and to zero a requiem-gap later. Returns env
  // (level) and rise (0 at the announcer, 1 from the front on — fades the raking to flat max).
  function elemEnv(rV, rC) {
    const Tp = ign.Tp; if (Tp < 0) return { env: 0, rise: 0 };
    const Rp = IGN.SPEED * Tp, trail = ign.trail;
    const startR = rV - ign.lead, span = (rC - startR) || 1;
    const rise = Math.max(0, Math.min(1, (Rp - startR) / span));
    let env;
    if (Rp < startR) env = 0;
    else if (Rp < rC) env = (Rp - startR) / span;                       // 0 -> 1 (announcer@vertex -> front@centre)
    else if (Rp < rC + trail) env = 1 - 0.5 * (Rp - rC) / (trail || 1); // 1 -> 0.5 (front -> requiem@centre)
    else if (Rp < rC + 2 * trail) env = 0.5 - 0.5 * (Rp - rC - trail) / (trail || 1);  // 0.5 -> 0, same rate
    else env = 0;
    return { env, rise };
  }
  // each dot's visual wake level (--lit), and the i-dot's incandescent core colour
  // during the gather/drain, written only when they actually change
  const litCache = new Array(dotEls.length).fill(-1);
  function setLit(i, v) {
    if (Math.abs(v - litCache[i]) < 0.004) return;
    litCache[i] = v;
    dotEls[i].style.setProperty("--lit", v.toFixed(3));
  }
  let coreCache = "\0";
  function setCore(col) {                 // override the i-dot core colour (annulus ember path); "" clears
    if (col === coreCache) return;
    coreCache = col;
    if (col) iDot.style.setProperty("--core-col", col);
    else iDot.style.removeProperty("--core-col");
  }

  // ---- dragging: points and the logo are movable (see the pointer handlers near
  // the bottom). A grabbed dot is repositioned in page space; the logo is shifted
  // in viewport space via the --sig-* offset the .signet transform reads.
  const root = document.documentElement;
  let drag = null;        // active drag: {kind:'dot',i,el,ox,oy} | {kind:'logo',ox,oy,baseDx,baseDy}
  let logoDx = 0, logoDy = 0;   // current logo viewport offset (px), applied through --sig-dx/dy
  let geo = null;         // last frame's circle geometry {cx,cy,R,scale,rIn,rOut} — for hit-testing
  let lightsOn = true;    // master light toggle (the bulb): off kills the points, the lights and the roll

  // ---- the carved ring message, drawn on its own canvas (NOT a separate SVG
  // layer) so it repaints in the same pass as the bands and can't lag them ----
  const STR = "WILLING TO WORK";
  const chars = [...STR];
  let letterOff = [];     // each letter's signed angular offset from the string centre
  const heat = new Array(chars.length).fill(0);     // each letter's current heat (0..1)
  const heatPeak = new Array(chars.length).fill(0); // the heat it last (re)lit to
  const heatAge  = new Array(chars.length).fill(0); // seconds since that peak
  let heatT = 0;          // timestamp of the last heat update (ms)
  // Cool-down for the ring letters is a STRETCHED exponential exp(-(age/τ)^β): a hot letter
  // holds its glow a moment, then falls off so it's fully gone ~3s after illumination — a
  // slow ember fade (τ trimmed again, each pass landing the full-bright fade ~1s sooner). The
  // points reuse it for their own ember tail. (The b faces no longer cool — they light only.)
  const COOL_TAU = 1.1, COOL_BETA = 1.6;
  const coolDecay = age => Math.exp(-Math.pow(age / COOL_TAU, COOL_BETA));
  // seconds for a half-lit ember (0.5·coolDecay) to fade to a black dot; the bulb waits for it
  let COOL_DONE = 0; for (let a = 0; a < 12; a += 0.02) { if (0.5 * coolDecay(a) < 0.02) { COOL_DONE = a; break; } }

  // A point's wake level (--lit) under the pulse, by its distance r from the i-dot. It
  // matches the ring message's life: dark until the announcer arrives, a linear rise to
  // full at the main front, a linear drain to half at the requiem, then the message's own
  // stretched-exponential ember cool to black — and only then (the first-load black dot
  // again) does its bulb play, settling into steady light. Returns {lit, phase}.
  function pointLit(r) {
    const Tp = ign.Tp;
    const leadT = ign.lead / IGN.SPEED, delta = ign.trail / IGN.SPEED;
    const aT = (r - ign.lead) / IGN.SPEED, mT = r / IGN.SPEED, rT = (r + ign.trail) / IGN.SPEED;
    if (Tp < aT) return { lit: 0, phase: "pre" };
    if (Tp < mT) return { lit: (Tp - aT) / (leadT || 1), phase: "rise" };       // 0 -> 1
    if (Tp < rT) return { lit: 1 - 0.5 * (Tp - mT) / (delta || 1), phase: "fall" };   // 1 -> 0.5
    const age = Tp - rT;
    if (age < COOL_DONE) return { lit: 0.5 * coolDecay(age), phase: "cool" };    // 0.5 -> black
    return { lit: bulb((age - COOL_DONE) / IGN.P_BULB), phase: "bulb" };
  }
  // The centre dot alone puts tone(GAIN_IN) ≈ 0.59 on the whole inner wall; the
  // letters must stay dark under that resting glow and only heat from EXTRA light.
  // letters read as lit above TXT_T0. The central point alone puts ~0.593 on the arc it
  // sees; TXT_T0 sits just under that so WORK (rotated onto that arc) reads as a faint
  // cue, while letters off the arc stay dark until EXTRA light heats them.
  const TXT_T0 = 0.55, TXT_T1 = 1.0;
  const FAMILY = "'Inter', system-ui, -apple-system, sans-serif";
  const FONT_FRAC = 0.35;             // letter font px as a fraction of the ring thickness (subtle, sits within the band)
  const R_OVER_THK = 120 / 17.537;    // mid radius / ring thickness (= 6.843), scale-free
  const CENTRE_ANG = Math.PI;         // the string is centred on the left arc (faces screen centre)
  const STRING_ROT = -Math.PI / 5;    // turn the whole string π/5 anticlockwise so WORK lands on the
                                      // arc the central point lights — WORK alone reads as a faint cue
  // The ring message is REAL DOM TEXT, not a canvas: a fixed layer of one <span> per letter,
  // each positioned + rotated onto the ring and recoloured by the light on its arc. Real glyphs
  // stay crisp at any rotation (no canvas raster + downsample softening them), and a handful of
  // transform/colour writes per frame costs almost nothing — where the old supersampled,
  // full-viewport letters canvas was the page's single heaviest per-frame paint.
  const lettersLayer = document.getElementById("ring-letters");
  const mctx = document.createElement("canvas").getContext("2d");   // offscreen, for glyph metrics only
  const letterEls = [];                                  // one span per letter (null for spaces)
  const letterLvl = new Array(chars.length).fill(-1);    // last heat level written (skip redundant recolours)
  const letterTf  = new Array(chars.length).fill("");    // last transform written (skip redundant moves)
  if (lettersLayer) for (const ch of chars) {
    if (ch === " ") { letterEls.push(null); continue; }
    const el = document.createElement("span");
    el.textContent = ch; el.style.opacity = "0";
    lettersLayer.appendChild(el); letterEls.push(el);
  }

  // The site's gold&black mixing path: how partial illumination looks. A lit thing
  // does NOT fade linearly from black to gold (that passes through cool olive) — it
  // warms through dark amber first, black-body-ish, and lands exactly on the official
  // gold #fad02a (--gold) at full. Shared by the ring letters, the b faces, the
  // annulus bands and the i-dot core, so every half-lit gold on the page agrees.
  // Tail kept YELLOW (G tracks R closely): the earlier stops leaned brown/bronze at
  // low light and read olive on the b's next to a clicked word's true gold.
  const HEAT = [[0.00, 38, 32, 10], [0.45, 158, 124, 28], [1.00, 250, 208, 42]];
  function incRGB(t) {
    let a = HEAT[0], b = HEAT[HEAT.length - 1];
    for (let i = 0; i < HEAT.length - 1; i++)
      if (t >= HEAT[i][0] && t <= HEAT[i + 1][0]) { a = HEAT[i]; b = HEAT[i + 1]; break; }
    const f = (t - a[0]) / ((b[0] - a[0]) || 1);
    return [Math.round(a[1] + (b[1]-a[1])*f), Math.round(a[2] + (b[2]-a[2])*f), Math.round(a[3] + (b[3]-a[3])*f)];
  }
  function incandescent(t) { const c = incRGB(t); return `rgb(${c[0]},${c[1]},${c[2]})`; }

  // ---- the monogram's true outline, for a smooth boundary reflection -----
  const markEl  = document.querySelector(".signet__mark");   // rotating logo group (b's)
  const MARK_BASE = "translate(200 200) scale(0.835096) translate(-107.637 -168.3)";
  let rotRad = 0;                                            // current logo rotation (radians)
  let lettersWarm = false;                                   // any ring letter still cooling?
  let bSilVp = null;                                         // both b's viewport silhouettes (per frame)
  let castBlur = 0;                                          // current cast-canvas blur in px (set by sizeCanvas)
  const reflectCanvas = document.getElementById("reflect-canvas");
  const ctx = reflectCanvas ? reflectCanvas.getContext("2d") : null;
  const castCanvas = document.getElementById("cast-canvas");
  const cctx = castCanvas ? castCanvas.getContext("2d") : null;
  const pulseCanvas = document.getElementById("pulse-canvas");
  const pctx = pulseCanvas ? pulseCanvas.getContext("2d") : null;
  const crackCanvas = document.getElementById("crack-canvas");
  const krctx = crackCanvas ? crackCanvas.getContext("2d") : null;
  const DIFFUSE = 1.4;                              // reflect-canvas blur (CSS px ≈ DIFFUSE × s)
  const CAST_ALPHA = 0.16;                          // peak alpha reference (the gather glow)
  const GLOW_PEAK = 0.22;                           // peak alpha of a point's radial glow — the atmospheric layer; reflect.js carries the rest
  const PRIM = [[27.5,86.5],[21,93],[21,58],[49.5,86.5],[0,136],[0,1.445],[4.856,8.7]];
  const USES = [[44.6,81.8],[119,57.75]];
  const KLOGO = 0.835096;
  const gX = x => 200 + KLOGO * (x - 107.637);
  const gY = y => 200 + KLOGO * (y - 168.3);

  // ===== b illumination =============================================
  // The 'b' is split into 9 pieces (2 tips, 4 sticks, 3 joints), each into 2 elements
  // (left/right) — the unit objects of lighting. An interior light inside a b's 7-8-9
  // triangle lands in one of 7 regions; the region fixes which elements light (on their
  // inner face). The whole model — corners, pieces, elements, the 7 regions and the 3
  // exterior half-planes, with every lit set — is documented in
  //   version0/assets/illumination/   (bb.txt + the b-split*/b-out* svgs).
  // Geometry below is in canonical bb-primitive units for one b (the two b's share it
  // under their USE translate). Each element carries the face it shows the light f=[A,B],
  // that face's outward normal n, and the inward reach profile p (depth at 11 samples
  // along A->B: constant for a rectangle, tapering to the point for a triangle).
  const B_TRI = [[-5.2500,-15.8371],[-5.2500,148.6746],[56.9246,86.5000]];
  const B_REG = [
    [[56.9246,86.5000],[15.7500,45.3254],[15.7500,16.8307]],
    [[15.7500,45.3254],[15.7500,16.8307],[9.2189,5.7798],[5.2500,8.4363],[5.2500,34.8254]],
    [[15.7500,45.3254],[5.2500,34.8254],[5.2500,116.1746],[15.7500,105.6746]],
    [[15.7500,105.6746],[5.2500,116.1746],[5.2500,123.3254],[15.7500,112.8254]],
    [[15.7500,105.6746],[15.7500,112.8254],[34.7877,93.7877],[31.2123,90.2123]],
    [[34.7877,93.7877],[42.0754,86.5000],[38.5000,82.9246],[31.2123,90.2123]],
    [[31.2123,90.2123],[38.5000,82.9246],[26.2500,70.6746],[26.2500,85.2500]]];
  const B_EL = [
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 0 toptip-left (never lit)
    {f:[[5.2500,8.4363],[9.2189,5.7798]],n:[0.5562,0.8310],p:[0.026,2.601,5.202,7.804,10.405,13.006,15.607,18.209,20.810,23.411,25.986]}, // 1 toptip-right
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 2 stick1-left (never lit)
    {f:[[5.2500,8.4363],[5.2500,123.3254]],n:[1.0000,0.0000],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 3 stick1-right
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 4 joint1-left (never lit)
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 5 joint1-right (never lit)
    {f:[[5.2500,123.3254],[42.0754,86.5000]],n:[-0.7071,-0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 6 stick2-left
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 7 stick2-right (never lit)
    {f:[[56.9246,86.5000],[49.5000,79.0754]],n:[0.7071,-0.7071],p:[0.010,1.050,2.100,3.150,4.200,5.250,6.300,7.350,8.400,9.450,10.489]}, // 8 joint2-right
    {f:[[0,0],[0,0]],n:[0,0],p:[]}, // 9 joint2-left (never lit)
    {f:[[26.2500,70.6746],[42.0754,86.5000]],n:[-0.7071,0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 10 stick3-left
    {f:[[49.5000,79.0754],[33.6746,63.2500]],n:[0.7071,-0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 11 stick3-right
    {f:[[15.7500,45.3254],[15.7500,70.6746]],n:[-1.0000,0.0000],p:[0.010,1.050,2.100,3.150,4.200,5.250,6.300,7.350,8.400,9.450,10.489]}, // 12 joint3-left
    {f:[[33.6746,63.2500],[15.7500,45.3254]],n:[0.7071,-0.7071],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 13 joint3-right
    {f:[[15.7500,85.2500],[15.7500,70.6746]],n:[-1.0000,0.0000],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 14 stick4-left
    {f:[[26.2500,85.2500],[26.2500,70.6746]],n:[1.0000,0.0000],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 15 stick4-right
    {f:[[15.7500,85.2500],[15.7500,105.6746]],n:[-1.0000,0.0000],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 16 innertip-left
    {f:[[15.7500,105.6746],[31.2123,90.2123]],n:[0.7071,0.7071],p:[0.007,0.702,1.403,2.105,2.807,3.509,4.211,4.912,5.614,6.316,7.011]}, // 17 innertip-right
  ];
  const B_LIT = [[13,11,8,1,3],[13,11,8,1,3,12,14,16,6],[1,3,12,14,16,6],[10,1,3,12,14,16,6,17],[3,6,10,17],[3,6,10,17,15],[6,10,17,15]];
  const GAIN_B = 70;        // interior (region) face illuminance gain (cosβ/dist), tuned to the ring-band look
  const GAIN_B_EXT = 360;   // exterior face gain: exterior lights graze from across the annulus, so they
                            // need a much larger gain to read as strongly as an interior light does
  // B_POLY: each element's full polygon (point-in-element test). B_SIL: the 12-corner
  // silhouette. B_OUT: each element's OUTER face + inward profile. B_G_*: which elements
  // an exterior light beyond each triangle edge lights — edge 7-8 -> the left elements,
  // 8-9 -> the bottom, 7-9 -> the belly elements seen through the open mouth (lit on
  // their inner face). See bb.txt.
  const B_POLY = [
    [[-5.2500,-15.8371],[5.2500,8.4363],[-5.2500,8.4363]],
    [[5.2500,8.4363],[9.2189,5.7798],[-5.2500,-15.8371]],
    [[-5.2500,8.4363],[0.0000,8.4363],[0.0000,123.3254],[-5.2500,123.3254]],
    [[0.0000,8.4363],[5.2500,8.4363],[5.2500,123.3254],[0.0000,123.3254]],
    [[5.2500,123.3254],[-5.2500,148.6746],[-5.2500,123.3254]],
    [[5.2500,123.3254],[12.6746,130.7500],[-5.2500,148.6746]],
    [[5.2500,123.3254],[42.0754,86.5000],[45.7877,90.2123],[8.9623,127.0377]],
    [[8.9623,127.0377],[45.7877,90.2123],[49.5000,93.9246],[12.6746,130.7500]],
    [[49.5000,79.0754],[42.0754,86.5000],[56.9246,86.5000]],
    [[49.5000,93.9246],[56.9246,86.5000],[42.0754,86.5000]],
    [[42.0754,86.5000],[45.7877,82.7877],[29.9623,66.9623],[26.2500,70.6746]],
    [[45.7877,82.7877],[49.5000,79.0754],[33.6746,63.2500],[29.9623,66.9623]],
    [[26.2500,70.6746],[15.7500,45.3254],[15.7500,70.6746]],
    [[26.2500,70.6746],[33.6746,63.2500],[15.7500,45.3254]],
    [[15.7500,70.6746],[21.0000,70.6746],[21.0000,85.2500],[15.7500,85.2500]],
    [[26.2500,85.2500],[26.2500,70.6746],[21.0000,70.6746],[21.0000,85.2500]],
    [[26.2500,85.2500],[15.7500,85.2500],[15.7500,105.6746]],
    [[26.2500,85.2500],[15.7500,105.6746],[31.2123,90.2123]]];
  // each element's centre of mass (the pulse peaks on the element when the main front sits
  // here). Every B_POLY is a triangle or a parallelogram, so the vertex mean IS the centroid.
  const B_CEN = B_POLY.map(poly => {
    let x = 0, y = 0; for (const v of poly) { x += v[0]; y += v[1]; }
    return [x / poly.length, y / poly.length];
  });
  const B_SIL = [[26.2500,85.2500],[26.2500,70.6746],[42.0754,86.5000],[5.2500,123.3254],[5.2500,8.4363],[9.2189,5.7798],[-5.2500,-15.8371],[-5.2500,148.6746],[56.9246,86.5000],[15.7500,45.3254],[15.7500,105.6746],[31.2123,90.2123]];
  const B_OUT = [
    {f:[[-5.2500,8.4363],[-5.2500,-15.8371]],n:[-1,0],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 0 toptip-left
    {f:[[5.2500,8.4363],[9.2189,5.7798]],n:[0.5562,0.8310],p:[0.026,2.601,5.202,7.804,10.405,13.006,15.607,18.209,20.810,23.411,25.986]}, // 1 toptip-right
    {f:[[-5.2500,123.3254],[-5.2500,8.4363]],n:[-1,0],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 2 stick1-left
    {f:[[5.2500,8.4363],[5.2500,123.3254]],n:[1,0],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 3 stick1-right
    {f:[[-5.2500,148.6746],[-5.2500,123.3254]],n:[-1,0],p:[0.010,1.050,2.100,3.150,4.200,5.250,6.300,7.350,8.400,9.450,10.489]}, // 4 joint1-left
    {f:[[12.6746,130.7500],[-5.2500,148.6746]],n:[0.7071,0.7071],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 5 joint1-right
    {f:[[5.2500,123.3254],[42.0754,86.5000]],n:[-0.7071,-0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 6 stick2-left
    {f:[[49.5000,93.9246],[12.6746,130.7500]],n:[0.7071,0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 7 stick2-right
    {f:[[56.9246,86.5000],[49.5000,79.0754]],n:[0.7071,-0.7071],p:[0.010,1.050,2.100,3.150,4.200,5.250,6.300,7.350,8.400,9.450,10.489]}, // 8 joint2-right
    {f:[[49.5000,93.9246],[56.9246,86.5000]],n:[0.7071,0.7071],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 9 joint2-left
    {f:[[26.2500,70.6746],[42.0754,86.5000]],n:[-0.7071,0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 10 stick3-left
    {f:[[49.5000,79.0754],[33.6746,63.2500]],n:[0.7071,-0.7071],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 11 stick3-right
    {f:[[15.7500,45.3254],[15.7500,70.6746]],n:[-1,0],p:[0.010,1.050,2.100,3.150,4.200,5.250,6.300,7.350,8.400,9.450,10.489]}, // 12 joint3-left
    {f:[[33.6746,63.2500],[15.7500,45.3254]],n:[0.7071,-0.7071],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 13 joint3-right
    {f:[[15.7500,85.2500],[15.7500,70.6746]],n:[-1,0],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 14 stick4-left
    {f:[[26.2500,85.2500],[26.2500,70.6746]],n:[1,0],p:[5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250,5.250]}, // 15 stick4-right
    {f:[[15.7500,85.2500],[15.7500,105.6746]],n:[-1,0],p:[10.489,9.450,8.400,7.350,6.300,5.250,4.200,3.150,2.100,1.050,0.010]}, // 16 innertip-left
    {f:[[15.7500,105.6746],[31.2123,90.2123]],n:[0.7071,0.7071],p:[0.007,0.702,1.403,2.105,2.807,3.509,4.211,4.912,5.614,6.316,7.011]}, // 17 innertip-right
  ];
  const B_G_LEFT = [0,2,4], B_G_BOT = [5,7,9], B_G_MOUTH = [1,13,11,8,3];   // mouth also lights stick1-right (the stem's inner element, seen through the mouth)

  // one b's local frame <-> viewport (t = its USE translate; cR,sR = live rotation)
  function vpToPrim(px, py, t, cx, cy, scale, cR, sR) {
    const u = (px - cx) / scale, w = (py - cy) / scale;
    return [(u * cR + w * sR) / KLOGO + 107.637 - t[0], (-u * sR + w * cR) / KLOGO + 168.3 - t[1]];
  }
  function primToVp(qx, qy, t, cx, cy, scale, cR, sR) {
    const X = KLOGO * (qx + t[0] - 107.637), Y = KLOGO * (qy + t[1] - 168.3);
    return [cx + (X * cR - Y * sR) * scale, cy + (X * sR + Y * cR) * scale];
  }
  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  // do open segments AB and CD properly cross?
  function segInt(ax, ay, bx, by, cx2, cy2, dx, dy) {
    const r1x = bx-ax, r1y = by-ay, r2x = dx-cx2, r2y = dy-cy2;
    const den = r1x*r2y - r1y*r2x; if (Math.abs(den) < 1e-9) return false;
    const t = ((cx2-ax)*r2y - (cy2-ay)*r2x) / den;
    const s = ((cx2-ax)*r1y - (cy2-ay)*r1x) / den;
    return t > 1e-4 && t < 1-1e-4 && s > 1e-4 && s < 1-1e-4;
  }
  function segCrossPoly(px, py, qx, qy, poly) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
      if (segInt(px, py, qx, qy, poly[j][0], poly[j][1], poly[i][0], poly[i][1])) return true;
    return false;
  }
  // is point p on the OUTER side of triangle edge tri[i]-tri[j] (opposite the 3rd vertex)?
  function sideOut(p, tri, i, j) {
    const k = 3 - i - j, ax = tri[i][0], ay = tri[i][1], ex = tri[j][0]-ax, ey = tri[j][1]-ay;
    const sp = ex*(p[1]-ay) - ey*(p[0]-ax), sk = ex*(tri[k][1]-ay) - ey*(tri[k][0]-ax);
    return sp * sk < 0;
  }

  // ---- b element illuminance per [b][face][element][sample]: face 0 = the element's
  // inner face (interior / mouth lights), face 1 = its outer face (exterior lights).
  // Elements glow incandescent at their CURRENT illumination — no heat memory, no cool-down.
  const BHN = 2*2*18*11, bhBase = (b, face, el) => (((b*2+face)*18+el)*11);
  const bRaw = new Float32Array(BHN);
  // accumulate one light's cosβ/dist onto a face's 11 samples, skipping any sample whose
  // ray to it is blocked by a b silhouette in `occs` (a light never reaches a face
  // through solid logo). occs holds BOTH b's silhouettes, so this covers a face hidden
  // behind the other b AND a face hidden behind its own b's body (self-occlusion). The
  // ray ends ON the lit face, which is an edge of its own silhouette, but that touch is
  // at the segment's far end and segInt's open interval ignores it — only a true
  // intervening crossing blocks.
  function accFace(base, ax, ay, ex, ey, nx, ny, px, py, occs, gain) {
    for (let j = 0; j <= 10; j++) {
      const X = ax + ex*j/10, Y = ay + ey*j/10;
      let blocked = false;
      if (occs) for (let o = 0; o < occs.length; o++) if (segCrossPoly(px, py, X, Y, occs[o])) { blocked = true; break; }
      if (blocked) continue;
      const dx = px - X, dy = py - Y, dist = Math.hypot(dx, dy); if (dist < 0.001) continue;
      const cb = (nx*dx + ny*dy) / dist; if (cb > 0) bRaw[base + j] += gain * cb / dist;
    }
  }

  // Light and paint the b elements (on the reflect canvas, over the black b's). A region
  // light inside a b lights the elements of its region; an exterior light lights the outer
  // faces it sees by half-plane against the 7-8-9 edges; a light behind an element lights
  // that element (its own pass, below). All occluded by both b's. Elements glow at their
  // CURRENT illumination — no cool-down — so the nuanced lighting reads directly.
  function lightAndPaintB(cx, cy, scale, cR, sR, inn) {
    if (!ctx) return;
    bRaw.fill(0);
    const scl = KLOGO * scale, FACES = [B_EL, B_OUT];
    const ONEL_REACH = 31.5 * scl;   // a behind-element light heats only within this radius of itself
                                     // (6× a face's 5.25 half-ribbon width ≈ 1.5 annulus thicknesses)
    const ONEL_DEPTH = 0.5;          // and reaches only this fraction of the element's full depth
                                     // (iteration10 option B: 0 = no behind lighting, else 0.5 or 0.25)
    const FA = [[[],[]],[[],[]]], FB = [[[],[]],[[],[]]], FN = [[[],[]],[[],[]]], silVp = [];
    for (let b = 0; b < 2; b++) {
      const t = USES[b];
      silVp[b] = B_SIL.map(q => primToVp(q[0], q[1], t, cx, cy, scale, cR, sR));
      for (let face = 0; face < 2; face++)
        for (let el = 0; el < 18; el++) {
          const F = FACES[face][el];
          if (!F.p.length) { FA[b][face][el] = null; continue; }
          FA[b][face][el] = primToVp(F.f[0][0], F.f[0][1], t, cx, cy, scale, cR, sR);
          FB[b][face][el] = primToVp(F.f[1][0], F.f[1][1], t, cx, cy, scale, cR, sR);
          FN[b][face][el] = [F.n[0]*cR - F.n[1]*sR, F.n[0]*sR + F.n[1]*cR];
        }
    }
    const add = (b, face, el, px, py, occs, gain) => {
      const A = FA[b][face][el]; if (!A) return;
      const B = FB[b][face][el], N = FN[b][face][el];
      accFace(bhBase(b, face, el), A[0], A[1], B[0]-A[0], B[1]-A[1], N[0], N[1], px, py, occs, gain);
    };
    for (const p of inn) {
      const W = (p.w == null ? 1 : p.w) * (p.gate == null ? 1 : p.gate);   // wake level × logo-engagement
      if (W <= 0) continue;                                   // a not-yet-awake or too-far point lights nothing
      if (p.role === 'region' && p.ridx >= 0) {
        // a region light sees a face only through the open notch — occlude by both b's so it
        // lights just the slice it can actually see, not the whole face through intervening logo
        for (const el of B_LIT[p.ridx]) add(p.bk, 0, el, p.px, p.py, silVp, GAIN_B * W);
      } else if (p.role === 'ext') {
        for (let b = 0; b < 2; b++) {
          const pr = vpToPrim(p.px, p.py, USES[b], cx, cy, scale, cR, sR);  // occlude by both b's (near b and self)
          if (sideOut(pr, B_TRI, 0, 1)) for (const el of B_G_LEFT)  add(b, 1, el, p.px, p.py, silVp, GAIN_B_EXT * W);  // beyond 7-8
          if (sideOut(pr, B_TRI, 1, 2)) for (const el of B_G_BOT)   add(b, 1, el, p.px, p.py, silVp, GAIN_B_EXT * W);  // beyond 8-9
          if (sideOut(pr, B_TRI, 2, 0)) for (const el of B_G_MOUTH) add(b, 0, el, p.px, p.py, silVp, GAIN_B_EXT * W);  // beyond 9-7
        }
      }
    }
    // paint region/exterior faces at their current illumination (no cool-down)
    for (let b = 0; b < 2; b++) for (let face = 0; face < 2; face++) for (let el = 0; el < 18; el++) {
      const A = FA[b][face][el]; if (!A) continue;
      const base = bhBase(b, face, el), prof = FACES[face][el].p, hs = new Array(11);
      let mx = 0;
      for (let j = 0; j <= 10; j++) { const h = tone(bRaw[base + j]); hs[j] = h; if (h > mx) mx = h; }
      if (mx < 0.02) continue;
      paintFace(A, FB[b][face][el], FN[b][face][el], hs, prof, scl, 1);
    }

    // behind-element pass: each onEl light glows a localized hotspot on its element, reaching
    // only ONEL_DEPTH of the element's full depth (iteration10's behind-lighting reach option)
    if (ONEL_DEPTH > 0) for (const p of inn) {
      if (p.role !== 'onEl' || p.eidx < 0) continue;
      if ((p.w == null ? 1 : p.w) <= 0) continue;             // not awake yet
      const A = FA[p.bk][1][p.eidx]; if (!A) continue;
      const B = FB[p.bk][1][p.eidx], ax = A[0], ay = A[1], ex = B[0]-ax, ey = B[1]-ay;
      const prof = B_OUT[p.eidx].p, hs = new Array(11); let mx = 0;
      for (let j = 0; j <= 10; j++) {
        const X = ax + ex*j/10, Y = ay + ey*j/10, d = Math.hypot(p.px - X, p.py - Y);
        const h = d < ONEL_REACH ? tone(6 * (1 - d / ONEL_REACH)) : 0; hs[j] = h; if (h > mx) mx = h;
      }
      if (mx < 0.02) continue;
      paintFace(A, B, FN[p.bk][1][p.eidx], hs, prof, scl, ONEL_DEPTH);
    }
  }

  // paint one face band: a heat-coloured gradient along A->B, reaching inward (along −normal)
  // by heat·profile·scl·depthFrac at each of the 11 samples
  function paintFace(A, B, N, hs, prof, scl, depthFrac) {
    const ax = A[0], ay = A[1], ex = B[0]-ax, ey = B[1]-ay, nx = N[0], ny = N[1];
    const grad = ctx.createLinearGradient(ax, ay, B[0], B[1]);
    for (let j = 0; j <= 10; j++) { const c = incRGB(hs[j]); grad.addColorStop(j/10, `rgba(${c[0]},${c[1]},${c[2]},${hs[j].toFixed(3)})`); }
    ctx.beginPath();
    for (let j = 0; j <= 10; j++) { const u = j/10; j ? ctx.lineTo(ax + ex*u, ay + ey*u) : ctx.moveTo(ax, ay); }
    for (let j = 10; j >= 0; j--) { const u = j/10, r = hs[j]*prof[j]*scl*depthFrac; ctx.lineTo(ax + ex*u - nx*r, ay + ey*u - ny*r); }
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  }

  // The b's pulse response. EVERY element lights as the wave sweeps it — no facing test, so
  // a piece whose outward face is turned from the i-dot still fills (the wave carries the
  // energy there). Each is timed by elemEnv off two distances to the i-dot: its nearest
  // vertex (the announcer first touch — it begins to light) and its centre of mass (the main
  // front — it is FULLY lit). At that peak the whole element paints opaque gold, depth-filled
  // across its width, so it reads mostly yellow with only the soft seam where it meets its
  // neighbour. The WAY it gets there still encodes direction: the face begins RAKED from the
  // i-dot side and resolves to a flat, direction-free max as the front lands (rise drives the
  // morph). Painted over the physical b-light, so awakening points blend in as the wave goes.
  function paintPulseB(cx, cy, scale, cR, sR, ix, iy) {
    if (!ctx) return;
    const scl = KLOGO * scale, hs = new Array(11), raw = new Array(11);
    for (let b = 0; b < 2; b++) {
      const t = USES[b];
      for (let el = 0; el < 18; el++) {
        const F = B_OUT[el]; if (!F.p.length) continue;
        let rV = Infinity;                                       // nearest vertex: the announcer's first touch
        for (const v of B_POLY[el]) {
          const X = primToVp(v[0], v[1], t, cx, cy, scale, cR, sR);
          const d = Math.hypot(ix - X[0], iy - X[1]); if (d < rV) rV = d;
        }
        const C = primToVp(B_CEN[el][0], B_CEN[el][1], t, cx, cy, scale, cR, sR);
        const rC = Math.hypot(ix - C[0], iy - C[1]);             // centre of mass: where the front means FULL
        const { env, rise } = elemEnv(rV, rC); if (env < 0.02) continue;
        const A = primToVp(F.f[0][0], F.f[0][1], t, cx, cy, scale, cR, sR);
        const B = primToVp(F.f[1][0], F.f[1][1], t, cx, cy, scale, cR, sR);
        const N = [F.n[0]*cR - F.n[1]*sR, F.n[0]*sR + F.n[1]*cR];
        // the raking shape: a light set off the face toward the i-dot, nearer samples brighter;
        // normalised so the detail is always legible, then faded into uniform by `rise`. A face
        // turned away sees no rake (raw ~0) and simply brightens flat — no wrong-way artefact.
        const cfx = (A[0]+B[0])/2, cfy = (A[1]+B[1])/2;
        let lx = ix - cfx, ly = iy - cfy; const L = Math.hypot(lx, ly) || 1; lx /= L; ly /= L;
        const Ds = Math.hypot(B[0]-A[0], B[1]-A[1]) * 1.5 + 1;
        const Lx = cfx + lx * Ds, Ly = cfy + ly * Ds;
        let mn = Infinity, mxr = 0;
        for (let j = 0; j <= 10; j++) {
          const u = j/10, X = A[0] + (B[0]-A[0])*u, Y = A[1] + (B[1]-A[1])*u;
          const vx = Lx - X, vy = Ly - Y, d = Math.hypot(vx, vy) || 1;
          const r = Math.max(0, (N[0]*vx + N[1]*vy) / d) / d;
          raw[j] = r; if (r < mn) mn = r; if (r > mxr) mxr = r;
        }
        const span = (mxr - mn) || 1;
        for (let j = 0; j <= 10; j++) {
          const shape = 0.4 + 0.6 * (raw[j] - mn) / span;        // raked gradient, floored so the dim side still glows
          hs[j] = env * (shape * (1 - rise) + rise);             // -> flat env (full at the front) as it lands and drains
        }
        paintFace(A, B, N, hs, F.p, scl, 1);
      }
    }
  }

  // ---- occlusion: a b is opaque, so an interior point may not light the inner
  // wall "through" it. Each b is approximated by the triangle of its 3 OUTER
  // extreme corners (top P5, belly P3, bottom P4 — the outward-drifted corners).
  // From an interior point the b blocks the angular span its triangle subtends;
  // the point emits only in the largest clear gap. (bb-primitive units.)
  const HWp = 10.5 / 2;
  const bCentroid = PRIM.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(v => v / PRIM.length);
  const leftNorm = (a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx,dy)||1; return [-dy/L, dx/L]; };
  function outerCorner(i) {                 // outer-side miter corner at PRIM[i]
    const n1 = leftNorm(PRIM[i-1], PRIM[i]), n2 = leftNorm(PRIM[i], PRIM[i+1]);
    const k = 1 / (1 + n1[0]*n2[0] + n1[1]*n2[1]);
    const mv = [(n1[0]+n2[0])*k, (n1[1]+n2[1])*k], p = PRIM[i];
    const plus = [p[0]+HWp*mv[0], p[1]+HWp*mv[1]], minus = [p[0]-HWp*mv[0], p[1]-HWp*mv[1]];
    const dp = Math.hypot(plus[0]-bCentroid[0], plus[1]-bCentroid[1]);
    const dm = Math.hypot(minus[0]-bCentroid[0], minus[1]-bCentroid[1]);
    return dp > dm ? plus : minus;
  }
  const OCC_PRIM = [outerCorner(5), outerCorner(3), outerCorner(4)];   // top, belly, bottom
  // the largest clear angular gap, as seen from light L, around the 3 corners
  function largestGap(L, c3) {
    const angs = c3.map(c => Math.atan2(c[1]-L.py, c[0]-L.px)).sort((a, b) => a - b);
    let best = -1, lo = 0, hi = 0;
    for (let i = 0; i < 3; i++) {
      const a0 = angs[i], a1 = i < 2 ? angs[i+1] : angs[0] + 2*Math.PI;
      if (a1 - a0 > best) { best = a1 - a0; lo = a0; hi = a1; }
    }
    return { lo, hi };
  }
  const inGap = (dir, g) => { let d = dir; const TAU = 2*Math.PI;
    while (d < g.lo) d += TAU; while (d >= g.lo + TAU) d -= TAU; return d <= g.hi; };

  // ss>1 supersamples: the canvas backs at dpr·ss device px but is shown at CSS size, so the
  // browser downsamples — true antialiasing for content too fine to read at the bare device
  // resolution (the ring letters, ~7px bold, were aliasing badly on 1× displays).
  function fitCanvas(cv, c, blurPx, ss) {
    const dpr = (window.devicePixelRatio || 1) * (ss || 1);
    cv._cw = window.innerWidth; cv._ch = window.innerHeight; cv._dpr = dpr;
    cv.width = Math.round(cv._cw * dpr); cv.height = Math.round(cv._ch * dpr);
    cv.style.width = cv._cw + "px"; cv.style.height = cv._ch + "px";
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.style.filter = blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : "none";
  }
  function sizeCanvas() {
    const s = signet.getBoundingClientRect().width / 400;
    if (ctx)  fitCanvas(reflectCanvas, ctx,  DIFFUSE * s);    // bands + glints, diffused
    if (cctx) { castBlur = 2.2 * s; fitCanvas(castCanvas, cctx, castBlur); }  // the glow, lightly softened
    if (pctx) fitCanvas(pulseCanvas, pctx, 1.2 * s);         // the ignition pulse, softly
    if (krctx) fitCanvas(crackCanvas, krctx, 0.6 * s);       // the cracks, a whisker of glow
    // the ring letters are DOM text; size them to the ring thickness (thk = 17.537·s)
    if (lettersLayer) lettersLayer.style.fontSize = (FONT_FRAC * 17.537 * s).toFixed(2) + "px";
  }

  const GOLD = [250, 208, 42];                   // the official site gold (--gold #fad02a)
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
        const m = (q.w == null ? 1 : q.w) * (q.gate == null ? 1 : q.gate);   // wake × logo-engagement
        if (m <= 0) continue;
        const E = Math.asin(ratio) / Math.PI;
        v += m * GAIN_OUT * (E / gamma) * (1 - Math.abs(dd) / gamma);
      }
    }
    return v;
  }
  // raw illuminance at inner-boundary angle `a` from the interior lights: physical
  // cosβ/dist on the inward normal; a central point (d=0) gives a uniform 1.
  function innerIlluminance(a, inn, rIn, cx, cy) {
    let v = 0;
    const wx = cx + rIn * Math.cos(a), wy = cy + rIn * Math.sin(a);   // the lit wall point
    for (const p of inn) {
      if (p.role === 'onEl') continue;               // a light on a b element lights no wall
      if (p.role === 'region') {                     // inside a b: sees the wall only through the mouth
        if (segCrossPoly(p.px, p.py, wx, wy, bSilVp[0]) || segCrossPoly(p.px, p.py, wx, wy, bSilVp[1])) continue;
      } else if (p.g0) {                             // exterior: the b's block their triangle's angular span
        const dir = Math.atan2(wy - p.py, wx - p.px);
        if (!inGap(dir, p.g0) || !inGap(dir, p.g1)) continue;
      }
      const m = (p.w == null ? 1 : p.w) * (p.gate == null ? 1 : p.gate);   // wake × logo-engagement
      if (m <= 0) continue;
      const cosD = Math.cos(a - p.th);
      const dist2 = rIn * rIn + p.d * p.d - 2 * rIn * p.d * cosD;
      v += m * GAIN_IN * rIn * (rIn - p.d * cosD) / dist2;
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
    // arc colour follows the warm mixing path (incRGB), not flat gold faded out —
    // a half-lit arc reads dark amber like the letters, not washed-out olive
    for (let k = 0; k <= M; k++) {
      const a = alpha[k % M], c = incRGB(Math.min(1, a));
      g.addColorStop(k / M, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`);
    }
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

  // Clear the reflect canvas and paint the two ring bands. The lit b elements are
  // added on top of this same canvas by lightAndPaintB (same diffusion).
  function drawReflections(bnd) {
    if (!ctx) return;
    ctx.clearRect(0, 0, reflectCanvas._cw, reflectCanvas._ch);
    let bandMx = 0;
    for (let k = 0; k < bnd.alphaOut.length; k++) {
      if (bnd.alphaOut[k] > bandMx) bandMx = bnd.alphaOut[k];
      if (bnd.alphaInner[k] > bandMx) bandMx = bnd.alphaInner[k];
    }
    if (bandMx <= 0.004) return;
    band(bnd, bnd.rOut, -1, bnd.alphaOut);
    band(bnd, bnd.rIn,  +1, bnd.alphaInner);
  }

  const CAST_WHITE = [250, 240, 205];
  // the glowing layer's colour comes from the build's --glow-rgb (styles.css), so a
  // variant can run the ambient light cooler or warmer by touching only the stylesheet
  let CAST_GLOW = [255, 230, 102];
  { const m = getComputedStyle(document.documentElement).getPropertyValue("--glow-rgb").match(/\d+/g);
    if (m && m.length === 3) CAST_GLOW = m.map(Number); }
  // The logo is still TRACKED by the points (its boundary/element lighting, gated by
  // q.gate — full by gap rIn, gone at 2·rIn: the logo starts lighting from points 2·r₋
  // away, so it reads more prominently than the copy). But nothing is AIMED at it any
  // more: the points glow radially, and the reflective layer shows what they light.
  // How a point's radial glow falls off with normalised radius s = r/R: f(0)=1 at the core,
  // f(1)=0 at the clipped rim. Keeping f(1)=0 fixes the reach at R.
  // BUILD: physical falloff — a point lamp at height 1 over a flat patch, lit by inverse-square
  // × Lambert's cosine: E(s) = cosθ/d² = (1+s²)^-3/2, renormalised so the rim value E(1) maps to 0.
  // A bright concentrated core with a soft tail — reads as a real light source, not a flat disc.
  const GLOW_RIM = Math.pow(2, -1.5);                 // E at the rim s=1
  const glowFalloff = s => (Math.pow(1 + s * s, -1.5) - GLOW_RIM) / (1 - GLOW_RIM);

  // ---- the crossed-tips photo frame ----------------------------------------
  // The frame is 4 two-same-side-tip bars, one per side, hooks exterior, in the
  // section rules' own proportions (u = T/10.5, bb.svg's top tip). Each bar
  // overshoots both corners by t = 18.0429u — Jonatan's SECOND MATCH: the bars
  // pushed apart until the two tips' oblique sides cross exactly at their shared
  // MIDPOINT — so at every corner the two tips weave over each other. The tip
  // pointing anticlockwise wrt the frame's centre lies ON TOP; the other passes
  // under. The lighting tiles the ink into the 4 straight runs (profiled) plus
  // per-corner solid primitives, by mode:
  //   "plain"    — the top tip whole (1 piece), the under tip's two visible ends;
  //   "elements" — the top tip split as the b tip's two elements, the under tip's
  //                two elements each clipped by the top tip (4 pieces).
  // Coords are image-local (origin the image's top-left, y down). Every corner is
  // the top-right one ROTATED about the image centre (rotations, not mirrors —
  // the over/under weave gives the frame 4-fold TURN symmetry, like a pinwheel).
  function frameGeom(Wi, Hi, B, seam, mode) {
    const T = 2 * B, u = T / 10.5, sm = seam || 0;
    const cut = (24.2734 - 18.0429) * u;                 // joint plane, inside the corner
    // the top-right corner, in u (a rightward, b down, origin the image corner).
    // Under tip = the top bar's (S sharp, H hook apex, F/J joint corners);
    // over tip = the right bar's (Sv/Hv/Fv/Jv). pSF/pHS: where the over bar's
    // edge a=0 cuts the under split line / oblique; pMid: the obliques' shared
    // midpoint; pVSF/pVbot: where the over oblique cuts the under split line /
    // the image edge b=0.
    const S = [18.0429, 0], H = [-3.5740, -14.4689], F = [-6.2305, -10.5], J = [-6.2305, 0];
    const pSF = [0, -7.8049], pHS = [0, -12.0770], pMid = [7.2345, -7.2345];
    const pVSF = [9.6458, -3.6322], pVbot = [12.0770, 0];
    const Sv = [0, -18.0429], Hv = [14.4689, 3.5740], Fv = [10.5, 6.2305], Jv = [0, 6.2305];
    const corner = mode === "elements"
      ? [[Sv, Fv, Jv], [Fv, Hv, Sv],                     // the top tip, as the b tip's two elements
         [pSF, F, J, [0, 0]], [F, H, pHS, pSF],          // the under tip's elements, left of the top tip
         [S, pVSF, pVbot], [pMid, S, pVSF]]              //   ... and poking out right of it
      : [[Sv, Hv, Fv, Jv],                               // the top tip, whole
         [J, F, H, pHS, [0, 0]], [pMid, S, pVbot]];      // the under tip's two visible ends
    // seam: each piece pulls its corners back toward its centroid by half a seam
    const inset = pts => {
      if (!sm) return pts;
      let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; }
      cx /= pts.length; cy /= pts.length;
      return pts.map(p => {
        const dx = cx - p[0], dy = cy - p[1], d = Math.hypot(dx, dy) || 1;
        return [p[0] + (dx / d) * sm / 2, p[1] + (dy / d) * sm / 2];
      });
    };
    // the top-right corner turned onto the four (rotations about the image centre)
    const CORN = [
      (a, b) => [Wi + a * u, b * u],
      (a, b) => [Wi - b * u, Hi + a * u],
      (a, b) => [-a * u, Hi - b * u],
      (a, b) => [b * u, -a * u],
    ];
    const prims = [];
    for (const m of CORN) for (const q of corner)
      prims.push(inset(q.map(p => m(p[0], p[1]))));
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const c = cut + sm;
    const runs = [
      { pts: rect(c, -T, Wi - c, 0), grad: [[0, -T], [0, 0]] },
      { pts: rect(c, Hi, Wi - c, Hi + T), grad: [[0, Hi + T], [0, Hi]] },
      { pts: rect(-T, c, 0, Hi - c), grad: [[-T, 0], [0, 0]] },
      { pts: rect(Wi, c, Wi + T, Hi - c), grad: [[Wi + T, 0], [Wi, 0]] },
    ];
    return { prims, runs };
  }

  // draw (or refresh) each photo frame's ink as an SVG inside its box — real page
  // structure, so it renders whatever the lighting is doing. The pieces tile the
  // frame exactly (runs + corner primitives), so the ink is just their seamless
  // fills. data-frame on the box picks the corner tiling ("plain" / "elements").
  function buildFrame() {
    for (const ph of document.querySelectorAll(".about__photo")) {
      const T2 = parseFloat(getComputedStyle(ph).paddingTop) || 0;   // the band = 2B
      if (T2 < 2) continue;
      const W = ph.clientWidth, H = ph.clientHeight;
      const g = frameGeom(W - 2 * T2, H - 2 * T2, T2 / 2, 0, ph.dataset.frame);
      const poly = pts => "M" + pts.map(p => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + "Z";
      let svg = ph.querySelector(".frame-svg");
      if (!svg) {
        svg = document.createElementNS(SVG, "svg");
        svg.setAttribute("class", "frame-svg");
        svg.setAttribute("aria-hidden", "true");
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("fill", "#1c1a16");
        svg.appendChild(p); ph.appendChild(svg);
      }
      svg.setAttribute("viewBox", `${-T2} ${-T2} ${W} ${H}`);
      svg.firstChild.setAttribute("d",
        g.prims.map(poly).join("") + g.runs.map(r => poly(r.pts)).join(""));
    }
  }

  // ---- text-lighting hook -------------------------------------------------
  // reflect.js lights the page COPY from this same point field through
  // window.TEXT_LIGHT(lights, frame) (lights = [{x,y,r,i}] in viewport px; frame =
  // {sx,sy,vw,vh}), and borrows frameGeom for the selection outline's pieces. We fire
  // 'litrelayout' whenever the cached layout changes (load / resize / font / language)
  // so it can recache its element rects.
  window.LITAPI = { frameGeom };

  // Sampled into stops, since a canvas gradient only interpolates linearly between them.
  function radialGlow(c, x, y, R, rgb, peak) {
    const g = c.createRadialGradient(x, y, 0, x, y, R), S = 24;
    for (let i = 0; i <= S; i++) {
      const s = i / S;
      g.addColorStop(s, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(peak * Math.max(0, glowFalloff(s))).toFixed(3)})`);
    }
    return g;
  }
  // the cast canvas MINUS the logo's outer disc, set as a clip: no exterior glow (a
  // point's, a gold word's) ever spills onto or into the annulus (a rect wound one way,
  // the disc the other, even-odd). This replaces the reach cap the old cones relied on.
  function clipOutLogo(c, cx, cy, rOut) {
    c.beginPath();
    c.rect(0, 0, castCanvas._cw, castCanvas._ch);
    c.arc(cx, cy, rOut, 0, TAU, true);
    c.clip("evenodd");
  }
  // Each point's radial glow — the atmospheric halo around it, out to r₋ (the annulus'
  // inner radius, the point's reach). There is NO direction to it: the reflective layer
  // already shows where a point lights, so the old aimed/logo cones are gone — points
  // glow radially, always. Clipped out of the logo disc.
  function drawGlow(ext, cx, cy, rOut, rIn) {
    if (!cctx) return;
    cctx.clearRect(0, 0, castCanvas._cw, castCanvas._ch);
    cctx.save();
    clipOutLogo(cctx, cx, cy, rOut);
    for (const q of ext) {
      const w = q.w == null ? 1 : q.w; if (w <= 0) continue;
      cctx.fillStyle = radialGlow(cctx, q.px, q.py, rIn, CAST_GLOW, GLOW_PEAK * w);
      cctx.beginPath(); cctx.arc(q.px, q.py, rIn, 0, TAU); cctx.fill();
    }
    cctx.restore();
  }

  // The i-dot GATHERING its light, before the pulse: a radial glow as wide as the
  // page that tightens onto the point's natural reach over the preamble, brightening
  // as it concentrates. prog is 0..1 across the gather; (icx,icy) is the i-dot. Drawn
  // on the cast canvas (above the page), after drawGlow has cleared it.
  function drawPreambleGlow(icx, icy, prog, glowR, Rpage) {
    if (!cctx) return;
    const radius = glowR + (Rpage - glowR) * Math.pow(1 - prog, 1.5);   // shrinks, fast late
    const peak = CAST_ALPHA * 1.6 * (0.30 + 0.70 * prog);               // concentrates -> brighter
    cctx.fillStyle = radialGlow(cctx, icx, icy, radius, CAST_GLOW, peak);
    cctx.beginPath(); cctx.arc(icx, icy, radius, 0, TAU); cctx.fill();
  }

  // The visible ignition pulse: three concentric bands expanding from the i-dot — a
  // faint announcer ahead (born a natural-reach out, so it continues the gathered glow),
  // the bright main front from the point, and a faint requiem born a moment behind once
  // the front has travelled TRAIL. So the front reads as a dressed pulse, not a naked
  // growing circle. One radial gradient sampled across the active window of radii; the
  // whole thing dims as it grows, spending itself across the page.
  function drawPulse(icx, icy, Rmax) {
    if (!pctx) return;
    pctx.clearRect(0, 0, pulseCanvas._cw, pulseCanvas._ch);
    const Rp = IGN.SPEED * ign.Tp, lead = ign.lead, trail = ign.trail;
    if (Rp - trail > Rmax) return;                       // the requiem has cleared the screen
    const maxR = Rmax + lead + 40;
    const spread = Math.max(0.10, 1 - Rp / (Rmax * 0.95));   // energy thins as the ring grows
    const MW = 26, SW = 15;                              // main / side band half-widths (px)
    const bands = [[Rp + lead, 0.13, SW], [Rp, 0.62, MW]];   // announcer (less prominent) + main
    if (Rp >= trail) bands.push([Rp - trail, 0.24, SW]);     // requiem, once it has been born
    const lo = Math.max(0, Rp - trail - 3 * SW), hi = Rp + lead + 3 * SW, STEPS = 56;
    const g = pctx.createRadialGradient(icx, icy, 0, icx, icy, maxR);
    for (let s = 0; s <= STEPS; s++) {
      const rr = lo + (hi - lo) * s / STEPS;
      let inten = 0;
      for (const [c, pk, wd] of bands) { const z = (rr - c) / wd; inten += pk * Math.exp(-z * z); }
      inten = Math.min(1, inten) * spread;
      g.addColorStop(Math.min(1, Math.max(0, rr / maxR)),
        `rgba(${CAST_WHITE[0]},${CAST_WHITE[1]},${CAST_WHITE[2]},${(inten * 0.9).toFixed(3)})`);
    }
    pctx.fillStyle = g;
    pctx.fillRect(0, 0, pulseCanvas._cw, pulseCanvas._ch);
  }

  // The incandescent ring message, as DOM text. It RIDES the logo's spin (angle += rotRad)
  // and is oriented to read on the BOTTOM half of the ring — at rest on the left arc, rolling
  // to the bottom as you scroll; it inverts only once it rolls past, which we accept. Each
  // letter heats INSTANTLY to the light on its arc, then cools by the shared stretched
  // exponential. We touch a span only when it changes: its transform when it moves, its colour
  // when its heat level changes. Sets `lettersWarm` while any letter is still cooling, so the
  // loop keeps animating the cool-down after a scroll stops.
  function drawLetters(cx, cy, R, toneOut, toneIn) {
    if (!lettersLayer || letterOff.length !== chars.length) return;
    const now = performance.now();
    const dt = heatT ? Math.min((now - heatT) / 1000, 0.1) : 0;
    heatT = now;
    let cooling = false;
    for (let i = 0; i < chars.length; i++) {
      const el = letterEls[i];
      const ang = CENTRE_ANG + STRING_ROT + letterOff[i] + rotRad;        // rides the spin
      const k = Math.round((((ang % TAU) + TAU) % TAU) / TAU * N) % N;
      const target = Math.max(0, Math.min(1, (Math.max(toneOut[k], toneIn[k]) - TXT_T0) / (TXT_T1 - TXT_T0)));
      const cooled = heatPeak[i] * coolDecay(heatAge[i]);
      if (target >= cooled) {                                // instant heat-up / re-light
        heatPeak[i] = target; heatAge[i] = 0; heat[i] = target;
      } else {                                               // stretched-exponential cool-down
        heatAge[i] += dt; heat[i] = cooled;
        if (heat[i] > target + 0.003) cooling = true;
      }
      if (!el) continue;                                     // a space — no glyph
      const lvl = Math.round(heat[i] * LEVELS);
      if (lvl <= 0) {                                        // dark: hide it (remember, so we stop rewriting)
        if (letterLvl[i] !== 0) { el.style.opacity = "0"; letterLvl[i] = 0; }
        continue;
      }
      const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      const deg = (ang - Math.PI / 2) * 180 / Math.PI;       // tangent; readable on the bottom half
      const tf = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${deg.toFixed(2)}deg) translate(-50%,-50%)`;
      if (tf !== letterTf[i]) { el.style.transform = tf; letterTf[i] = tf; }
      if (lvl !== letterLvl[i]) {                            // recolour only when the heat level changes
        el.style.color = incandescent(lvl / LEVELS);
        if (letterLvl[i] <= 0) el.style.opacity = "1";       // was hidden — show it
        letterLvl[i] = lvl;
      }
    }
    lettersWarm = cooling;
  }

  // ---- the circle, in viewport pixels ------------------------------------
  function circle() {
    const s = signet.getBoundingClientRect();
    return { cx: s.left + s.width / 2, cy: s.top + s.height / 2, R: s.width * 0.3, scale: s.width / 400 };
  }

  function draw() {
    const { cx, cy, R, scale } = circle();
    if (!R) return;
    if (!lightsOn) {                       // master light off: freeze the logo upright, wipe the lit layers
      rotRad = 0;
      if (markEl) markEl.setAttribute("transform", MARK_BASE);
      if (ctx)  ctx.clearRect(0, 0, reflectCanvas._cw || 0, reflectCanvas._ch || 0);
      if (cctx) cctx.clearRect(0, 0, castCanvas._cw || 0, castCanvas._ch || 0);
      // the ring letters are DOM text, hidden by the lights-off CSS — nothing to clear here
      if (pctx) pctx.clearRect(0, 0, pulseCanvas._cw || 0, pulseCanvas._ch || 0);
      if (window.TEXT_LIGHT) window.TEXT_LIGHT([], { sx: window.scrollX, sy: window.scrollY, vw: window.innerWidth, vh: window.innerHeight });
      return;
    }
    const halfStroke = 8.7685 * scale, rOut = R + halfStroke, rIn = R - halfStroke, thk = rOut - rIn;
    geo = { cx, cy, R, scale, rIn, rOut };   // cache for pointer hit-testing (no per-move layout reads)
    const sx = window.scrollX, sy = window.scrollY, vw = window.innerWidth, vh = window.innerHeight;
    const glowR = rIn;                        // a point glows (and lights) out to r₋, the annulus' inner radius

    // ---- ignition timing for this frame ----
    let igOn = ign.on;
    const igReady = igOn && ign.start > 0;
    let icx = cx, icy = cy, Rmax = 0, iW = 1, gatherProg = 0;
    let phase = "steady";                  // gather | pulse | steady
    ign.lead = glowR;                      // the announcer leads by the point's natural reach
    ign.trail = IGN.TRAIL;
    if (igReady) {
      const ip = dotPos[iIndex];                                 // pulse centre = the i-dot, in the viewport
      icx = ip ? ip.x - sx : cx; icy = ip ? ip.y - sy : cy;
      Rmax = Math.max(Math.hypot(icx, icy), Math.hypot(vw - icx, icy),
                      Math.hypot(icx, vh - icy), Math.hypot(vw - icx, vh - icy));
      const T = (performance.now() - ign.start) / 1000;
      const pulseT0 = IGN.PREAMBLE;                              // gather first, then free the pulse
      ign.Tp = T - pulseT0;
      let maxDot = 0;                                            // farthest point from the i-dot (its bulb closes the run)
      for (let i = 0; i < dotPos.length; i++) {
        if (!dotPos[i]) continue;
        const d = Math.hypot(dotPos[i].x - sx - icx, dotPos[i].y - sy - icy);
        if (d > maxDot) maxDot = d;
      }
      // over once the pulse has cleared the screen AND the farthest point has risen,
      // ember-cooled to black and bulbed back to steady
      const endT = Math.max(pulseT0 + (Rmax + IGN.TRAIL) / IGN.SPEED,
                            pulseT0 + (maxDot + IGN.TRAIL) / IGN.SPEED + COOL_DONE + IGN.P_BULB);
      if (T >= endT) {                                           // sequence over — settle into steady light
        ign.on = false; igOn = false;
        for (let i = 0; i < dotEls.length; i++) setLit(i, 1);
        setCore("");
        if (pctx && pulseCanvas._cw) pctx.clearRect(0, 0, pulseCanvas._cw, pulseCanvas._ch);
        schedule();                                             // let any still-warm letters keep cooling
      } else if (ign.Tp < 0) {                                  // GATHER: warm black -> gold along the annulus path
        phase = "gather"; gatherProg = T / IGN.PREAMBLE;
        setLit(iIndex, gatherProg); setCore(incandescent(gatherProg)); iW = 0;
      } else {                                                  // PULSE freed: the i-dot is now just the r=0 point
        phase = "pulse";
        const s = pointLit(0);                                  // gather left it at full; now it drains, ember-cools, bulbs
        iW = s.lit; setLit(iIndex, s.lit);
        // ride the ring-message ember colour while it drains/cools; plain gold once it bulbs back
        if (s.phase === "bulb") setCore(""); else setCore(incandescent(s.lit));
      }
    }
    const pulseLogo = igReady && igOn && ign.Tp >= 0;            // the wave is lighting the logo (incl. its drain)

    const ext = [], inn = [];
    for (let i = 0; i < dotEls.length; i++) {
      const p = dotPos[i]; if (!p) continue;
      const px = p.x - sx, py = p.y - sy;
      const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      // logo engagement: the point sees the logo only within 2·rIn of its boundary —
      // the annulus' INNER DIAMETER (a point entering the bowl sees the whole interior).
      // Full by gap = rIn, gone at 2·rIn; gates the logo's boundary/element illumination,
      // so the logo starts lighting from points 2·r₋ away — farther than they glow (r₋).
      const gate = Math.max(0, Math.min(1, 2 - (dist - rOut) / rIn));

      let w = 1;                              // steady state: every point fully awake
      if (igOn) {
        if (!igReady) { w = 0; }              // before the clock starts: all dark
        else if (i === iIndex) { w = iW; }    // the i-dot's --lit/core is set above
        else if (ign.Tp < 0) { setLit(i, 0); w = 0; }   // still gathering: every other point dark
        else {
          const s = pointLit(Math.hypot(px - icx, py - icy));   // rise -> drain -> ember-cool -> bulb
          setLit(i, s.lit);
          w = s.lit;                          // the point's logo-light tracks its wake level
        }
      }

      if (w <= 0) continue;
      const inView = px > -glowR && px < vw + glowR && py > -glowR && py < vh + glowR;
      if (gate <= 0 && !inView) continue;     // neither engages the logo nor can glow into the view
      if (dist >= rOut) ext.push({ th, d: dist, px, py, w, gate });
      else if (dist < rIn) inn.push({ th, d: dist, px, py, w, gate });
    }
    // turn the logo with scroll (no-slip roll down a wall on the right); the sign
    // is negated to spin the corrected direction
    rotRad = -sy / rOut;
    const cR = Math.cos(rotRad), sR = Math.sin(rotRad);
    if (markEl) markEl.setAttribute("transform",
      `rotate(${(rotRad * 180 / Math.PI).toFixed(3)} 200 200) ${MARK_BASE}`);

    // Classify each interior light against the two b's (the b geometry rotates with the
    // logo). A light on a b's ribbon sits on one element; inside its belly notch it sits
    // in a region; otherwise it is exterior to both b's. This decides both the b-face
    // lighting and how the light may reach the inner wall.
    if (inn.length) {
      const bbToVp = (bx, by) => { const X = gX(bx) - 200, Y = gY(by) - 200;
        return [cx + (X*cR - Y*sR) * scale, cy + (X*sR + Y*cR) * scale]; };
      const occ0 = OCC_PRIM.map(c => bbToVp(c[0] + USES[0][0], c[1] + USES[0][1]));
      const occ1 = OCC_PRIM.map(c => bbToVp(c[0] + USES[1][0], c[1] + USES[1][1]));
      bSilVp = [0, 1].map(b => B_SIL.map(q => primToVp(q[0], q[1], USES[b], cx, cy, scale, cR, sR)));
      for (const p of inn) {
        p.role = 'ext'; p.bk = -1;
        for (let b = 0; b < 2; b++) {
          const pr = vpToPrim(p.px, p.py, USES[b], cx, cy, scale, cR, sR);
          if (inPoly(pr[0], pr[1], B_SIL)) {                 // on the ribbon -> on an element
            let e = -1; for (let i = 0; i < 18; i++) if (inPoly(pr[0], pr[1], B_POLY[i])) { e = i; break; }
            p.role = 'onEl'; p.bk = b; p.eidx = e; break;
          }
          if (inPoly(pr[0], pr[1], B_TRI)) {                 // in the belly notch -> a region
            let r = -1; for (let k = 0; k < 7; k++) if (inPoly(pr[0], pr[1], B_REG[k])) { r = k; break; }
            p.role = 'region'; p.bk = b; p.ridx = r; break;
          }
        }
        if (p.role === 'ext') { p.g0 = largestGap(p, occ0); p.g1 = largestGap(p, occ1); }
      }
    }

    // the two boundary-illumination sequences over the uniform arc partition. During the
    // pulse each small arc of each boundary is excited only while the wave is passing it:
    // the expanding circumferences meet that arc point at a distance-keyed time, so it
    // rises at the announcer, peaks at the main front, then drains linearly to half at the
    // requiem and to zero a gap later. Taken as the brighter of pulse vs steady light, so
    // the wave lifts each piece above its resting glow and hands back to it as it leaves.
    const toneOut = new Array(N), toneIn = new Array(N);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      let to = tone(outerIlluminance(a, ext, rOut));
      let ti = tone(innerIlluminance(a, inn, rIn, cx, cy));
      if (pulseLogo) {
        const eo = pulseEnv(Math.hypot(icx - (cx + rOut*ca), icy - (cy + rOut*sa)));
        const ei = pulseEnv(Math.hypot(icx - (cx + rIn*ca),  icy - (cy + rIn*sa)));
        if (eo > to) to = eo;
        if (ei > ti) ti = ei;
      }
      toneOut[k] = to; toneIn[k] = ti;
    }

    drawGlow(ext, cx, cy, rOut, rIn);
    if (phase === "gather")
      drawPreambleGlow(icx, icy, gatherProg, glowR,
        Math.hypot(vw, document.documentElement.scrollHeight));   // page diagonal
    drawReflections({ alphaOut: toneOut, alphaInner: toneIn, cx, cy, rOut, rIn,
      maxReach: 0.45 * thk,                          // reach trimmed 10% (flatter falloff)
      overshoot: 2.5 * scale });
    lightAndPaintB(cx, cy, scale, cR, sR, inn);
    if (pulseLogo) paintPulseB(cx, cy, scale, cR, sR, icx, icy);
    drawLetters(cx, cy, R, toneOut, toneIn);

    // the visible pulse rides on top while it travels; cleared once it has left
    if (phase === "pulse") drawPulse(icx, icy, Rmax);
    else if (igReady && pctx && pulseCanvas._cw) pctx.clearRect(0, 0, pulseCanvas._cw, pulseCanvas._ch);
    drawCracks(scale);   // the cracks, alive only while the wave passes them

    // hand the point field to the REFLECTIVE layer (reflect.js). Each point lights the copy by
    // its full wake w, out to 2·r₋ — twice the glow's reach. The glow stops at r₋ and is clipped
    // out of the logo disc, but the reflection is not: a point just outside the annulus still
    // shades nearby copy well inside it, while its glow never crosses the ring.
    if (window.TEXT_LIGHT) {
      const reflR = 2 * glowR;
      const TL = [];
      for (const p of inn) { if (p.w > 0.02) TL.push({ x: p.px, y: p.py, r: reflR, i: p.w }); }
      for (const p of ext) { if (p.w > 0.02) TL.push({ x: p.px, y: p.py, r: reflR, i: p.w }); }
      const fr = { sx, sy, vw, vh };
      // the ignition wave lights the page copy too: hand the reflective layer the live
      // front (same three circumferences the logo reads), viewport px from the i-dot
      if (pulseLogo) fr.pulse = { x: icx, y: icy, R: IGN.SPEED * ign.Tp, lead: ign.lead, trail: ign.trail };
      window.TEXT_LIGHT(TL, fr);
    }
  }

  // Size every dot and pin the two hardcoded ones, in page coordinates. Each .pt
  // is centred on its left/top (CSS translate -50%). --pt is the perceived dot
  // DIAMETER (solid core to r, diffusion to zero at 2r) set so the centre dot's
  // perceived diameter is 95% of the b-to-b gap. Each dot's page-space centre is
  // cached here so draw() needs no per-frame layout reads.
  // Size the lede's float spacer to the logo's band: height down to the annulus
  // ink's bottom edge, width from the lede's right margin back to the ink's left
  // edge — so the lede's first lines wrap short of the logo and the lines below
  // its bottom run wide. Sized from the logo's LOAD position (the fixed signet at
  // scroll 0), which is the view where hero and logo actually share the screen.
  function layoutLede(c) {
    const lede = document.querySelector(".hero__lede");
    const sp = document.querySelector(".hero__lede-clear");
    if (!lede || !sp) return;
    const rOut = c.R + 8.7685 * c.scale;
    const spTop = sp.getBoundingClientRect().top + window.scrollY;   // page y where the lede starts
    const parent = lede.parentElement.getBoundingClientRect();
    // the logo's PAGE y at load: the fixed signet's viewport y equals it; unpinned
    // (lights off) it is page-anchored already, so add the live scroll back in
    const logoY = lightsOn ? c.cy : c.cy + window.scrollY;
    const h = Math.max(0, logoY + rOut + 14 - spTop);
    const w = Math.max(0, parent.right - (c.cx - rOut) + 16);
    root.style.setProperty("--lede-clear-h", h.toFixed(1) + "px");
    root.style.setProperty("--lede-clear-w", w.toFixed(1) + "px");
  }

  function layoutDots() {
    // Guarantee the logo a breathing margin below the viewport's top edge. Its CSS
    // placement (top 34% − 81.64% of a width-capped box) leaves the annulus ink
    // nearly touching — or poking past — the top on wide-and-short windows
    // (maximized Chrome), while a narrower window shrinks the logo and opens the
    // margin (the Firefox reference capture). Measured from the live rect —
    // browser-independent, like the i-dot's baseline anchor — and applied as a
    // plain downward offset the .signet transform reads.
    root.style.setProperty("--sig-fix", "0px");
    const c0 = circle();
    if (!c0.R) return;
    const fix = 0.05 * window.innerHeight - (c0.cy - (c0.R + 8.7685 * c0.scale));
    if (fix > 0) root.style.setProperty("--sig-fix", fix.toFixed(1) + "px");
    const c = circle();       // re-measure with the margin applied
    layoutLede(c);            // reflow the lede next — everything below it shifts
    const gapPx = 12.225 * KLOGO * c.scale;
    // the dots scale with the (now 20%-smaller) logo, which left them too small; nudge the
    // ratio up so they land halfway back — 0.95 × (gap) × 1.125, i.e. half of the 20% shrink
    // restored — then grown 50% (×1.5) so the points read boldly against the cracks
    ptPx = 1.6035 * gapPx;
    field.style.setProperty("--pt", ptPx.toFixed(1) + "px");
    // pin the two hardcoded dots to their home (logo centre / the 'i'), unless the
    // visitor has since dragged them — a moved dot keeps where it was put
    if (!centreDot._moved) {
      centreDot.style.left = (c.cx + window.scrollX).toFixed(1) + "px";
      centreDot.style.top  = (c.cy + window.scrollY).toFixed(1) + "px";
    }
    if (iSpan && !iDot._moved) {
      const r = iSpan.getBoundingClientRect();
      // Anchor the tittle to the text BASELINE, not the inline box. The glyph sits on the
      // baseline and both engines place it there alike; the inline box top/height they do
      // NOT agree on (small-caps leading differs), which used to drift the dot between
      // Firefox and Chrome. The baseline comes from the zero-size .hero__i-base marker; the
      // upward lift is in em (font-relative, identical everywhere). Horizontal stays the
      // glyph's own centre (advance widths agree across engines).
      const baseEl = iSpan.querySelector(".hero__i-base");
      const fs = parseFloat(getComputedStyle(iSpan).fontSize) || r.height;
      const baseY = baseEl ? baseEl.getBoundingClientRect().bottom : r.bottom;
      iDot.style.left = (r.left + window.scrollX + r.width / 2).toFixed(1) + "px";
      iDot.style.top  = (baseY + window.scrollY - 0.66 * fs).toFixed(1) + "px";   // tittle: clear above the small-cap glyph
    }
    // the bottom anchor: the tittle of the 'i' in the contact head ("get in touch"). Located
    // live by a Range over its text; if the active language has no i/j (e.g. "Hablemos"), it
    // falls back to the head's centre.
    if (!iDotB._moved) {
      const a = contactAnchor();
      if (a) { iDotB.style.left = a.x.toFixed(1) + "px"; iDotB.style.top = a.y.toFixed(1) + "px"; }
    }
    dotPos.length = 0;
    for (const dot of dotEls) {
      const r = dot.getBoundingClientRect();
      dotPos.push({ x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY });
    }
    // keep the sample field strictly between the two anchors: any point above the 'I' or below
    // the 'i' is dropped (hidden and taken out of every light/crack loop). The anchors and the
    // logo-centre dot are exempt.
    const yTop = dotPos[iIndex] ? dotPos[iIndex].y : -Infinity;
    // trust the bottom bound only once the 'i' has actually been anchored — an
    // unpositioned dot reads at the page origin and would clamp the whole field away
    const yBot = dotPos[iIndexB] && iDotB.style.left ? dotPos[iIndexB].y : Infinity;
    for (let i = 0; i < dotEls.length; i++) {
      if (i === iIndex || i === iIndexB || i === centreIndex) continue;
      const p = dotPos[i]; if (!p) continue;
      const out = p.y < yTop || p.y > yBot;
      dotEls[i].style.visibility = out ? "hidden" : "";
      if (out) dotPos[i] = null;
    }
    window.dispatchEvent(new Event("litrelayout"));   // a text-light variant recaches its rects here
    buildCracks(true);                                // (re)build the crack graph + place its cracks
  }
  // The bottom anchor's page position: the 'i' (or í/ì/j) tittle in the contact head.
  // The head's text may already be wrapped into .litw word spans by reflect.js — its
  // first prep races this layout, and which one lands first varies by browser and by
  // load — so walk the head's TEXT NODES rather than trust firstChild. (Unpositioned,
  // the dot would sit at the page origin and the band clamp would drop every point.)
  function contactAnchor() {
    const h = document.querySelector(".contact__head");
    if (!h) return null;
    const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode()); ) {
      const s = n.nodeValue;
      for (let k = 0; k < s.length; k++) {
        const c = s[k].toLowerCase();
        if (c === "i" || c === "í" || c === "ì" || c === "j") {
          const rg = document.createRange(); rg.setStart(n, k); rg.setEnd(n, k + 1);
          const r = rg.getBoundingClientRect();
          if (r.width || r.height)
            return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height * 0.28 + window.scrollY };
        }
      }
    }
    const r = h.getBoundingClientRect();   // no i/j in the active language — the head's centre
    return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height * 0.28 + window.scrollY };
  }

  // ---- the crack graph: a nearest-insertion tree rooted at the 'I' -----------------
  // Built ONCE per layout (load / resize / language), never on a drag. Take the dots by
  // increasing distance from the 'I' — the logo-centre dot and the 'i' are regular
  // points here — and link each newcomer to whichever point already included is closest
  // to it. A spanning tree of the whole field, with just enough links, all of them local.
  let crackEdges = [];      // [{ p, c }] parent→child dot indices (p was already in the tree)
  let crackWalks = [];      // one compass walk per edge, in the edge frame (x 0..D along, y across)
  let crackSegs = [];       // the laid-down strokes: { ax,ay,bx,by, dr, main } in page space
  let cracksBuilt = false;

  function buildGraph() {
    cracksBuilt = false; crackEdges = [];
    const PI = dotPos[iIndex]; if (!PI) return;
    const rest = [];
    for (let i = 0; i < dotPos.length; i++)
      if (dotPos[i] && i !== iIndex) rest.push(i);
    rest.sort((a, b) => Math.hypot(dotPos[a].x - PI.x, dotPos[a].y - PI.y)
                      - Math.hypot(dotPos[b].x - PI.x, dotPos[b].y - PI.y));
    const tree = [iIndex];
    for (const k of rest) {
      let best = -1, bd = Infinity;
      for (const m of tree) {
        const d = Math.hypot(dotPos[m].x - dotPos[k].x, dotPos[m].y - dotPos[k].y);
        if (d < bd) { bd = d; best = m; }
      }
      crackEdges.push({ p: best, c: k });
      tree.push(k);
    }
    const t = crackT();
    crackWalks = crackEdges.map(e => compassWalk(
      Math.hypot(dotPos[e.c].x - dotPos[e.p].x, dotPos[e.c].y - dotPos[e.p].y), t));
    cracksBuilt = true;
  }

  // t (px): ~half the hero name's letter height, so 2t ≈ its caps — the crack band's half-thickness
  function crackT() {
    const nm = document.querySelector(".hero__name");
    return 0.34 * (nm ? parseFloat(getComputedStyle(nm).fontSize) : 40);
  }

  // ---- the compass walk: the crack between two linked dots ------------------------
  // A broken compass points at the far dot with a uniform error in (−π/4, π/4). The walk
  // lives in the edge frame (x 0..D along the link, y across) inside a LIPSCHITZ diamond:
  // |y| ≤ λ·min(x, D−x), with λ set so the top edge passes through (D/2, h) — every crack
  // is BORN at one dot and CONVERGES into the other. The CORE group walks it dot to dot
  // hugging the axis: its own bound is the half-band ±h/2 cut by the diamond, and it sees
  // that bound and turns inward rather than cross it. MANY LONERS split off with their own
  // biased compasses; a loner dies after a few steps or falling off the diamond — unless
  // its path crosses the core first: CROSSING THE MAIN CRACK MEANS JOINING IT, the track
  // ends at the crossing and a small isle closes. Now and then a COUPLE leaves together:
  // ONE track walked double file — drawn thicker, a width between a loner's and the main
  // crack's — that on every step may SPLIT; when it does, the two part in genuinely
  // different directions (two diverging steps each, then fully independent loners, each
  // obeying the same fall/join rules). O(steps·loners) per edge — cheap, built once.
  const CRK = {
    STEP: 14,                  // nominal step length (px; shrunk so short edges still get steps)
    JIT: 0.5,                  // a loner's per-step wobble, as a fraction of the π/4 error
    LON_P: 0.4,                // loner spawn probability per interior core vertex
    LON_MIN: 4, LON_MAX: 12,   // a loner lives this many steps (unless it falls or joins)
    CPL_P: 0.25,               // chance a spawned loner leaves as a couple
    SPL_P: 0.3,                // a couple's chance, checked at every step, of splitting
  };
  function compassWalk(D, h) {
    const A4 = Math.PI / 4, rnd = Math.random;
    const STEP = Math.max(5, Math.min(CRK.STEP, D / 6));
    const lam = 2 * h / D;
    const env = x => lam * Math.min(x, D - x);              // the Lipschitz diamond bound
    const bound = x => Math.min(h / 2, env(x));             // the core's: half-band, cut by the diamond
    const core = [[0, 0]];
    let x = 0, y = 0;
    while (x < D - STEP * 0.5) {
      let err = (rnd() * 2 - 1) * A4;
      const s = STEP * (0.6 + 0.8 * rnd());
      let nx = x + Math.cos(err) * s, ny = y + Math.sin(err) * s;
      if (Math.abs(ny) > bound(nx)) {                       // sees its bound, turns inward
        err = -Math.abs(err) * Math.sign(y || ny);
        nx = x + Math.cos(err) * s; ny = y + Math.sin(err) * s;
        const b = bound(nx);
        if (Math.abs(ny) > b) ny = b * Math.sign(ny);       // pinched tighter than a turn — clamp
      }
      x = nx; y = ny;
      core.push([x, y]);
    }
    core.push([D, 0]);                                      // the diamond's far apex: lands ON the dot
    // where a track first crosses the core — the fraction along a→b, or null
    const hit = (ax, ay, bx, by) => {
      let best = null;
      for (let i = 1; i < core.length; i++) {
        const cx2 = core[i-1][0], cy2 = core[i-1][1];
        const r1x = bx-ax, r1y = by-ay, r2x = core[i][0]-cx2, r2y = core[i][1]-cy2;
        const den = r1x*r2y - r1y*r2x; if (Math.abs(den) < 1e-9) continue;
        const u = ((cx2-ax)*r2y - (cy2-ay)*r2x) / den;
        const v = ((cx2-ax)*r1y - (cy2-ay)*r1x) / den;
        if (u > 1e-4 && u < 1-1e-4 && v > 1e-4 && v < 1-1e-4 && (best == null || u < best)) best = u;
      }
      return best;
    };
    // a track off the core: its own biased compass, until it joins the core, falls off
    // the diamond, or its steps run out. `force` first steps take the bias with no
    // wobble — how a fresh split's halves are made to genuinely part ways.
    const tracks = [];      // each: { pts, w }  w: 0 loner, 1 couple (drawn double file)
    const wander = (x0, y0, bias, nSteps, force) => {
      const pts = [[x0, y0]];
      let wx = x0, wy = y0;
      for (let k = 0; k < nSteps; k++) {
        const e = bias + (k < (force || 0) ? 0 : (rnd() * 2 - 1) * A4 * CRK.JIT);
        const s = STEP * (0.5 + 0.7 * rnd());
        const qx = wx + Math.cos(e) * s, qy = wy + Math.sin(e) * s;
        const u = hit(wx, wy, qx, qy);
        if (u != null) { pts.push([wx + (qx-wx) * u, wy + (qy-wy) * u]); break; }   // joins the main crack
        if (Math.abs(qy) > env(qx)) break;                  // fell off the diamond — the path ends
        pts.push([qx, qy]);
        wx = qx; wy = qy;
      }
      return pts;
    };
    for (let v = 1; v < core.length - 1; v++) {
      if (rnd() > CRK.LON_P) continue;
      const bias = (rnd() * 2 - 1) * A4;                    // its own systematic error
      const life = CRK.LON_MIN + Math.floor(rnd() * (CRK.LON_MAX - CRK.LON_MIN + 1));
      if (rnd() >= CRK.CPL_P) {                             // a plain loner
        const pts = wander(core[v][0], core[v][1], bias, life, 0);
        if (pts.length > 1) tracks.push({ pts, w: 0 });
        continue;
      }
      // a couple: walked as one double-file track, checked for a split at every step
      const pts = [[core[v][0], core[v][1]]];
      let wx = pts[0][0], wy = pts[0][1], k = 0, split = false;
      for (; k < life; k++) {
        const e = bias + (rnd() * 2 - 1) * A4 * CRK.JIT;
        const s = STEP * (0.5 + 0.7 * rnd());
        const qx = wx + Math.cos(e) * s, qy = wy + Math.sin(e) * s;
        const u = hit(wx, wy, qx, qy);
        if (u != null) { pts.push([wx + (qx-wx) * u, wy + (qy-wy) * u]); break; }
        if (Math.abs(qy) > env(qx)) break;
        pts.push([qx, qy]);
        wx = qx; wy = qy;
        if (rnd() < CRK.SPL_P) { split = true; break; }
      }
      if (pts.length > 1) tracks.push({ pts, w: 1 });
      if (split) {                                          // the halves part: two diverging steps
        const rest = Math.max(2, life - k - 1);             // each, then two independent loners
        for (const sgn of [1, -1]) {
          const half = wander(wx, wy, bias + sgn * (0.35 + rnd() * 0.35), rest, 2);
          if (half.length > 1) tracks.push({ pts: half, w: 0 });
        }
      }
    }
    return { D, core, tracks };
  }

  // Lay each edge's walk into page space: x stretched along the live parent→child link,
  // y carried across it unscaled (the band keeps its true thickness). Each stroke keeps
  // its midpoint's distance from the 'I' — the pulse clock reads it. Arithmetic only —
  // safe to re-run on every drag.
  function placeCracks() {
    crackSegs = [];
    if (!cracksBuilt) return;
    const PI = dotPos[iIndex]; if (!PI) return;
    for (let e = 0; e < crackEdges.length; e++) {
      const A = dotPos[crackEdges[e].p], B = dotPos[crackEdges[e].c], W = crackWalks[e];
      if (!A || !B || !W) continue;
      const ux = B.x - A.x, uy = B.y - A.y, L = Math.hypot(ux, uy) || 1;
      const nx = -uy / L, ny = ux / L, iD = 1 / W.D;
      const lay = (pts, w) => {           // w: 0 loner, 1 couple, 2 the main crack
        let px = A.x + (pts[0][0] * iD) * ux + pts[0][1] * nx;
        let py = A.y + (pts[0][0] * iD) * uy + pts[0][1] * ny;
        for (let k = 1; k < pts.length; k++) {
          const qx = A.x + (pts[k][0] * iD) * ux + pts[k][1] * nx;
          const qy = A.y + (pts[k][0] * iD) * uy + pts[k][1] * ny;
          crackSegs.push({ ax: px, ay: py, bx: qx, by: qy, w,
            dr: Math.hypot((px + qx) / 2 - PI.x, (py + qy) / 2 - PI.y) });
          px = qx; py = qy;
        }
      };
      lay(W.core, 2);
      for (const tr of W.tracks) lay(tr.pts, tr.w);
    }
  }

  // the single entry the rest of the code calls; (re)build the topology only when asked
  function buildCracks(rebuild) {
    if (rebuild || !cracksBuilt) buildGraph();
    placeCracks();
  }

  // the cracks' ink comes from the build's --crack-rgb (styles.css), so a variant can
  // recolour them (gold / garnet) by touching only the stylesheet
  let CRACK_RGB = GOLD;
  { const m = getComputedStyle(document.documentElement).getPropertyValue("--crack-rgb").match(/\d+/g);
    if (m && m.length === 3) CRACK_RGB = m.map(Number); }

  // A crack piece's life under the pulse, by its distance r from the 'I': dark until the
  // announcer arrives, a linear rise to full at the main front, SUSTAINED full until the
  // requiem passes, then the ring message's own stretched-exponential ember cool — and
  // gone. The cracks live only while the wave does; the site at rest never shows them.
  function crackEnv(r) {
    const Tp = ign.Tp;
    const aT = (r - ign.lead) / IGN.SPEED, mT = r / IGN.SPEED, rT = (r + ign.trail) / IGN.SPEED;
    if (Tp < aT) return 0;
    if (Tp < mT) return (Tp - aT) / ((ign.lead / IGN.SPEED) || 1);
    if (Tp < rT) return 1;
    return coolDecay(Tp - rT);
  }

  // Paint the live cracks: every stroke at its own pulse level, batched into a few
  // quantized Path2D strokes per width class so the wave still costs a handful of calls.
  // Three widths: loner < couple (double file) < the main crack.
  const CRACK_LVL = 20;
  const CRACK_W = [0.4, 0.62, 0.85], CRACK_A = [0.7, 0.78, 0.85];
  let crackClean = true;    // skip the per-frame clear once the wave is gone
  function drawCracks(scale) {
    if (!krctx) return;
    const live = lightsOn && ign.on && ign.Tp > 0 && crackSegs.length;
    if (!live) {
      if (!crackClean) { krctx.clearRect(0, 0, crackCanvas._cw, crackCanvas._ch); crackClean = true; }
      return;
    }
    krctx.clearRect(0, 0, crackCanvas._cw, crackCanvas._ch);
    crackClean = false;
    const sx = window.scrollX, sy = window.scrollY, cw = 0.45 + 0.2 * scale;   // a fine fissure, not a wire
    const bins = [[], [], []];                    // [width class][level] -> Path2D
    for (const g of crackSegs) {
      const env = crackEnv(g.dr); if (env < 0.02) continue;
      const lv = Math.max(1, Math.round(env * CRACK_LVL));
      const P = bins[g.w][lv] || (bins[g.w][lv] = new Path2D());
      P.moveTo(g.ax - sx, g.ay - sy); P.lineTo(g.bx - sx, g.by - sy);
    }
    krctx.lineCap = "round"; krctx.lineJoin = "round";
    for (let w = 0; w < 3; w++) {
      krctx.lineWidth = cw * CRACK_W[w];
      for (let lv = 1; lv <= CRACK_LVL; lv++) {
        if (!bins[w][lv]) continue;
        const a = CRACK_A[w] * lv / CRACK_LVL;
        krctx.strokeStyle = `rgba(${CRACK_RGB[0]},${CRACK_RGB[1]},${CRACK_RGB[2]},${a.toFixed(3)})`;
        krctx.stroke(bins[w][lv]);
      }
    }
  }

  // Lay "WILLING TO WORK" out along the mid-radius arc: measure each letter's
  // advance and convert to an angular offset from the string centre. Offsets are
  // scale-free (advance ∝ font ∝ radius), so this runs once (re-run on font load).
  function layoutRingText() {
    if (!mctx) return;
    const Fref = 100, sp = Fref * 0.06;            // a probe size; letter spacing
    mctx.font = `bold ${Fref}px ${FAMILY}`;
    const w = chars.map(c => mctx.measureText(c).width);
    let total = 0; for (let i = 0; i < w.length; i++) { total += w[i]; if (i) total += sp; }
    const Rref = R_OVER_THK * (Fref / FONT_FRAC);  // the mid radius at this probe size
    letterOff = [];
    let cum = -total / 2;
    for (let i = 0; i < chars.length; i++) {
      letterOff.push(-(cum + w[i] / 2) / Rref);    // radians from the centre (reads L→R at the bottom)
      cum += w[i] + sp;
    }
  }

  let raf = 0;
  // keep animating while the letters are still cooling, even after a scroll stops
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); if (lettersWarm) schedule(); }); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { sizeCanvas(); buildFrame(); layoutDots(); if (!lightsOn) anchorLogoToPage(); schedule(); });

  // ---- dragging the dots and the logo --------------------------------------
  // The decorative layers are pointer-events:none, so hit-testing is geometric and
  // done here from the window pointer stream. A dot is grabbable from its centre out
  // to just past its diffused edge; the logo from anywhere on the annulus band or
  // inside either b's silhouette (the annulus is a radius test; a b uses the same
  // b-primitive point-in-silhouette test the lighting uses — see bb.txt).
  // A held drag relights on the fly through schedule().
  function hitDot(x, y) {
    const hitR = ptPx * 0.6;              // narrow: centre to just over the diffused boundary
    let best = -1, bestD = hitR;
    for (let i = 0; i < dotPos.length; i++) {
      const p = dotPos[i]; if (!p) continue;
      const d = Math.hypot(p.x - window.scrollX - x, p.y - window.scrollY - y);
      if (d <= bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function hitLogo(x, y) {
    if (!geo) return false;
    const { cx, cy, scale, rIn, rOut } = geo;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist >= rIn && dist <= rOut) return true;              // on the annulus ring
    const cR = Math.cos(rotRad), sR = Math.sin(rotRad);
    for (let b = 0; b < 2; b++) {
      const pr = vpToPrim(x, y, USES[b], cx, cy, scale, cR, sR);
      if (inPoly(pr[0], pr[1], B_SIL)) return true;            // inside a 'b'
    }
    return false;
  }
  function onMove(e) {
    if (!drag) return;
    if (drag.kind === "dot") {
      const pageX = e.clientX - drag.ox + window.scrollX;
      const pageY = e.clientY - drag.oy + window.scrollY;
      drag.el.style.left = pageX.toFixed(1) + "px";
      drag.el.style.top  = pageY.toFixed(1) + "px";
      drag.el._moved = true;
      dotPos[drag.i] = { x: pageX, y: pageY };
      placeCracks();                         // only re-lay the cracks (tree and walks are fixed)
    } else {
      logoDx = drag.baseDx + (e.clientX - drag.ox);
      logoDy = drag.baseDy + (e.clientY - drag.oy);
      root.style.setProperty("--sig-dx", logoDx.toFixed(1) + "px");
      root.style.setProperty("--sig-dy", logoDy.toFixed(1) + "px");
    }
    schedule();                            // relight as it moves
  }
  function onUp() {
    drag = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }
  function onDown(e) {
    if (e.button) return;                                       // primary button only
    if (e.target.closest && e.target.closest("a, button")) return;   // don't steal real link/button clicks
    const di = hitDot(e.clientX, e.clientY);
    if (di >= 0) {
      const p = dotPos[di];
      drag = { kind: "dot", i: di, el: dotEls[di],
               ox: e.clientX - (p.x - window.scrollX), oy: e.clientY - (p.y - window.scrollY) };
    } else if (hitLogo(e.clientX, e.clientY)) {
      drag = { kind: "logo", ox: e.clientX, oy: e.clientY, baseDx: logoDx, baseDy: logoDy };
    } else return;
    e.preventDefault();
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }
  // grab cursor when hovering something draggable (cheap: uses cached geometry)
  function onHover(e) {
    if (drag) return;
    document.body.style.cursor =
      (hitDot(e.clientX, e.clientY) >= 0 || hitLogo(e.clientX, e.clientY)) ? "grab" : "";
  }
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onHover, { passive: true });

  // ---- the top-right controls: master light (the bulb) + language switch (the pill) ----
  const bulbBtn  = document.getElementById("bulb-toggle");
  const langBtn  = document.getElementById("lang-switch");

  // persistence: remember just two functional choices (language, light on/off) across visits,
  // in localStorage. These are preferences the visitor sets themselves — no tracking, no personal
  // data, nothing sent anywhere — so they need no cookie notice. Wrapped so private-mode throws are
  // swallowed (the site just stops remembering, never breaks).
  const STORE = "jbb:";
  const remember = (k, v) => { try { localStorage.setItem(STORE + k, v); } catch (e) {} };
  const recall   = (k)    => { try { return localStorage.getItem(STORE + k); } catch (e) { return null; } };

  // bulb: off removes the points + every lighting layer (CSS), freezes the logo upright AND
  // un-pins it — the logo stops riding the viewport and becomes a static image anchored to the
  // page (CSS swaps it to position:absolute), so it scrolls away with the content. on returns
  // straight to steady light and re-pins it (no re-ignition).
  function anchorLogoToPage() {
    // the fixed logo sits at top:34% of the viewport; absolute-anchor it to the same spot on
    // the page (at scrollY 0 the page top and viewport top coincide), so it holds there and scrolls off
    root.style.setProperty("--sig-abs-top", (0.34 * window.innerHeight).toFixed(1) + "px");
  }
  function setLights(on) {
    lightsOn = on;
    document.body.classList.toggle("lights-off", !on);
    bulbBtn.classList.toggle("off", !on);
    bulbBtn.setAttribute("aria-pressed", String(on));
    bulbBtn.setAttribute("aria-label", on ? "Turn the light off" : "Turn the light on");
    if (!on) {
      ign.on = false;                                       // kill any still-running ignition
      rotRad = 0;
      if (markEl) markEl.setAttribute("transform", MARK_BASE);
      // clear any live drag offset so the logo drops back to its original spot — otherwise a
      // logo dragged onto the name would be frozen there when the light goes out
      logoDx = logoDy = 0;
      root.style.setProperty("--sig-dx", "0px");
      root.style.setProperty("--sig-dy", "0px");
      anchorLogoToPage();
    } else {
      for (let i = 0; i < dotEls.length; i++) setLit(i, 1); // straight to steady light
      setCore("");
    }
    remember("light", on ? "on" : "off");
    draw();
  }
  if (bulbBtn) bulbBtn.addEventListener("click", () => setLights(!lightsOn));

  // language + content: the page's words live OUTSIDE this file, in assets/content.en.js and
  // assets/content.es.js (each a plain window.CONTENT_<LANG> map of data-i18n key -> text,
  // loaded by their own <script> tags before this one — no fetch, so it works from file://).
  // index.html holds only the structure; every translatable node carries data-i18n="key" and
  // is filled here from the active language's map. Proper names, dates and GPAs stay inline.
  const EN = window.CONTENT_EN || {}, ES = window.CONTENT_ES || {};
  {
    const nodes = [...document.querySelectorAll("[data-i18n]")];
    const meta = document.querySelector('meta[name="description"]');
    const enTitle = document.title, enDesc = meta ? meta.content : "";
    let lang = "en";
    function setLang(l) {
      lang = l;
      const dict = l === "es" ? ES : EN;
      document.documentElement.lang = l;
      if (langBtn) {
        langBtn.classList.toggle("es", l === "es");
        langBtn.setAttribute("aria-pressed", String(l === "es"));
        langBtn.setAttribute("aria-label", l === "es" ? "Switch to English" : "Cambiar a español");
      }
      for (const n of nodes) {
        const k = n.dataset.i18n;
        const v = dict[k] != null ? dict[k] : (EN[k] != null ? EN[k] : n.innerHTML);   // fall back to English, then to what's in the page
        if (v != null) n.innerHTML = v;
      }
      document.title = (l === "es" ? ES._title : EN._title) || enTitle;
      if (meta) meta.content = (l === "es" ? ES._desc : EN._desc) || enDesc;
      remember("lang", l);
    }
    // layoutDots()/draw() live in the click handler, NOT inside setLang. The init setLang below
    // runs at PARSE time (this script sits at the end of <body>); forcing a dot relayout that
    // early pins the page into a slow CPU-compositing path for every later frame (drove a
    // superfluid page down to ~30fps). On load, start() does the first layout+draw anyway; a
    // language TOGGLE reflows the text, so it relayouts there — post-load, where it's harmless.
    if (langBtn) langBtn.addEventListener("click", () => { setLang(lang === "en" ? "es" : "en"); layoutDots(); draw(); });
    setLang(recall("lang") === "es" ? "es" : "en");         // initial fill from the content files (start() handles first layout)
  }

  // restore a remembered "interaction off" before the load sequence — so the ignition is
  // skipped and the logo comes up static and page-anchored from the first paint
  if (recall("light") === "off") setLights(false);

  // the ignition runs its own frame loop until the sequence completes; afterwards
  // steady light resumes on demand (scroll / drag / cooling) through schedule()
  function ignTick() { draw(); if (ign.on) requestAnimationFrame(ignTick); }
  function start() {
    sizeCanvas(); buildFrame(); layoutDots(); layoutRingText();
    if (ign.on) ign.start = performance.now();                    // start the clock once layout is ready
    else { for (let i = 0; i < dotEls.length; i++) setLit(i, 1); }   // reduced motion: straight to lit, no pulse so no cracks
    draw();
    if (ign.on) requestAnimationFrame(ignTick);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { layoutRingText(); draw(); });
  requestAnimationFrame(draw);
  setTimeout(() => { layoutDots(); draw(); }, 300);
})();
