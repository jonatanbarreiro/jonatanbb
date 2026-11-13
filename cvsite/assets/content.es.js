// content.es.js — la versión en español de jonatanbb.xyz, la única fuente del texto de
// la página en español. index.html tiene la ESTRUCTURA; este archivo, el TEXTO. Edita una
// cadena aquí y aparece en la página (main.js coloca cada valor en el elemento con el
// data-i18n="clave" correspondiente). Un valor puede llevar HTML en línea (enlaces,
// <strong>, <em>) — se inserta tal cual. Mantén las claves alineadas con content.en.js.
//
// _title / _desc fijan el <title> del documento y la meta-descripción para este idioma.
window.CONTENT_ES = {
  _title: "Jonatan Barreiro — matemático e investigador",
  _desc:  "Jonatan — matemático e investigador predoctoral. Geometría, nubes de puntos y métodos de detección.",

  skip:    "Saltar al contenido",
  eyebrow: "Matemático · Investigador predoctoral",
  lede:    "Matemático de formación y constructor por inclinación: convierto el análisis cuidadoso en software que funciona, sobre todo en torno a la geometría, las nubes de puntos y la detección. Una década entre la matemática pura y la investigación aplicada, del análisis armónico al LiDAR, me ha dejado igual de cómodo con una demostración que con una base de código en C++. Estoy terminando el doctorado en Galicia (España) y busco llevar esa mezcla de rigor e ingeniería a la industria.",

  // Sobre mí
  k_about: "Sobre mí",
  ab1: "Soy matemático de formación: grado y máster de investigación por la Universidad Autónoma de Madrid, y luego un máster en Matemáticas (Master of Arts) por la Universidad de Kansas, donde empecé en el análisis armónico.",
  ab2: "Desde 2021 soy investigador predoctoral en el <strong>grupo de investigación LiDAR del CiTIUS</strong> (Universidade de Santiago de Compostela), bajo la dirección del Dr. Francisco F. Rivera. Mi día a día ha sido modelar e implementar técnicas de detección e integración para nubes de puntos captadas por sensores LiDAR y de imagen — sobre todo en C++.",
  ab3: "Ahora mismo estoy terminando el doctorado. Mi segundo artículo —un enfoque de muestreo aleatorio desacoplado para detectar rectas (y ya también circunferencias) en nubes de puntos 2D— está casi cerrado en lo investigador. Me importan los métodos que no solo son correctos, sino legibles: donde puedes ver <em>por qué</em> la geometría obliga a la respuesta.",

  // Experiencia
  k_exp: "Experiencia",
  e1t: "Técnico Superior de Investigación",
  e1o: '<a href="https://citius.gal/es/team/jonatan-barreiro-bastos/">CiTIUS</a> — Centro de Investigación en Tecnoloxías Intelixentes, USC',
  e1d: "Investigador predoctoral en el grupo LiDAR bajo la dirección del Dr. Francisco F. Rivera. Modelé e implementé técnicas de detección e integración para nubes de puntos LiDAR y de imagen, principalmente en C++. Desde agosto de 2025, continúo de forma independiente la investigación doctoral subyacente.",
  gta: "Profesor asistente de posgrado",
  uok: "Universidad de Kansas",
  e2d: "Profesor asistente de Math 147, Cálculo III (Honors), con el Prof. E. Gavosto. Impartí clases, corregí, atendí la Help Room y me encargué de la impresión 3D de los proyectos del alumnado.",
  e3d: "Profesor responsable de un grupo de 33 estudiantes de Math 115, Cálculo I, coordinado por el Dr. W. Huang y A. Kolasinski. Di clases, diseñé y corregí exámenes y atendí la Help Room.",
  e4t: "Asistente de investigación de posgrado",
  e4d: "Asistente de investigación con el Prof. Rodolfo Torres, iniciándome en la investigación en análisis armónico.",

  // Educación
  k_edu: "Educación",
  ed1t: "Máster en Matemáticas (Master of Arts)",
  ed1o: "Universidad de Kansas, EE. UU. · Nota media 10,0 / 10,0",
  ed1d: "Beneficiario de la Dean's Doctoral Fellowship.",
  ed2t: "Máster en Matemáticas y Aplicaciones",
  ed2o: "Universidad Autónoma de Madrid · 8,0 / 10,0",
  ed2d: "Itinerario de iniciación a la investigación. Trabajo Fin de Máster: <em>El Teorema de la Corona</em>, dirigido por J. L. Fernández.",
  ed3t: "Grado en Matemáticas",
  ed3o: "Universidad Autónoma de Madrid · 7,6 / 10,0",
  ed3d: "Trabajo Fin de Grado: <em>La Transformada Rápida de Fourier y Aplicaciones</em>, dirigido por E. Hernández.",

  // Publicaciones e investigación
  k_pub: "Publicaciones e investigación",
  p1t: "A Decoupled Random-Sampling Hough Approach to Line Detection in 2D Point Clouds",
  p1m: "En preparación · se extiende a la detección de circunferencias",
  p1n: "Un detector desacoplado en tres etapas que separa el muestreo de la estimación, con una caracterización exacta del nivel de ruido de fondo. Investigación completa; dirigido a la revista IPOL.",
  p2t: "LitS: A novel Neighbourhood Descriptor for Point Clouds",
  p2m: "arXiv:2602.04838 · feb 2026",
  p2n: "Un descriptor de vecindad para nubes de puntos 2D y 3D: funciones constantes a trozos sobre la circunferencia unidad que permiten a cada punto registrar cómo se distribuyen sus vecinos por dirección. Con F. F. Rivera, O. G. Lorenzo, D. L. Vilariño, J. C. Cabaleiro, A. M. Esmorís y T. F. Pena.",
  p2l: '<a href="https://arxiv.org/abs/2602.04838">Leer en arXiv →</a>',
  orcid: 'Registro completo en <a href="https://orcid.org/0000-0003-0922-8055" rel="me">ORCID 0000-0003-0922-8055</a>.',

  // Aptitudes
  k_skills: "Aptitudes",
  sk_prog: "Programación",
  sk_lang: "Idiomas",
  lvl_native: "nativo",
  lvl_fluent: "fluido",
  lang_es: "Español",
  lang_gl: "Gallego",
  lang_en: "Inglés",

  // Contacto + pie
  chead: "Hablemos",
  foot:  "Asistido por IA, hecho a mano.",
};
