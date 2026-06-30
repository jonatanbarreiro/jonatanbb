// content.en.js — the English copy of jonatanbb.xyz, the single source of the page's
// words in English. index.html holds the STRUCTURE; this file holds the TEXT. Edit a
// string here and it shows on the page (main.js drops each value into the element that
// carries the matching data-i18n="key"). A value may contain inline HTML (links, <strong>,
// <em>) — it is inserted as-is. Keep the keys in sync with content.es.js.
//
// _title / _desc set the document <title> and meta description for this language.
window.CONTENT_EN = {
  _title: "Jonatan Barreiro",
  _desc:  "Jonatan — mathematician and predoctoral researcher. Geometry, point clouds, and detection methods.",

  skip:    "Skip to content",
  eyebrow: "Mathematician · Predoctoral researcher",
  lede:    "Mathematician by training and a builder by inclination — I turn careful analysis into working software, mostly around geometry, point clouds, and detection. A decade spanning pure mathematics and applied research, from harmonic analysis to LiDAR, has left me equally at home with a proof and with a C++ codebase. I'm finishing my PhD in Galicia, Spain, and looking to bring that mix of rigour and engineering into industry.",

  // About
  k_about: "About",
  ab1: "I'm a mathematician by training — a degree and research master's from the Universidad Autónoma de Madrid, then a Master of Arts in Mathematics from the University of Kansas, where I started out in harmonic analysis.",
  ab2: "Since 2021 I've been a predoctoral researcher in the <strong>LiDAR research group at CiTIUS</strong> (Universidade de Santiago de Compostela), under the supervision of Dr. Francisco F. Rivera. My day-to-day has been modelling and implementing detection and integration techniques for point clouds captured by LiDAR and imaging sensors — mostly in C++.",
  ab3: "I'm currently finishing my PhD. My second paper, a decoupled random-sampling approach to detecting lines (and now circles) in 2D point clouds, is close to complete on the research side. I care about methods that are not only correct but legible — where you can see <em>why</em> the geometry forces the answer.",

  // Experience
  k_exp: "Experience",
  e1t: "Senior Research Technician",
  e1o: '<a href="https://citius.gal/es/team/jonatan-barreiro-bastos/">CiTIUS</a> — Centro de Investigación en Tecnoloxías Intelixentes, USC',
  e1d: "Predoctoral researcher in the LiDAR group under Dr. Francisco F. Rivera. Modelled and implemented detection and integration techniques for LiDAR and image point clouds, primarily in C++. Since August 2025, continuing the underlying doctoral research independently.",
  gta: "Graduate Teaching Assistant",
  uok: "University of Kansas",
  e2d: "Teaching assistant for Math 147 Calculus III (Honors), with Prof. E. Gavosto. Taught classes, graded, ran the Help Room, and handled 3D printing of student projects.",
  e3d: "Instructor of record for a 33-student section of Math 115 Calculus I, coordinated by Dr. W. Huang and A. Kolasinski. Lectured, designed and graded tests, ran the Help Room.",
  e4t: "Graduate Research Assistant",
  e4d: "Research assistant under Prof. Rodolfo Torres, beginning research in harmonic analysis.",

  // Education
  k_edu: "Education",
  ed1t: "Master of Arts in Mathematics",
  ed1o: "University of Kansas, USA · GPA 10.0 / 10.0",
  ed1d: "Recipient of the Dean's Doctoral Fellowship.",
  ed2t: "Máster en Matemáticas y Aplicaciones",
  ed2o: "Universidad Autónoma de Madrid · 8.0 / 10.0",
  ed2d: "Research initiation track. Thesis: <em>El Teorema de la Corona</em> (The Corona Theorem), advised by J. L. Fernández.",
  ed3t: "Grado en Matemáticas",
  ed3o: "Universidad Autónoma de Madrid · 7.6 / 10.0",
  ed3d: "Thesis: <em>La Transformada Rápida de Fourier y Aplicaciones</em> (The Fast Fourier Transform and Applications), advised by E. Hernández.",

  // Writing & research
  k_pub: "Writing &amp; research",
  p1t: "A Decoupled Random-Sampling Hough Approach to Line Detection in 2D Point Clouds",
  p1m: "In preparation · extends to circle detection",
  p1n: "A three-stage decoupled detector that separates sampling from estimation, with an exact characterisation of the background noise floor. Research-complete; targeting the IPOL journal.",
  p2t: "LitS: A novel Neighbourhood Descriptor for Point Clouds",
  p2m: "arXiv:2602.04838 · Feb 2026",
  p2n: "A neighbourhood descriptor for 2D and 3D point clouds: piecewise constant functions on the unit circle that let each point record how its neighbours are distributed by direction. With F. F. Rivera, O. G. Lorenzo, D. L. Vilariño, J. C. Cabaleiro, A. M. Esmorís, and T. F. Pena.",
  p2l: '<a href="https://arxiv.org/abs/2602.04838">Read on arXiv →</a>',
  orcid: 'Full record on <a href="https://orcid.org/0000-0003-0922-8055" rel="me">ORCID 0000-0003-0922-8055</a>.',

  // Skills
  k_skills: "Skills",
  sk_prog: "Programming",
  sk_lang: "Languages",
  lvl_native: "native",
  lvl_fluent: "fluent",
  lang_es: "Spanish",
  lang_gl: "Galician",
  lang_en: "English",

  // Contact + footer
  chead: "Get in touch",
  foot:  "AI-assisted, hand-driven.",
};
