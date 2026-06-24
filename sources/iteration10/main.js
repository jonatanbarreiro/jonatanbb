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
  // lingers a moment, then falls off so it's fully gone ~1s after illumination — the quick
  // glow of cooling metal. (The b faces no longer cool — they light only, see below.)
  const COOL_TAU = 0.4, COOL_BETA = 1.6;
  const coolDecay = age => Math.exp(-Math.pow(age / COOL_TAU, COOL_BETA));
  // The centre dot alone puts tone(GAIN_IN) ≈ 0.59 on the whole inner wall; the
  // letters must stay dark under that resting glow and only heat from EXTRA light.
  // letters read as lit above TXT_T0. The central point alone puts ~0.593 on the arc it
  // sees; TXT_T0 sits just under that so WORK (rotated onto that arc) reads as a faint
  // cue, while letters off the arc stay dark until EXTRA light heats them.
  const TXT_T0 = 0.55, TXT_T1 = 1.0;
  const FAMILY = "'Inter', system-ui, -apple-system, sans-serif";
  const FONT_FRAC = 0.50;             // letter font px as a fraction of the ring thickness (one notch smaller)
  const R_OVER_THK = 120 / 17.537;    // mid radius / ring thickness (= 6.843), scale-free
  const CENTRE_ANG = Math.PI;         // the string is centred on the left arc (faces screen centre)
  const STRING_ROT = -Math.PI / 5;    // turn the whole string π/5 anticlockwise so WORK lands on the
                                      // arc the central point lights — WORK alone reads as a faint cue
  const lettersCanvas = document.getElementById("letters-canvas");
  const lctx = lettersCanvas ? lettersCanvas.getContext("2d") : null;

  // letters heat up as they brighten: a black-body-ish ramp anchored at carmesí
  // (#7f3445, from the firecoat logo) — dark wine when barely lit, hot escarlata
  // when fully lit, so the sequence reads as the letters becoming incandescent.
  const HEAT = [[0.00, 40, 28, 8], [0.45, 150, 100, 22], [1.00, 232, 163, 23]];  // BUILD COLOUR — option 1: annulus gold
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
  const DIFFUSE = 1.4;                              // reflect-canvas blur (CSS px ≈ DIFFUSE × s)
  const CAST_ALPHA = 0.16;                          // peak alpha of an exterior point's cone
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
  //   version0/assets/illumination/   (illumination.txt + the b-split*/b-out* svgs).
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
  // their inner face). See illumination.txt.
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
      if (p.role === 'region' && p.ridx >= 0) {
        // a region light sees a face only through the open notch — occlude by both b's so it
        // lights just the slice it can actually see, not the whole face through intervening logo
        for (const el of B_LIT[p.ridx]) add(p.bk, 0, el, p.px, p.py, silVp, GAIN_B);
      } else if (p.role === 'ext') {
        for (let b = 0; b < 2; b++) {
          const pr = vpToPrim(p.px, p.py, USES[b], cx, cy, scale, cR, sR);  // occlude by both b's (near b and self)
          if (sideOut(pr, B_TRI, 0, 1)) for (const el of B_G_LEFT)  add(b, 1, el, p.px, p.py, silVp, GAIN_B_EXT);  // beyond 7-8
          if (sideOut(pr, B_TRI, 1, 2)) for (const el of B_G_BOT)   add(b, 1, el, p.px, p.py, silVp, GAIN_B_EXT);  // beyond 8-9
          if (sideOut(pr, B_TRI, 2, 0)) for (const el of B_G_MOUTH) add(b, 0, el, p.px, p.py, silVp, GAIN_B_EXT);  // beyond 9-7
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
    if (cctx) { castBlur = 2.2 * s; fitCanvas(castCanvas, cctx, castBlur); }  // cones, lightly softened
    if (lctx) fitCanvas(lettersCanvas, lctx, 0.3 * s);       // letters, a touch of diffusion (sharper)
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

  // The light an exterior point throws at the logo — three superimposed cones (bottom → top):
  //  • a WIDE one whose edges are tangent to the OUTER boundary — a barely-there theme glow;
  //  • a tighter one whose edges are tangent to the INNER boundary — the main theme glow;
  //  • a NARROW near-white beam (30% of the outer aperture, HALF the range) from 10% nearer
  //    the centre, sitting on top.
  // The whole cast is then erased inside the outer boundary (plus the blur margin) so the
  // light stops at the annulus and never crosses into it (either way).
  const CAST_WHITE = [250, 240, 205];
  let   CAST_GLOW  = [232, 194, 74];     // the two wider cones' theme-yellow colour (set per build)
  // aim (mean direction) + half-aperture of the tangent cone from point q to the circle radius r
  function castTangent(q, cx, cy, r) {
    const ratio = r / q.d; if (ratio >= 1) return null;
    const gm = Math.acos(ratio);
    const t1x = cx + r*Math.cos(q.th + gm), t1y = cy + r*Math.sin(q.th + gm);
    const t2x = cx + r*Math.cos(q.th - gm), t2y = cy + r*Math.sin(q.th - gm);
    const a1 = Math.atan2(t1y - q.py, t1x - q.px), a2 = Math.atan2(t2y - q.py, t2x - q.px);
    return { am: Math.atan2(Math.sin(a1)+Math.sin(a2), Math.cos(a1)+Math.cos(a2)),
             half: Math.atan2(Math.sin(a1-a2), Math.cos(a1-a2)) / 2 };
  }
  function drawCast(ext, cx, cy, rOut, rIn) {
    if (!cctx) return;
    cctx.clearRect(0, 0, castCanvas._cw, castCanvas._ch);
    const reach = 2 * rOut;
    const wedge = (ex, ey, am, half, rch, c, alpha) => {
      if (!(half > 0)) return;
      const f1x = ex + rch*Math.cos(am+half), f1y = ey + rch*Math.sin(am+half);
      const f2x = ex + rch*Math.cos(am-half), f2y = ey + rch*Math.sin(am-half);
      const g = cctx.createRadialGradient(ex, ey, 0, ex, ey, rch);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`);
      g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      cctx.fillStyle = g;
      cctx.beginPath(); cctx.moveTo(ex, ey); cctx.lineTo(f1x, f1y); cctx.lineTo(f2x, f2y); cctx.closePath(); cctx.fill();
    };
    for (const q of ext) {
      const outer = castTangent(q, cx, cy, rOut); if (!outer) continue;
      const inner = castTangent(q, cx, cy, rIn);
      wedge(q.px, q.py, outer.am, outer.half, reach, CAST_GLOW, CAST_ALPHA * 0.22);              // wide, outer-tangent, barely there
      if (inner) wedge(q.px, q.py, inner.am, inner.half, reach, CAST_GLOW, CAST_ALPHA * 0.85);   // inner-tangent, the main glow
      const ex = q.px + (cx - q.px) * 0.10, ey = q.py + (cy - q.py) * 0.10;
      wedge(ex, ey, outer.am, outer.half * 0.30, reach * 0.5, CAST_WHITE, CAST_ALPHA * 1.45);    // narrow white beam, on top
    }
    // erase the annulus and its inside (past the blur margin) so no light leaks across the ring
    cctx.save();
    cctx.globalCompositeOperation = "destination-out";
    cctx.beginPath(); cctx.arc(cx, cy, rOut + castBlur * 1.3, 0, TAU); cctx.fill();
    cctx.restore();
  }

  // The incandescent ring letters, on their own canvas in this same pass. The
  // message RIDES the logo's spin (angle += rotRad) and is oriented to read on
  // the BOTTOM half of the ring — at rest it sits on the left arc and rolls down
  // to the bottom as you scroll into the content (where you read it); it inverts
  // only once it rolls past, which we accept. Each letter heats INSTANTLY to the
  // light on its arc, then cools by the shared stretched exponential so the heat
  // lingers ~1s and fades by ~5s. Sets `lettersWarm` while any letter is still
  // cooling, so the loop keeps animating the cool-down after a scroll stops.
  function drawLetters(cx, cy, R, thk, toneOut, toneIn) {
    if (!lctx || letterOff.length !== chars.length) return;
    const now = performance.now();
    const dt = heatT ? Math.min((now - heatT) / 1000, 0.1) : 0;
    heatT = now;
    lctx.clearRect(0, 0, lettersCanvas._cw, lettersCanvas._ch);
    lctx.font = `bold ${(FONT_FRAC * thk).toFixed(1)}px ${FAMILY}`;
    lctx.textAlign = "center"; lctx.textBaseline = "middle";
    let cooling = false;
    for (let i = 0; i < chars.length; i++) {
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
      if (chars[i] === " ") continue;
      const lvl = Math.round(heat[i] * LEVELS);
      if (lvl <= 0) continue;
      const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      lctx.save();
      lctx.translate(x, y);
      lctx.rotate(ang - Math.PI / 2);          // tangent; readable on the bottom half
      lctx.fillStyle = incandescent(lvl / LEVELS);
      lctx.fillText(chars[i], 0, 0);
      lctx.restore();
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
    const halfStroke = 8.7685 * scale, rOut = R + halfStroke, rIn = R - halfStroke, thk = rOut - rIn;
    const sx = window.scrollX, sy = window.scrollY, vw = window.innerWidth, vh = window.innerHeight;
    const ext = [], inn = [];
    for (let i = 0; i < dotEls.length; i++) {
      const p = dotPos[i]; if (!p) continue;
      const px = p.x - sx, py = p.y - sy;
      if (px < 0 || px > vw || py < 0 || py > vh) continue;   // only on-screen points illuminate
      const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      if (dist >= rOut) ext.push({ th, d: dist, px, py });
      else if (dist < rIn) inn.push({ th, d: dist, px, py });
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

    // the two boundary-illumination sequences over the uniform arc partition
    const toneOut = new Array(N), toneIn = new Array(N);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU;
      toneOut[k] = tone(outerIlluminance(a, ext, rOut));
      toneIn[k]  = tone(innerIlluminance(a, inn, rIn, cx, cy));
    }

    drawCast(ext, cx, cy, rOut, rIn);
    drawReflections({ alphaOut: toneOut, alphaInner: toneIn, cx, cy, rOut, rIn,
      maxReach: 0.45 * thk,                          // reach trimmed 10% (flatter falloff)
      overshoot: 2.5 * scale });
    lightAndPaintB(cx, cy, scale, cR, sR, inn);
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
    const gapPx = 12.225 * KLOGO * c.scale, ptPx = 0.95 * gapPx;
    field.style.setProperty("--pt", ptPx.toFixed(1) + "px");
    centreDot.style.left = (c.cx + window.scrollX).toFixed(1) + "px";
    centreDot.style.top  = (c.cy + window.scrollY).toFixed(1) + "px";
    if (iSpan) {
      const r = iSpan.getBoundingClientRect();
      // sit the dot just above the small-cap 'i' like its tittle: in small-caps the glyph
      // top is ~0.30·h below the inline box top, and the dot is centred (translate -50%)
      iDot.style.left = (r.left + window.scrollX + r.width / 2).toFixed(1) + "px";
      iDot.style.top  = (r.top + window.scrollY + r.height * 0.34 - ptPx * 0.30).toFixed(1) + "px";
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
      letterOff.push(-(cum + w[i] / 2) / Rref);    // radians from the centre (reads L→R at the bottom)
      cum += w[i] + sp;
    }
  }

  let raf = 0;
  // keep animating while the letters are still cooling, even after a scroll stops
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); if (lettersWarm) schedule(); }); };
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
