#!/bin/sh
# compila el CV en español y lo instala como ../cv-es.pdf — el asset que sirve la página
cd "$(dirname "$0")" || exit 1
pdflatex -interaction=nonstopmode -halt-on-error main.tex >/dev/null || { echo "pdflatex falló — mira main.log"; exit 1; }
pdflatex -interaction=nonstopmode -halt-on-error main.tex >/dev/null
mv main.pdf ../cv-es.pdf
rm -f main.aux main.log main.out
echo "creado ../cv-es.pdf"
