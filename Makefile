PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

grammar.js: grammar.pegjs
# Uncomment for node version, vs browser version
#	$(PEGJS) $< $@
	$(PEGJS) -e funkscene.parser --track-line-and-column $< $@
