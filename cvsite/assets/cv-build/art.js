// art.js —regenerates the CV's vector artwork (the pipe system + the gold
// contact icons) as the pdf assets in art/, printed through system Chrome
// (run: NODE_PATH=/usr/local/lib/node_modules node art.js).
//
// Units are b-primitive u (the b's stroke = 10.5u); the CV prints the pipes at a
// 3.4pt stroke, i.e. 0.32381 pt/u. The KNOT is the site's b rotated 225°: its
// second stick is the bar that crosses the pipe toward the section name, its
// belly loops under, and its long stick curves 45° into the band to carry the
// pipe on down. The knots are scaled 1.5x (stroke kept). At every crossing the
// under-pipe stops a hairline SEAM short of the pipe above —the site's own
// joint articulation, and the knot-diagram cue for passing beneath. In the
// knots the belly runs its 45° line straight under the bar (no north turn),
// and the pipe rides the dive's own x (19.7u) through the whole knot
// —entering from above, re-emerging below and turning back down all on that
// line —so the crossing reads as one pipe passing under the bar.
const { chromium } = require('playwright-core');
const GOLD = '#fad02a';
const SEAM = 1.6;   // the hairline gap (u) an under-pipe keeps from the pipe above
const STROKE = `fill="none" stroke="${GOLD}" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;
const IC = `fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;

