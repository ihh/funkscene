
all: lwpaper.pdf.open

%.open: %
	open $<

%.pdf: %.tex
	pdflatex $*.tex
	bibtex $*.bib
	pdflatex $*.tex
	pdflatex $*.tex

.SECONDARY:
