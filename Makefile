PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

all: grammar.js README.html svg

grammar.js: grammar.pegjs
# Uncomment for node version, vs browser version
#	$(PEGJS) $< $@
	$(PEGJS) -e funkscene.parser --track-line-and-column $< $@

README.html: README.md
	perl -e 'use Text::Markdown "markdown";print markdown(join("",<>))' $< >$@

# Icons made by lorc. Available on http://game-icons.net
# Released under Creative Commons 3.0 BY license
img/icon:
	mkdir game-icons.net
	cd game-icons.net \
	wget http://game-icons.net/archives/svg/zip/all.zip \
	unzip all.zip \
	mv icons/lorc/originals/svg ../$@ \
	rm -rf game-icons.net
