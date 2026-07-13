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
  lede:    "Mathematician by training, of the mostly theoretical kind — complex, functional and harmonic analysis — with a lasting knack for modelling problems, mathematical or not. Four years of applied research on LiDAR point clouds added the practical layer: C++, Python, and the everyday craft of building software. I'm now finishing my PhD in Galicia, Spain — my second article is in the writing — and this site lays the ground for the move that comes after it: out of academia, into industry.",

  // About
  k_about: "About",
  ab1: "I'm a mathematician by training — a degree and a research master's from the Universidad Autónoma de Madrid, where my focus settled on complex and functional analysis, then a Master of Arts in Mathematics from the University of Kansas, where I moved into harmonic analysis and spent a year teaching calculus.",
  ab2: "Since 2021 I've been a predoctoral researcher in the <strong>LiDAR research group at CiTIUS</strong> (Universidade de Santiago de Compostela), under the supervision of Dr. Francisco F. Rivera. My day-to-day has been modelling and implementing detection and integration techniques for point clouds captured by LiDAR and imaging sensors — mostly in C++, inside a sizeable shared codebase. It's also where my working toolkit settled in: Python, picked up as a natural extension of the Sage of my graduate years, and git and vim as everyday company.",
  ab3: "The thread through all of it is modelling — I've always had a way of turning a loose problem, mathematical or not, into something with workable structure. And I care about methods that are not only correct but legible, where you can see <em>why</em> the geometry forces the answer. Right now, all of that is pointed at finishing my PhD.",

  // Experience
  k_exp: "Experience",
  e1t: "Senior Research Technician",
  e1o: '<a href="https://citius.gal/es/team/jonatan-barreiro-bastos/">CiTIUS</a> — Centro de Investigación en Tecnoloxías Intelixentes, USC',
  e1d: "Predoctoral researcher in the LiDAR group under Dr. Francisco F. Rivera. Modelled and implemented detection and integration techniques for LiDAR and image point clouds, primarily in C++. Since August 2025, continuing the underlying doctoral research independently.",
  gta: "Graduate Teaching Assistant",
  uok: "University of Kansas",
  e2d: "Winter semester — instructor of record for a 33-student section of Math 115 Calculus I, coordinated by Dr. W. Huang and A. Kolasinski. Lectured, designed and graded the tests, ran the Help Room.",
  e3d: "Spring semester — teaching assistant for Math 147 Calculus III (Honors), with Prof. E. Gavosto: the highest calculus course graduate students were entrusted with. Taught classes, graded, ran the Help Room, and handled the 3D printing of student projects.",
  e4t: "Graduate Research Assistant",
  e4d: "Research assistant under Prof. Rodolfo Torres, beginning research in harmonic analysis.",

  // Education
  k_edu: "Education",
  ed1t: "Master of Arts in Mathematics",
  ed1o: "University of Kansas, USA · GPA 4.0 / 4.0",
  ed1d: "Recipient of the Dean's Doctoral Fellowship.",
  ed2t: "Máster en Matemáticas y Aplicaciones",
  ed2o: "Universidad Autónoma de Madrid · 8.0 / 10.0",
  ed2d: "Research initiation track. Thesis: <em>El Teorema de la Corona</em> (The Corona Theorem), advised by J. L. Fernández.",
  ed3t: "Grado en Matemáticas",
  ed3o: "Universidad Autónoma de Madrid · 7.6 / 10.0",
  ed3d: "Thesis: <em>La Transformada Rápida de Fourier y Aplicaciones</em> (The Fast Fourier Transform and Applications), advised by E. Hernández.",

  // Research & projects
  k_pub: "Research &amp; projects",
  pubintro: "Two pieces of work are on my desk right now. One is my second article — a decoupled random-sampling Hough approach to detecting lines, and now also circles, in 2D point clouds; the research is done and the write-up is under way, aimed at the IPOL journal. The other is this very site, raised from a bare hello-world file in a couple of dedicated weeks — AI-assisted, hand-driven, no framework in between. It didn't make me a web developer, but it did mean a non-trivial run through web design and development, and through designing AI workflows that stay deliberate and accountable — a fair sample of the ground I can cover when something new needs learning.",
  p2t: "LitS: A novel Neighbourhood Descriptor for Point Clouds",
  p2m: "arXiv:2602.04838 · Feb 2026",
  p2n: "A neighbourhood descriptor for 2D and 3D point clouds: piecewise constant functions on the unit circle that let each point record how its neighbours are distributed by direction. With F. F. Rivera, O. G. Lorenzo, D. L. Vilariño, J. C. Cabaleiro, A. M. Esmorís, and T. F. Pena.",
  p2l: '<a href="https://arxiv.org/abs/2602.04838">Read on arXiv →</a>',
  orcid: 'ORCID: <a href="https://orcid.org/0000-0003-0922-8055" rel="me">0000-0003-0922-8055</a>.',

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
  cvlink: 'Or take the paper trail: <a href="assets/cv-en.pdf">curriculum vitae (PDF)</a>.',
  foot:  "AI-assisted, hand-driven.",
};