const jobs = [

// ---- the section knot (bar centreline y=0, pipe band centred on x=19.7
//      —the belly's dive x, so the pipe crosses the bar right where it
//      re-emerges below): the pipe from above stops a seam short of the bar;
//      the belly's 45° line runs straight under it, its seam carved along the
//      bar's underside; the long stick's 45° turn lands back on the same x to
//      carry the pipe down. The belly is drawn first and overshoots into the
//      bar band; the seam is carved, then the bar repaints over the overshoot ----
{ name: 'knot', w: 130, h: 172, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 172">
  <rect x="13.7" y="-60" width="12" height="172" fill="#ffffff"/>
  <rect x="14.45" y="-60" width="10.5" height="${53.15 - SEAM}" fill="${GOLD}"/>
  <path d="M24.95 0 L-28.2 53.15 L-28.2 -5.25" ${STROKE}/>
  <rect x="9" y="5.25" width="19" height="${SEAM}" fill="#ffffff"/>
  <path d="M-28.2 0 L76.8 0 L19.7 57.1 L19.7 112" ${STROKE}/>
</svg>` },

// ---- the skills knot: no stem —the bar ends in the site's hook, tip in line
//      with the other knots' turn apexes, and the pipe ends here ----
{ name: 'knot-skills', w: 130, h: 132, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 132">
  <rect x="13.7" y="-60" width="12" height="132" fill="#ffffff"/>
  <rect x="14.45" y="-60" width="10.5" height="${53.15 - SEAM}" fill="${GOLD}"/>
  <path d="M24.95 0 L-28.2 53.15 L-28.2 -5.25" ${STROKE}/>
  <rect x="9" y="5.25" width="19" height="${SEAM}" fill="#ffffff"/>
  <path d="M-28.2 0 L65.2 0" ${STROKE}/>
  <polygon points="65.2,-5.25 89.5,-5.25 67.9,9.22 65.2,5.25" fill="${GOLD}"/>
</svg>` },

// ---- the frame's top-right salient stick: the top side runs on past the
//      corner and ends in the site's hook, down, pointing at the name —the
//      skills knot's own ending, a shade longer ----
{ name: 'stick', w: 84.3, h: 14.47, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -5.25 84.3 14.47">
  <rect x="0" y="-5.25" width="60" height="10.5" fill="${GOLD}"/>
  <polygon points="60,-5.25 84.3,-5.25 62.7,9.22 60,5.25" fill="${GOLD}"/>
</svg>` },

// ---- the TOP LEFT knotty corner, half-scale: the top side dips under the
//      left side (the vertical rides on top), a seam on each flank of the
//      vertical, resurfacing on its 24u run past the corner, then hooking
//      back 45° into the vertical ----
{ name: 'corner', w: 54, h: 52, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -38 54 52">
  <path d="M-5.25 0 L-24 0 L0 -24 L0 14" ${STROKE}/>
  <rect x="${-5.25 - SEAM}" y="-5.25" width="${SEAM}" height="10.5" fill="#ffffff"/>
  <rect x="5.25" y="-5.25" width="${SEAM}" height="10.5" fill="#ffffff"/>
</svg>` },

// ---- the BOTTOM RIGHT knotty corner (drawn top-left-wise, placed rotated
//      180°): the side passes under the horizontal, which rides on top —a
//      seam on each flank— resurfaces past the corner and hooks back 45° ----
{ name: 'corner-br', w: 54, h: 65, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -38 54 65">
  <path d="M0 -5.25 L0 -24 L-24 0 L14 0" ${STROKE}/>
  <rect x="-5.25" y="${-5.25 - SEAM}" width="10.5" height="${SEAM}" fill="#ffffff"/>
  <rect x="-5.25" y="5.25" width="10.5" height="${SEAM}" fill="#ffffff"/>
</svg>` },

// ---- the contact icons, gold line-art in the site's pointy manner ----
// the map pin: a point wearing a mitred tail
{ name: 'ic-pin', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 22.6 6.2 13 A6.9 6.9 0 1 1 17.8 13 Z" ${IC}/>
  <circle cx="12" cy="10.1" r="2.4" fill="${GOLD}"/>
</svg>` },
// the handset, its curves replaced by mitred chamfers
{ name: 'ic-phone', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M4.6 3.3 9 3.3 10.8 8 8.4 10.4 13.6 15.6 16 13.2 20.7 15 20.7 19.4 17.8 20.9 11.4 18.2 5.8 12.6 3.1 6.2 Z" ${IC}/>
</svg>` },
// the Tuta mark —the site's own line-art trace
{ name: 'ic-tuta', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${IC}>
  <path d="M1.16 3.45 4.52 6.81 1.16 18.15Z"/>
  <path d="M2.88 1.38 18.84 1.38 22.62 5.16 6.66 5.16Z"/>
  <path d="M2.56 22.56 7.18 7.86 10.12 7.86 12.64 14.58 19.36 7.86 22.30 7.86 18.10 22.56 14.74 22.56 17.68 13.32 13.06 17.52 10.96 17.52 8.86 13.32 5.92 22.56Z"/>
</svg>` },
// the Telegram plane —the site's own sharp-tipped trace
{ name: 'ic-tg', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="8">
  <path d="M22.73 3.79 1.29 12.04 7.3 14 9.36 20.41 12.6 17.3 17.94 21.25Z"/>
  <path d="M7.3 14 18.5 7 9.4 15.4"/>
</svg>` },
// the www globe —the sphere, its horizontal bars, and the meridian hemispheres
{ name: 'ic-www', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9.4" ${IC}/>
  <ellipse cx="12" cy="12" rx="4.7" ry="9.4" ${IC}/>
  <path d="M2.6 12 H21.4 M4.05 7.3 H19.95 M4.05 16.7 H19.95" ${IC}/>
</svg>` },
// the ORCID iD, gold
{ name: 'ic-orcid', w: 24, h: 24, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9.4" ${IC}/>
  <text x="12" y="15.4" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
        font-weight="700" font-size="9" fill="${GOLD}">iD</text>
</svg>` },
// the bb mark, gold, for the closing line
{ name: 'ic-bb', w: 316.392, h: 316.392, svg: `
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
    await page.pdf({ path: __dirname + '/art/' + j.name + '.pdf', width: `${j.w}px`,
                     height: `${j.h}px`, printBackground: true, pageRanges: '1' });
    console.log('printed art/' + j.name + '.pdf');
  }
  await browser.close();
})();
