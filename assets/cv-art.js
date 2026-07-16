// cv-art.js — regenerates the CV's vector artwork (the pipe system + the gold
// contact icons) as the cv-*.pdf assets beside this file, printed through system
// Chrome (run: NODE_PATH=/usr/local/lib/node_modules node cv-art.js).
//
// Units are b-primitive u (the b's stroke = 10.5u); the CV prints the pipes at a
// 3.4pt stroke, i.e. 0.32381 pt/u. The KNOT is the site's b rotated 225°: its
// second stick is the bar that crosses the pipe toward the section name, its
// belly loops under, and its long stick curves 45° into the band to carry the
// pipe on down. Per Jonatan's markup the knots are scaled 1.5x (stroke kept).
// At every crossing the under-pipe touches the pipe above and dims against
// it — a subtle gold shading over its last stroke (10.5u), entering and
// leaving — just enough shadow to give the piping personality. In the knots
// the belly runs its 45° line straight under the bar (no north turn), and the
// pipe rides the dive's own x (19.7u) through the whole knot — entering from
// above, re-emerging below and turning back down all on that line — so the
// crossing reads as one pipe passing under the bar.
const { chromium } = require('playwright-core');
const GOLD = '#fad02a';
const DARK = '#bfa021';   // the dive shade: gold at ~3/4 light — a shadow, not a blackout
// the fade of an under-pipe into its crossing: gold at distance, DARK at
// contact; pad spread holds the end colours past the stops
const FADE = (id, x1, y1, x2, y2) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse" spreadMethod="pad">
    <stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${DARK}"/></linearGradient>`;
const STROKE = `fill="none" stroke="${GOLD}" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;
const IC = `fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;

