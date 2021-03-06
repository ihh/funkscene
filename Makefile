PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

PARSERS = $(addprefix lib/parser/,$(subst .pegjs,.js,$(notdir $(wildcard grammar/*.pegjs))))

all: jquery parsers README.html doc/CheatSheet.html img/icon pagedown

# Dependencies

pegjs:
	npm install pegjs

pagedown:
	hg clone https://code.google.com/p/pagedown/

jquery:
	rm -rf $@
	wget http://jqueryui.com/resources/download/jquery-ui-1.10.3.zip
	unzip jquery-ui-1.10.3.zip
	mv jquery-ui-1.10.3 $@

# Parsers

parsers: $(PARSERS)

lib/parser/funkscene.js: grammar/funkscene.pegjs
	$(PEGJS) -e FunkScene.parser --track-line-and-column $< $@

lib/parser/graph.js: grammar/graph.pegjs
	$(PEGJS) -e FunkScene.graphGenerator --track-line-and-column $< $@

lib/parser/cazoo.js: grammar/cazoo.pegjs
	$(PEGJS) -e Cazoo.parser --track-line-and-column $< $@

%.html: %.md
	perl -e 'use Text::Markdown "markdown";print(-e "$*.header" ? `cat $*.header` : "");print markdown(join("",<>));print(-e "$*.footer" ? `cat $*.footer` : "")' $< >$@

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

# for make
.SECONDARY:

.SUFFIXES:
