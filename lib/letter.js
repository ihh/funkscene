var LetterWriter = (function(){
    // create the LetterWriter object
    var lw = {};

    // generic functions
    function extend (destination, source) {  // source overwrites destination
	if (typeof(source) != "undefined") {
	    for (var property in source) {
		if (source.hasOwnProperty(property)) {
		    destination[property] = source[property];
		}
	    }
	}
	return destination;
    }

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    // Letter
    lw.Letter = function(letterTemplate) {
	this.template = letterTemplate;
	try {
	    this.grammar = lw.parser.parse (letterTemplate);
	} catch (e) {
	    console.log (buildErrorMessage (e));
	    throw e;
	}
    }

    // Rule
    lw.Rule = function(hint,rhs) {
	extend (this, { hint: hint,
			rhs: rhs })
    }

    // Term
    lw.Term = function(text) {
	this.text = text
    }

    // Nonterm
    lw.Nonterm = function(sym,prompt) {
	extend (this, { id: sym,
			rules: [] })
	if (typeof(prompt) != 'undefined')
	    this.prompt = prompt
    }
    lw.Nonterm.prototype.addRule = function(hint,rhs) { this.rules.push(new lw.Rule(hint,rhs)) }
    lw.Nonterm.prototype.isDead = function() { return this.rules.length == 0 }
    lw.Nonterm.prototype.isHyperlink = function() { return this.rules.length == 1 && this.rules[0].hint == "" }
    lw.Nonterm.prototype.prompt = "Select an option...";
    lw.Nonterm.prototype.placeholder = "";

    // NontermReference
    lw.Nonterm.prototype.makeReference = function(placeholder,prompt) {
	return new lw.NontermReference(this,placeholder,prompt)
    }

    lw.NontermReference = function(nonterm,placeholder,prompt) {
	extend (this, { nonterminal: nonterm,
			placeholder: typeof(placeholder) == 'undefined' ? nonterm.placeholder : placeholder,
			prompt: typeof(prompt) == 'undefined' ? nonterm.prompt : prompt })
    }

    // done    
    return lw;
})();