const jobs = [

// ---- the section knot (bar centreline y=0, pipe band centred on x=19.7 —
//      the belly's dive x, so the pipe crosses the bar right where it
//      re-emerges below): the pipe dims into the bar from above; the belly's
//      45° line runs straight under the bar, dimming over its last stroke;
//      the long stick's 45° turn lands back on the same x to carry the pipe
//      down. The belly is drawn first and overshoots into the bar band; the
//      bar repaints over it ----
{ name: 'cv-knot', w: 130, h: 172, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 172">
  <defs>${FADE('kin', 19.7, -15.75, 19.7, -5.25)}${FADE('kdg', -10.5, 0, 0, 0)}</defs>
  <rect x="13.7" y="-60" width="12" height="172" fill="#ffffff"/>
  <rect x="14.45" y="-60" width="10.5" height="44.25" fill="${GOLD}"/>
  <rect x="14.45" y="-15.75" width="10.5" height="10.5" fill="url(#kin)"/>
  <path d="M24.95 0 L-28.2 53.15 L-28.2 -5.25" ${STROKE}/>
  <rect x="-10.5" y="-5.25" width="18.5" height="10.5" fill="url(#kdg)" transform="translate(19.7 5.25) rotate(-45)"/>
  <path d="M-28.2 0 L76.8 0 L19.7 57.1 L19.7 112" ${STROKE}/>
</svg>` },

// ---- the skills knot: no stem — the bar ends in the site's hook, tip in line
//      with the other knots' turn apexes (x = 89.5), and the pipe ends here ----
{ name: 'cv-knot-skills', w: 130, h: 132, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 132">
  <defs>${FADE('sin', 19.7, -15.75, 19.7, -5.25)}${FADE('sdg', -10.5, 0, 0, 0)}</defs>
  <rect x="13.7" y="-60" width="12" height="132" fill="#ffffff"/>
  <rect x="14.45" y="-60" width="10.5" height="44.25" fill="${GOLD}"/>
  <rect x="14.45" y="-15.75" width="10.5" height="10.5" fill="url(#sin)"/>
  <path d="M24.95 0 L-28.2 53.15 L-28.2 -5.25" ${STROKE}/>
  <rect x="-10.5" y="-5.25" width="18.5" height="10.5" fill="url(#sdg)" transform="translate(19.7 5.25) rotate(-45)"/>
  <path d="M-28.2 0 L65.2 0" ${STROKE}/>
  <polygon points="65.2,-5.25 89.5,-5.25 67.9,9.22 65.2,5.25" fill="${GOLD}"/>
</svg>` },

// ---- the frame's top-right salient stick: the top side runs on past the
//      corner and ends in the site's hook, down, pointing at the name — the
//      skills knot's own ending, a shade longer ----
{ name: 'cv-stick', w: 84.3, h: 14.47, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -5.25 84.3 14.47">
  <rect x="0" y="-5.25" width="60" height="10.5" fill="${GOLD}"/>
  <polygon points="60,-5.25 84.3,-5.25 62.7,9.22 60,5.25" fill="${GOLD}"/>
</svg>` },

// ---- the TOP LEFT knotty corner, half-scale: the top side dips under the
//      left side (the vertical rides on top), fading black against it from
//      the right, resurfacing black-to-gold on its 24u run past the corner,
//      then hooking back 45° into the vertical ----
{ name: 'cv-corner', w: 54, h: 52, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -38 54 52">
  <defs>${FADE('cr', 15.75, 0, 5.25, 0)}${FADE('cl', -15.75, 0, -5.25, 0)}</defs>
  <path d="M-5.25 0 L-24 0 L0 -24 L0 14" ${STROKE}/>
  <rect x="-15.75" y="-5.25" width="10.5" height="10.5" fill="url(#cl)"/>
  <rect x="5.25" y="-5.25" width="10.5" height="10.5" fill="url(#cr)"/>
</svg>` },

// ---- the BOTTOM RIGHT knotty corner (drawn top-left-wise, placed rotated
//      180°): the side fades black under the horizontal, which rides on top,
//      resurfaces past the corner and hooks back 45° into it ----
{ name: 'cv-corner-br', w: 54, h: 65, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -38 54 65">
  <defs>${FADE('bb', 0, 15.75, 0, 5.25)}${FADE('bt', 0, -15.75, 0, -5.25)}</defs>
  <path d="M0 -5.25 L0 -24 L-24 0 L14 0" ${STROKE}/>
  <rect x="-5.25" y="-15.75" width="10.5" height="10.5" fill="url(#bt)"/>
  <rect x="-5.25" y="5.25" width="10.5" height="10.5" fill="url(#bb)"/>
</svg>` },

// ---- the bottom side's dive under the main pipe at the frame's lower-left:
//      a fade laid over the frame rule, dimming at the pipe band ----
{ name: 'cv-underpass', w: 21, h: 10.5, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 10.5">
  <defs>${FADE('up', 10.5, 0, 0, 0)}</defs>
  <rect x="0" y="0" width="21" height="10.5" fill="url(#up)"/>
</svg>` },

// ---- the contact icons, gold line-art in the site's pointy manner ----
// the map pin: a point wearing a mitred tail
{ name: 'cv-ic-pin', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 22.6 6.2 13 A6.9 6.9 0 1 1 17.8 13 Z" ${IC}/>
  <circle cx="12" cy="10.1" r="2.4" fill="${GOLD}"/>
</svg>` },
// the handset, its curves replaced by mitred chamfers
{ name: 'cv-ic-phone', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M4.6 3.3 9 3.3 10.8 8 8.4 10.4 13.6 15.6 16 13.2 20.7 15 20.7 19.4 17.8 20.9 11.4 18.2 5.8 12.6 3.1 6.2 Z" ${IC}/>
</svg>` },
// the Tuta mark — the site's own line-art trace
{ name: 'cv-ic-tuta', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${IC}>
  <path d="M1.16 3.45 4.52 6.81 1.16 18.15Z"/>
  <path d="M2.88 1.38 18.84 1.38 22.62 5.16 6.66 5.16Z"/>
  <path d="M2.56 22.56 7.18 7.86 10.12 7.86 12.64 14.58 19.36 7.86 22.30 7.86 18.10 22.56 14.74 22.56 17.68 13.32 13.06 17.52 10.96 17.52 8.86 13.32 5.92 22.56Z"/>
</svg>` },
// the Telegram plane — the site's own sharp-tipped trace
{ name: 'cv-ic-tg', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="8">
  <path d="M22.73 3.79 1.29 12.04 7.3 14 9.36 20.41 12.6 17.3 17.94 21.25Z"/>
  <path d="M7.3 14 18.5 7 9.4 15.4"/>
</svg>` },
// the www globe — the sphere, its horizontal bars, and the meridian hemispheres
{ name: 'cv-ic-www', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9.4" ${IC}/>
  <ellipse cx="12" cy="12" rx="4.7" ry="9.4" ${IC}/>
  <path d="M2.6 12 H21.4 M4.05 7.3 H19.95 M4.05 16.7 H19.95" ${IC}/>
</svg>` },
// the ORCID iD, gold
{ name: 'cv-ic-orcid', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9.4" ${IC}/>
  <text x="12" y="15.4" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
        font-weight="700" font-size="9" fill="${GOLD}">iD</text>
</svg>` },
// the bb mark, gold, for the site's own line
{ name: 'cv-ic-bb', w: 316.392, h: 316.392, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50.559 10.104 316.392 316.392">
  <defs><path id="b2" d="M27.5 86.5 21 93 V58 L49.5 86.5 0 136 V1.445 L4.856 8.7"
    fill="none" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"/></defs>
  <circle cx="107.637" cy="168.3" r="143.696" fill="none" stroke="${GOLD}" stroke-width="21"/>
  <use href="#b2" transform="translate(44.6 81.8)" stroke="${GOLD}"/>
  <use href="#b2" transform="translate(119 57.75)" stroke="${GOLD}"/>
</svg>` },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  for (const j of jobs) {
    await page.setContent(`<!doctype html><style>
      @page { size: ${j.w}px ${j.h}px; margin: 0 }
      html,body { margin: 0; padding: 0 }
      svg { display: block; width: ${j.w}px; height: ${j.h}px }
    </style>${j.svg}`);
    await page.pdf({ path: __dirname + '/' + j.name + '.pdf', width: `${j.w}px`,
                     height: `${j.h}px`, printBackground: true, pageRanges: '1' });
    console.log('printed', j.name + '.pdf');
  }
  await browser.close();
})();
