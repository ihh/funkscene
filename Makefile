PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

all: grammar/fs.js grammar/caz.js README.html img/icon pagedown

grammar/fs.js: grammar/fs.pegjs
	$(PEGJS) -e funkscene.parser --track-line-and-column $< $@

grammar/caz.js: grammar/caz.pegjs
	$(PEGJS) -e funkscene.cazooParser --track-line-and-column $< $@

README.html: README.md
	perl -e 'use Text::Markdown "markdown";print markdown(join("",<>))' $< >$@

# Download icons made by lorc. Available at http://game-icons.net
# Released under Creative Commons 3.0 BY license
img/icon:
	rm -rf game-icons.net
	mkdir game-icons.net
	cd game-icons.net; \
	wget http://game-icons.net/archives/svg/zip/all.zip; \
	unzip all.zip
	test -e img || mkdir img
	mv game-icons.net/icons/lorc/originals/svg $@
	rm -rf game-icons.net

# Download Markdown parser
pagedown:
	hg clone https://code.google.com/p/pagedown/

.SECONDARY:

.SUFFIXES:
