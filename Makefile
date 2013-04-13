PEGJS = $(HOME)/node_modules/pegjs/bin/pegjs

grammar.js: grammar.pegjs
# Uncomment for browser version, vs node version
#	$(PEGJS) -e funkscene_parser $< $@
	$(PEGJS) $< $@
