// cv-art.js — regenerates the CV's vector artwork (the pipe system + the gold
// contact icons) as the cv-*.pdf assets beside this file, printed through system
// Chrome (run: NODE_PATH=/usr/local/lib/node_modules node cv-art.js).
//
// Units are b-primitive u (the b's stroke = 10.5u); the CV prints the pipes at a
// 3.4pt stroke, i.e. 0.32381 pt/u. The KNOT is the site's b rotated 225°: its
// second stick is the bar that crosses the pipe toward the section name, its
// belly loops under, and its long stick curves 45° into the band to carry the
// pipe on down. Per Jonatan's markup the knots are scaled 1.5x (stroke kept) and
// the crossing is left implicit, like the b's own: the under piece stops being
// visible right at its pi/4 -> pi/2 turn, and the stick above resumes after the
// same whitespace on the other side of the bar. Each art whites the pipe band
// locally, so the seams and the bowls read as paper over the continuous pipe.
const { chromium } = require('playwright-core');
const GOLD = '#fad02a';
const STROKE = `fill="none" stroke="${GOLD}" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;
const IC = `fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"`;

const jobs = [

// ---- the section knot (bar centreline y=0, pipe band centred on x=0) ----
{ name: 'cv-knot', w: 130, h: 172, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 172">
  <rect x="-6" y="-60" width="12" height="172" fill="#ffffff"/>
  <rect x="-5.25" y="-60" width="10.5" height="27.75" fill="${GOLD}"/>
  <path d="M0 32.25 L-28.2 60.45 L-28.2 0 L76.8 0 L0 76.8 L0 112" ${STROKE}/>
</svg>` },

// ---- the skills knot: no stem — the bar ends in the site's hook, tip in line
//      with the other knots' turn apexes (x = 89.5), and the pipe ends here ----
{ name: 'cv-knot-skills', w: 130, h: 132, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-38 -60 130 132">
  <rect x="-6" y="-60" width="12" height="132" fill="#ffffff"/>
  <rect x="-5.25" y="-60" width="10.5" height="27.75" fill="${GOLD}"/>
  <path d="M0 32.25 L-28.2 60.45 L-28.2 0 L65.2 0" ${STROKE}/>
  <polygon points="65.2,-5.25 89.5,-5.25 67.9,9.22 65.2,5.25" fill="${GOLD}"/>
</svg>` },

// ---- the knotty corner (drawn for the frame's TOP LEFT; the bottom right is
//      this rotated 180°): the side runs past the corner, hooks back 45°, and
//      the perpendicular crosses it with the knots' own whitespace ----
{ name: 'cv-corner', w: 70, h: 102, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-56 -56 70 102">
  <rect x="-6" y="-33" width="12" height="66" fill="#ffffff"/>
  <path d="M0 -32.25 L0 -48 L-48 0 L14 0" ${STROKE}/>
  <rect x="-5.25" y="32.25" width="10.5" height="13.75" fill="${GOLD}"/>
</svg>` },

// ---- the J pipe: the frame's top side runs THROUGH the top-right corner (the
//      right side stops a knot-whitespace short of it), on to the 'J' drawn as
//      the pipe's end — stem, 45° tail, and the site's hook-up tip to finish
//      the stroke. The name's baseline is y = 49u below the bar centreline. ----
{ name: 'cv-jpipe', w: 97, h: 78, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -12 97 78">
  <rect x="-6" y="5" width="12" height="27.25" fill="#ffffff"/>
  <rect x="-5.25" y="32.25" width="10.5" height="33.75" fill="${GOLD}"/>
  <path d="M-14 0 L62 0 L62 38 L51 49 L37 49" ${STROKE}/>
  <polygon points="37,54.25 12.7,54.25 34.3,39.78 37,43.75" fill="${GOLD}"/>
</svg>` },

// ---- the two b's, gold, for the counter of the 'o' of Jonatan ----
{ name: 'cv-bbo-gold', w: 136.57, h: 188.56, svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="39.35 41.91 136.57 188.56">
  <defs><path id="b" d="M27.5 86.5 21 93 V58 L49.5 86.5 0 136 V1.445 L4.856 8.7"
    fill="none" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"/></defs>
  <use href="#b" transform="translate(44.6 81.8)" stroke="${GOLD}"/>
  <use href="#b" transform="translate(119 57.75)" stroke="${GOLD}"/>
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
