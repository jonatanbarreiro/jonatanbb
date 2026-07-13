#!/bin/sh
# builds the English CV and installs it as ../cv-en.pdf — the asset the site serves
cd "$(dirname "$0")" || exit 1
pdflatex -interaction=nonstopmode -halt-on-error main.tex >/dev/null || { echo "pdflatex failed — see main.log"; exit 1; }
pdflatex -interaction=nonstopmode -halt-on-error main.tex >/dev/null
mv main.pdf ../cv-en.pdf
rm -f main.aux main.log main.out
echo "built ../cv-en.pdf"
