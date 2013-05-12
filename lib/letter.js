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

    function logError(str,div) {
	console.log (str);
	div.innerHTML = "Error loading LetterWriter template file: <p><code>" + str + "</code>";
    }

    function hideElement(e) { e.setAttribute ("style", "display: none"); };
    function showElement(e) { e.setAttribute ("style", "display: inline"); };

    // Grammar
    lw.Grammar = function(letterTemplate) {
	this.template = letterTemplate;
	try {
	    var parseResult = lw.parser.parse (letterTemplate);
	    this.nonterm = parseResult[0];
	    this.start = this.nonterm[parseResult[1]];
	} catch (e) {
	    logError (buildErrorMessage(e), document.getElementById("letter") || document.body);
	    throw e;
	}
    }

    lw.Grammar.newFromUrl = function(url) {
	console.log ("Loading LetterWriter grammar from \"" + url + "\"");
	try {
	var xhr = new XMLHttpRequest();
	    xhr.open ("GET", url, false);
	    xhr.send();
	    var template = xhr.responseText;
	} catch (e) {
	    logError (buildErrorMessage(e), document.getElementById("letter") || document.body);
	    throw e;
	}
	return new LetterWriter.Grammar (template);
    }

    lw.Grammar.prototype.newLetter = function(args) {
	return new lw.Letter (this, args);
    }

    // Rule
    lw.Rule = function(hint,rhs) {
	extend (this, { hint: hint,
			rhs: rhs })
    }

    lw.Rule.prototype.expand = function (parent, oldSpan, letter) {
	var span = document.createElement("SPAN");
	var nontermDelta = -1;
	--letter.nontermCount;
	for (var i = 0; i < this.rhs.length; ++i) {
	    var symSpan = document.createElement("SPAN");
	    var sym = this.rhs[i];

	    if (sym instanceof LetterWriter.Term)
		symSpan.innerHTML = sym.text;

	    else if (sym instanceof LetterWriter.NontermReference) {
		sym.nonterminal.attach (symSpan, sym.placeholder(), sym.prompt(), letter);
		++nontermDelta;

	    } else
		throw "Unknown object on RHS of rule";

	    span.appendChild (symSpan);
	}
	letter.update (parent, oldSpan, span, nontermDelta);
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

    // Nonterm.attach
    // This method renders the HTML controllers
    var dummyName = 0;
    lw.Nonterm.prototype.attach = function (parent, placeholder, prompt, letter) {
	if (typeof placeholder == 'undefined')
	    placeholder = this.placeholder;

	if (typeof prompt == 'undefined')
	    prompt = this.prompt;

	var span = document.createElement("SPAN");
	var phElement = document.createTextNode (placeholder);
	span.appendChild (phElement);

	if (this.isHyperlink()) {
	    var link = document.createElement("A");
	    var rule = this.rules[0];
	    link.href = "#";
	    link.innerHTML = prompt;
	    link.onclick = function() { rule.expand (parent, span, letter) };
	    span.appendChild (link);
	    ++letter.nontermCount;

	} else if (this.isDead()) {
	    span.innerHTML = prompt;

	} else {
	    var select = document.createElement("SELECT");
	    select.setAttribute ("class", "letter options");
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
		    rules[i-1].expand (parent, span, letter);
		select.selectedIndex = 0;
	    }
	    span.appendChild (select);
	    ++letter.nontermCount;
	}

	parent.appendChild (span);
	return span;
    }

    lw.Nonterm.prototype.makeReference = function(placeholder,prompt) {
	return new lw.NontermReference(this,placeholder,prompt)
    }

    // NontermReference
    lw.NontermReference = function(nonterm,placeholder,prompt) {
	extend (this, { nonterminal: nonterm,
			placeholder: function() { return typeof(placeholder) == 'undefined' ? nonterm.placeholder : placeholder },
			prompt: function() { return typeof(prompt) == 'undefined' ? nonterm.prompt : prompt } })
    }

    // Letter
    var undoRechargeTicks = 100;  // undo recharge will be split over this many callbacks for smooth animation
    var undoRechargeTimeMultiplier = 1.05;  // 5% increase in recharge time each time player uses Undo
    lw.Letter = function(grammar,args) {

	if (typeof args == 'undefined')
	    args = {};
	var myArgs = { undoId: (("id" in args) ? args.id : "undo"),
		       id: "letter",
		       reveal: "reveal" };
	extend (myArgs, args);
	args = myArgs;

	if (!document.getElementById (args.undoId))
	    args.undoId = args.id;

	var parent = document.getElementById (args.id);

	extend (this, { grammar: grammar,
			parent: parent,
			history: [],
			undoRechargeTime: 5000,
			undoCharge: undoRechargeTicks,
			nontermCount: 0 })

	if ("reveal" in args) {
	    var revealDiv = document.getElementById (args.reveal);
	    if (typeof revealDiv != 'undefined')
		this.revealDiv = revealDiv;
	}

	var undoDiv = document.createElement("DIV");
 	undoDiv.setAttribute ("class", "letter undo");

	var undoHtml = "<small><i>undo</i></small>";

	var undoLink = document.createElement("A");
	undoLink.href = "#";
	undoLink.innerHTML = undoHtml;

	var undoDummyLink = document.createElement("SPAN");
	undoDummyLink.setAttribute ("style", "display: none");
	undoDummyLink.innerHTML = undoHtml;

	var meterDiv = document.createElement("DIV");
 	meterDiv.setAttribute ("class", "letter undoMeter");

	var meterSpan = document.createElement("SPAN");
	meterDiv.appendChild (meterSpan);

	var spacerDiv = document.createElement("DIV");
 	spacerDiv.setAttribute ("class", "letter undoSpacer");

	var letter = this;
	var undo = function() {
	    if (letter.undoCharge >= undoRechargeTicks && letter.history.length) {
		letter.undo();
		if (letter.history.length == 0)
		    letter.hideUndo();
		letter.undoCharge = 0;
		letter.undoRechargeTime *= undoRechargeTimeMultiplier;
		letter.undoRechargeTimer = window.setInterval (function() {
		    if (++letter.undoCharge >= undoRechargeTicks) {
			window.clearInterval (letter.undoRechargeTimer);
			hideElement (undoDummyLink);
			showElement (undoLink);
		    }
		    meterSpan.setAttribute ("style", "width: " + Math.floor (100 * letter.undoCharge / undoRechargeTicks) + "%");
		}, letter.undoRechargeTime / undoRechargeTicks);
		hideElement (undoLink);
		showElement (undoDummyLink);
	    };
	};
	undoDiv.onclick = undo;

	this.undoDiv = undoDiv;
	this.hideUndo();

	undoDiv.appendChild (undoLink);
	undoDiv.appendChild (undoDummyLink);
	undoDiv.appendChild (spacerDiv);
	undoDiv.appendChild (meterDiv);

	var undoParent = document.getElementById (args.undoId);
	undoParent.appendChild (undoDiv);

	parent.innerHTML = "";  // clear any loading animation
	this.root = grammar.start.attach (parent, undefined, undefined, this);
    }

    lw.Letter.prototype.update = function (parent, oldSpan, newSpan, delta) {
	var letter = this;
	parent.replaceChild (newSpan, oldSpan);
	this.history.push (function() { parent.replaceChild (oldSpan, newSpan); letter.nontermCount -= delta; letter.conceal() });
	this.showUndo();
	if (this.nontermCount == 0)
	    this.reveal();
    }

    lw.Letter.prototype.undo = function() {
	if (this.history.length)
	    (this.history.pop())();
    }

    lw.Letter.prototype.hideUndo = function() { hideElement(this.undoDiv) }
    lw.Letter.prototype.showUndo = function() { showElement(this.undoDiv) }

    lw.Letter.prototype.reveal = function() { if ("revealDiv" in this) showElement(this.revealDiv) }
    lw.Letter.prototype.conceal = function() { if ("revealDiv" in this) hideElement(this.revealDiv) }

    // done    
    return lw;
})();
