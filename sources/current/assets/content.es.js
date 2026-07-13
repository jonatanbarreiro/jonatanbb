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
  lede:    "Matemático de formación, de perfil sobre todo teórico —análisis complejo, funcional y armónico—, con una maña de siempre para modelar problemas, matemáticos o no. Cuatro años de investigación aplicada sobre nubes de puntos LiDAR añadieron la capa práctica: C++, Python y el oficio diario de construir software. Ahora estoy terminando el doctorado en Galicia —mi segundo artículo está en escritura— y esta página prepara el terreno para el paso que viene después: salir de la academia, hacia la industria.",

  // Sobre mí
  k_about: "Sobre mí",
  ab1: "Soy matemático de formación: grado y máster de investigación por la Universidad Autónoma de Madrid, donde mi foco se asentó en el análisis complejo y funcional, y después un máster en Matemáticas (Master of Arts) por la Universidad de Kansas, donde pasé al análisis armónico y di clase de cálculo durante un año.",
  ab2: "Desde 2021 soy investigador predoctoral en el <strong>grupo de investigación LiDAR del CiTIUS</strong> (Universidade de Santiago de Compostela), bajo la dirección del Dr. Francisco F. Rivera. Mi día a día ha sido modelar e implementar técnicas de detección e integración para nubes de puntos captadas por sensores LiDAR y de imagen — sobre todo en C++, dentro de una base de código compartida de buen tamaño. Fue también donde terminó de asentarse mi caja de herramientas: Python, aprendido como extensión natural del Sage de mis años de posgrado, y git y vim como compañía diaria.",
  ab3: "El hilo que lo une todo es el modelado: siempre he tenido maña para convertir un problema difuso, matemático o no, en algo con estructura sobre la que trabajar. Y me importan los métodos que no solo son correctos, sino legibles: donde puedes ver <em>por qué</em> la geometría obliga a la respuesta. Ahora mismo, todo eso apunta a terminar el doctorado.",

  // Experiencia
  k_exp: "Experiencia",
  e1t: "Técnico Superior de Investigación",
  e1o: '<a href="https://citius.gal/es/team/jonatan-barreiro-bastos/">CiTIUS</a> — Centro de Investigación en Tecnoloxías Intelixentes, USC',
  e1d: "Investigador predoctoral en el grupo LiDAR bajo la dirección del Dr. Francisco F. Rivera. Modelé e implementé técnicas de detección e integración para nubes de puntos LiDAR y de imagen, principalmente en C++. Desde agosto de 2025, continúo de forma independiente la investigación doctoral subyacente.",
  gta: "Profesor asistente de posgrado",
  uok: "Universidad de Kansas",
  e2d: "Semestre de invierno — profesor responsable de un grupo de 33 estudiantes de Math 115, Cálculo I, coordinado por el Dr. W. Huang y A. Kolasinski. Di clases, diseñé y corregí los exámenes y atendí la Help Room.",
  e3d: "Semestre de primavera — profesor asistente de Math 147, Cálculo III (Honors), con el Prof. E. Gavosto: el curso de cálculo más alto que se confiaba a los estudiantes de posgrado. Impartí clases, corregí, atendí la Help Room y me encargué de la impresión 3D de los proyectos del alumnado.",
  e4t: "Asistente de investigación de posgrado",
  e4d: "Asistente de investigación con el Prof. Rodolfo Torres, iniciándome en la investigación en análisis armónico.",

  // Educación
  k_edu: "Educación",
  ed1t: "Máster en Matemáticas (Master of Arts)",
  ed1o: "Universidad de Kansas, EE. UU. · Nota media 4,0 / 4,0",
  ed1d: "Beneficiario de la Dean's Doctoral Fellowship.",
  ed2t: "Máster en Matemáticas y Aplicaciones",
  ed2o: "Universidad Autónoma de Madrid · 8,0 / 10,0",
  ed2d: "Itinerario de iniciación a la investigación. Trabajo Fin de Máster: <em>El Teorema de la Corona</em>, dirigido por J. L. Fernández.",
  ed3t: "Grado en Matemáticas",
  ed3o: "Universidad Autónoma de Madrid · 7,6 / 10,0",
  ed3d: "Trabajo Fin de Grado: <em>La Transformada Rápida de Fourier y Aplicaciones</em>, dirigido por E. Hernández.",

  // Investigación y proyectos
  k_pub: "Investigación y proyectos",
  pubintro: "Ahora mismo tengo dos trabajos sobre la mesa. Uno es mi segundo artículo — un enfoque Hough de muestreo aleatorio desacoplado para detectar rectas, y ya también circunferencias, en nubes de puntos 2D; la investigación está hecha y la redacción en marcha, dirigida a la revista IPOL. El otro es esta misma página, levantada desde un hello-world pelado en un par de semanas dedicadas — asistida por IA, hecha a mano, sin ningún framework de por medio. No me ha hecho desarrollador web, pero sí supuso un recorrido nada trivial por el diseño y el desarrollo web, y por el diseño de flujos de trabajo con IA deliberados y de los que rendir cuentas — una buena muestra del terreno que puedo cubrir cuando toca aprender algo nuevo.",
  p2t: "LitS: A novel Neighbourhood Descriptor for Point Clouds",
  p2m: "arXiv:2602.04838 · feb 2026",
  p2n: "Un descriptor de vecindad para nubes de puntos 2D y 3D: funciones constantes a trozos sobre la circunferencia unidad que permiten a cada punto registrar cómo se distribuyen sus vecinos por dirección. Con F. F. Rivera, O. G. Lorenzo, D. L. Vilariño, J. C. Cabaleiro, A. M. Esmorís y T. F. Pena.",
  p2l: '<a href="https://arxiv.org/abs/2602.04838">Leer en arXiv →</a>',
  orcid: 'ORCID: <a href="https://orcid.org/0000-0003-0922-8055" rel="me">0000-0003-0922-8055</a>.',

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
  cvlink: 'O en papel: <a href="assets/cv-es.pdf">currículum (PDF)</a>.',
  foot:  "Asistido por IA, hecho a mano.",
};
