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
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const iIndex = dotEls.indexOf(iDot);
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

  // letters heat up as they brighten: a black-body-ish ramp anchored at carmesí
  // (#7f3445, from the firecoat logo) — dark wine when barely lit, hot escarlata
  // when fully lit, so the sequence reads as the letters becoming incandescent.
  const HEAT = [[0.00, 40, 28, 8], [0.45, 150, 100, 22], [1.00, 250, 208, 42]];  // BUILD COLOUR — option 1: annulus gold
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
  const DIFFUSE = 1.4;                              // reflect-canvas blur (CSS px ≈ DIFFUSE × s)
  const CAST_ALPHA = 0.16;                          // peak alpha of an exterior point's cone
  const GLOW_SCALE = 0.7;                           // the glowing (atmospheric) layer at 70% — the reflective layer (reflect.js) carries the rest
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
    if (cctx) { castBlur = 2.2 * s; fitCanvas(castCanvas, cctx, castBlur); }  // cones, lightly softened
    if (pctx) fitCanvas(pulseCanvas, pctx, 1.2 * s);         // the ignition pulse, softly
    // the ring letters are DOM text; size them to the ring thickness (thk = 17.537·s)
    if (lettersLayer) lettersLayer.style.fontSize = (FONT_FRAC * 17.537 * s).toFixed(2) + "px";
  }

  const GOLD = [250, 208, 42];
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

  // The flashlight an exterior point throws at the logo — three superimposed cones, each
  // reaching only |q - centre| - rIn, i.e. exactly up to the annulus' inner boundary. That
  // reach is what keeps an exterior light's cast out of the annulus and the bowl (no clip
  // needed) — and it does so WHATEVER the aperture: the whole inner hole sits at least d - rIn from the
  // point, so a cone capped at that radius can never spill into the bowl. The aperture only
  // sets how wide the beam fans across the arc the point can see. The three, bottom -> top:
  //  • a WIDE main beam that reaches PAST the outer-boundary tangent — by the small angle between
  //    the outer-tangent ray (asin(rOut/d)) and the inner-tangent ray (asin(rIn/d)), on each side —
  //    so it doesn't read as too tight at the edges (the theme glow). Still safe: the reach cap
  //    keeps it out of the bowl whatever the aperture, and past the outer tangent it only spills
  //    over open page, never the annulus interior;
  //  • a brighter INNER lobe, tangent to the INNER boundary — the normal-incidence core seen
  //    straight on, so the beam stays bright at centre and dims toward its edges;
  //  • a NARROW near-white beam (30% of the outer aperture) elaborating the flashlight.
  const CAST_WHITE = [250, 240, 205];
  let   CAST_GLOW  = [255, 230, 102];     // the two wider cones' theme-yellow colour (set per build)
  // aim (toward the centre) + half-aperture of the tangent cone from point q to the
  // circle radius r. The half-aperture is the circle's angular radius asin(r/d) — always
  // positive; the aim is the q->centre direction (the bisector of the two tangent rays).
  function castTangent(q, cx, cy, r) {
    const ratio = r / q.d; if (ratio >= 1) return null;
    return { am: Math.atan2(cy - q.py, cx - q.px), half: Math.asin(ratio) };
  }
  // A point only focuses cones on the logo once it is CLOSE. Far off it is just a
  // bulb with nothing to aim at — a tight 360° radial glow. The crossover is q.gate
  // (set in draw from the point's distance to the logo): pure glow at two outer
  // radii away, pure cones by one, crossfading between — the same band over which the
  // point starts to illuminate the logo at all. q.w (0..1) is how awake the point is.
  const GLOW_FRAC = 75;                      // radial-glow radius as px·scale (the point's natural reach)
  // How a point's omni glow falls off with normalised radius s = r/R: f(0)=1 at the core,
  // f(1)=0 at the clipped rim. Keeping f(1)=0 fixes the reach at R.
  // BUILD: physical falloff — a point lamp at height 1 over a flat patch, lit by inverse-square
  // × Lambert's cosine: E(s) = cosθ/d² = (1+s²)^-3/2, renormalised so the rim value E(1) maps to 0.
  // A bright concentrated core with a soft tail — reads as a real light source, not a flat disc.
  const GLOW_RIM = Math.pow(2, -1.5);                 // E at the rim s=1
  const glowFalloff = s => (Math.pow(1 + s * s, -1.5) - GLOW_RIM) / (1 - GLOW_RIM);

  // ---- text-lighting hook -------------------------------------------------
  // A variant page may define window.TEXT_LIGHT(lights, frame) to light the page COPY from
  // this same point field (lights = [{x,y,r,i}] in viewport px; frame = {sx,sy,vw,vh}). We
  // expose the pieces a variant needs, and fire 'litrelayout' whenever the cached layout
  // changes (load / resize / font / language) so a variant can recache its element rects.
  const TEXT_SEL = ".eyebrow, .hero__given, .hero__sur, .hero__lede, .kicker, .entry__when, " +
                   ".entry__what h3, .entry__org, .entry__detail, .pub__title, .pub__meta, " +
                   ".pub__note, .pub__orcid, .about__body p, .contact__head";
  window.LITAPI = { incRGB, glowFalloff, GOLD, GLOW_FRAC, TEXT_SEL,
    targets: () => [...document.querySelectorAll(TEXT_SEL)] };

  // Sampled into stops, since a canvas gradient only interpolates linearly between them.
  function radialGlow(c, x, y, R, rgb, peak) {
    const g = c.createRadialGradient(x, y, 0, x, y, R), S = 24;
    for (let i = 0; i <= S; i++) {
      const s = i / S;
      g.addColorStop(s, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(peak * Math.max(0, glowFalloff(s))).toFixed(3)})`);
    }
    return g;
  }
  function drawCast(ext, cx, cy, rOut, rIn, scale) {
    if (!cctx) return;
    cctx.clearRect(0, 0, castCanvas._cw, castCanvas._ch);
    const glowR = GLOW_FRAC * scale;
    const wedge = (ex, ey, am, half, rch, c, alpha) => {
      if (!(half > 0) || !(rch > 0)) return;
      const f1x = ex + rch*Math.cos(am+half), f1y = ey + rch*Math.sin(am+half);
      const f2x = ex + rch*Math.cos(am-half), f2y = ey + rch*Math.sin(am-half);
      const g = cctx.createRadialGradient(ex, ey, 0, ex, ey, rch);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`);
      g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      cctx.fillStyle = g;
      cctx.beginPath(); cctx.moveTo(ex, ey); cctx.lineTo(f1x, f1y); cctx.lineTo(f2x, f2y); cctx.closePath(); cctx.fill();
    };
    for (const q of ext) {
      const w = q.w == null ? 1 : q.w; if (w <= 0) continue;
      const coneW = q.gate == null ? 1 : q.gate;
      const glowW = 1 - coneW;
      if (GLOW_SCALE > 0 && glowW > 0.01) {        // far: a soft omni glow around the point (quadratic falloff)
        const a = (CAST_ALPHA * 1.6 * glowW * w * GLOW_SCALE);
        cctx.fillStyle = radialGlow(cctx, q.px, q.py, glowR, CAST_GLOW, a);
        cctx.beginPath(); cctx.arc(q.px, q.py, glowR, 0, TAU); cctx.fill();
      }
      if (coneW > 0.01) {                          // near: the focused cones, growing in as the glow fades
        const outer = castTangent(q, cx, cy, rOut); if (!outer) continue;
        const inner = castTangent(q, cx, cy, rIn);
        const reach = q.d - rIn, cw = coneW * w;   // stop at the inner boundary — the cast never enters the logo
        // reach PAST the outer tangent by (outer-tangent − inner-tangent) angle on each side
        const wideHalf = Math.min(2 * outer.half - (inner ? inner.half : outer.half), 1.45);
        wedge(q.px, q.py, outer.am, wideHalf, reach, CAST_GLOW, CAST_ALPHA * 1.30 * cw);                // wide main beam, a touch past the OUTER tangent so the edges don't read tight
        if (inner) wedge(q.px, q.py, inner.am, inner.half, reach, CAST_GLOW, CAST_ALPHA * 0.85 * cw);   // inner lobe — extra brightness on the straight-on core, so the beam dims toward its edges
        wedge(q.px, q.py, outer.am, outer.half * 0.30, reach, CAST_WHITE, CAST_ALPHA * 1.90 * cw);      // narrow white flashlight, on top
      }
    }
  }

  // The i-dot GATHERING its light, before the pulse: a radial glow as wide as the
  // page that tightens onto the point's natural reach over the preamble, brightening
  // as it concentrates. prog is 0..1 across the gather; (icx,icy) is the i-dot. Drawn
  // on the cast canvas (above the page), after drawCast has cleared it.
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
    const glowR = GLOW_FRAC * scale;          // a point still counts if its glow can reach the view

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
      const gate = Math.max(0, Math.min(1, 3 - dist / rOut));   // logo engagement: full within 2·rOut, gone by 3·rOut

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

    drawCast(ext, cx, cy, rOut, rIn, scale);
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

    // hand the point field to the REFLECTIVE layer (reflect.js). This layer is independent of the
    // logo: a point lights the copy by its full wake w — NOT gated by cone/glow mode — so a point
    // near the logo still lights nearby text. (The glowing layer above stays logo-gated.)
    if (window.TEXT_LIGHT) {
      const TL = [];
      for (const p of inn) { if (p.w > 0.02) TL.push({ x: p.px, y: p.py, r: glowR, i: p.w }); }
      for (const p of ext) { if (p.w > 0.02) TL.push({ x: p.px, y: p.py, r: glowR, i: p.w }); }
      window.TEXT_LIGHT(TL, { sx, sy, vw, vh });
    }
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
    // the dots scale with the (now 20%-smaller) logo, which left them too small; nudge the
    // ratio up so they land halfway back — 0.95 × (gap) × 1.125, i.e. half of the 20% shrink restored
    ptPx = 1.069 * gapPx;
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
    dotPos.length = 0;
    for (const dot of dotEls) {
      const r = dot.getBoundingClientRect();
      dotPos.push({ x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY });
    }
    window.dispatchEvent(new Event("litrelayout"));   // a text-light variant recaches its rects here
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
  window.addEventListener("resize", () => { sizeCanvas(); layoutDots(); if (!lightsOn) anchorLogoToPage(); schedule(); });

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
    sizeCanvas(); layoutDots(); layoutRingText();
    if (ign.on) ign.start = performance.now();                    // start the clock once layout is ready
    else for (let i = 0; i < dotEls.length; i++) setLit(i, 1);    // reduced motion: straight to lit
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
