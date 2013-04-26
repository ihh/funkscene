PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

all: grammar.js README.html

grammar.js: grammar.pegjs
# Uncomment for node version, vs browser version
#	$(PEGJS) $< $@
	$(PEGJS) -e funkscene.parser --track-line-and-column $< $@

README.html: README.md
	perl -e 'use Text::Markdown "markdown";print markdown(join("",<>))' $< >$@
