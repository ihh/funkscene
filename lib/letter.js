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
	    this.start = lw.parser.parse (letterTemplate);
	} catch (e) {
	    console.log (buildErrorMessage (e));
	    throw e;
	}
    }
    lw.Letter.prototype.attach = function(id) {
	if (typeof(id) == 'undefined')
	    id = "letter";
	this.start.attach (document.getElementById (id));
    }

    // Rule
    lw.Rule = function(hint,rhs) {
	extend (this, { hint: hint,
			rhs: rhs })
    }

    lw.Rule.prototype.update = function (parent, oldSpan) {
	var span = document.createElement("SPAN");
	for (var i = 0; i < this.rhs.length; ++i) {
	    var symSpan = document.createElement("SPAN");
	    var sym = this.rhs[i];

	    if (sym instanceof LetterWriter.Term)
		symSpan.innerHTML = sym.text;

	    else if (sym instanceof LetterWriter.NontermReference)
		sym.nonterminal.attach (symSpan, sym.placeholder(), sym.prompt());

	    else
		throw "Unknown object on RHS of rule";

	    span.appendChild (symSpan);
	}
	parent.replaceChild (span, oldSpan);
	// TODO: add (parent,oldSpan) to undo list
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

    var dummyName = 0;
    lw.Nonterm.prototype.attach = function (parent, placeholder, prompt) {
	if (typeof placeholder == 'undefined')
	    placeholder = this.placeholder;

	if (typeof prompt == 'undefined')
	    prompt = this.prompt;

	var span = document.createElement("SPAN");
	var phSpan = document.createTextNode (placeholder);
	span.appendChild (phSpan);

	if (this.isHyperlink()) {
	    var link = document.createElement("A");
	    var rule = this.rules[0];
	    link.href = "#";
	    link.innerHTML = prompt;
	    link.onclick = function() { rule.update (parent, span) };
	    span.appendChild (link);

	} else if (this.isDead()) {
	    span.innerHTML = prompt;

	} else {
	    var select = document.createElement("SELECT");
	    select.name = "#" + (++dummyName);
	    var promptOption = document.createElement("OPTION");
	    promptOption.value = 0;
	    promptOption.text = prompt;
	    select.appendChild (promptOption);
	    for (var i = 0; i < this.rules.length; ++i) {
		var rule = this.rules[i];
		var option = document.createElement("OPTION");
		option.value = i + 1;
		option.text = rule.hint;
		select.appendChild (option);
	    }
	    var rules = this.rules;
	    select.onchange = function() {
		var i = select.selectedIndex;
		if (i > 0)
		    rules[i-1].update (parent, span);
	    }
	    span.appendChild (select);
	}

	parent.appendChild (span);
    }

    // NontermReference
    lw.Nonterm.prototype.makeReference = function(placeholder,prompt) {
	return new lw.NontermReference(this,placeholder,prompt)
    }

    lw.NontermReference = function(nonterm,placeholder,prompt) {
	extend (this, { nonterminal: nonterm,
			placeholder: function() { return typeof(placeholder) == 'undefined' ? nonterm.placeholder : placeholder },
			prompt: function() { return typeof(prompt) == 'undefined' ? nonterm.prompt : prompt } })
    }

    // done    
    return lw;
})();
