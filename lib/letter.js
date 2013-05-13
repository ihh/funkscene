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
    lw.extend = extend;

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    function logError(str,div) {
	console.log (str);
	div.innerHTML = "Error loading LetterWriter template file: <p><code>" + str + "</code> <p>Check the debugger console for more details.";
    }

    function hideElement(e) { e.setAttribute ("style", "display: none"); };
    function showElement(e) { e.setAttribute ("style", "display: inline"); };

    // Grammar
    lw.Grammar = function(letterTemplate) {
	try {
	    var parseResult = lw.parser.parse (letterTemplate);
	    extend (this, parseResult);
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

    var anonPrefix = "term";
    lw.Grammar.prototype.toCanonicalString = function(normalize) {
	var anonId = {};
	if (normalize) {
	    var anonCount = 0;
	    for (var i = 0; i < this.nonterms.length; ++i)
		if (this.nonterms[i].anonymous) {
		    var newId;
		    while ((newId = anonPrefix + (++anonCount)) in this.nonterm) { }
		    anonId[this.nonterms[i].id] = newId;
		}
	}

	function makePlaceholderPrompt(placeholder,prompt) {
	    var str = "";
	    if (placeholder.length || prompt.length) {
		str += "[";
		if (placeholder.length) str += placeholder + "|";
		str += prompt + "]";
	    }
	    return str;
	}

	function makeNontermRef(placeholder,prompt,id) {
	    return makePlaceholderPrompt(placeholder,prompt) + "@" + id;
	}

	function makeRhsExpr(placeholder,prompt,rules) {
	    var str = makePlaceholderPrompt (placeholder, prompt);
	    str += "{";
	    for (var j = 0; j < rules.length; ++j) {
		var rule = rules[j];
		if (j > 0) str += "|";
		if (rule.hint.length || "maxUsage" in rule) {
		    str += rule.hint;
		    if ("maxUsage" in rule) {
			var max = rule.maxUsage;
			if (max == 1) str += "[once]"
			else if (max == 2) str += "[twice]"
			else if (max == 3) str += "[thrice]"
			else str += "[most " + rule.maxUsage + "]";
		    }
		    str += "=>";
		}
		str += rule.rhs.map(function(sym){
		    if (sym instanceof LetterWriter.NontermReference) {
			var placeholder = sym.placeholder();
			var prompt = sym.prompt();
			var nonterm = sym.nonterminal;
			if (placeholder == nonterm.placeholder) placeholder = ""
			if (prompt == nonterm.prompt) prompt = ""
			if (nonterm.anonymous) {
			    if (normalize)
				return makeNontermRef(placeholder,prompt,anonId[nonterm.id]);
			    return makeRhsExpr (placeholder, prompt, nonterm.rules);
			}
			return makeNontermRef(placeholder,prompt,nonterm.id);
		    } else
			return sym.text;
		}).join("");
	    }
	    str += "}";
	    return str;
	}

	var str = "";
	for (var i = 0; i < this.nonterms.length; ++i) {
	    var nonterm = this.nonterms[i];
	    if ((normalize || !nonterm.anonymous) && nonterm.rules.length) {
		var id = nonterm.anonymous ? anonId[nonterm.id] : nonterm.id;
		if (nonterm.pause) str += "pause ";
		if (nonterm.commit) str += "commit ";
		str += "@" + id + " ";
		if ("maxUsage" in nonterm) str += "[max " + nonterm.maxUsage + "] ";
		str += "=> " + makeRhsExpr (nonterm.placeholder == lw.Nonterm.prototype.placeholder ? "" : nonterm.placeholder,
					    nonterm.prompt == nonterm.defaultPrompt ? "" : nonterm.prompt,
					    nonterm.rules) + "\n";
	    }
	}

	return str;
    }

    lw.Grammar.prototype.normalize = function() {
	return new lw.Grammar (this.toCanonicalString (true));
    }

    // Rule
    lw.Rule = function(id,hint,lhs,rhs,maxUsage) {
	extend (this, { id: id,
			hint: hint,
			lhs: lhs,
			rhs: rhs })
	if (typeof maxUsage != "undefined" && maxUsage > 0)
	    this.maxUsage = maxUsage;
    }

    var fadeTime = 500;  // milliseconds
    var fadeSteps = 25;
    lw.Rule.prototype.expand = function (parentSpan, oldSpan, parentNode) {
	var letter = parentNode.letter;
	var span = document.createElement("SPAN");

	function makeHider(span) {
	    return function() {
		span.setAttribute ("style", "opacity: 0");
	    }
	}

	function makeFader(span) {
	    return function() {
		var opacity = 0;
		var timer = window.setInterval (function() {
		    opacity += 1 / fadeSteps;
		    if (opacity >= 1) {
			opacity = 1;
			window.clearInterval (timer);
		    }
		    span.setAttribute ("style", "opacity: " + opacity);
		}, fadeTime / fadeSteps);
	    }
	}

	var oldNontermCount = letter.nontermCount;
	var oldNontermUsage = {};
	extend (oldNontermUsage, letter.nontermUsage);
	var oldRuleUsage = {};
	extend (oldRuleUsage, letter.ruleUsage);

	--letter.nontermCount;
	++letter.ruleUsage[this.id];

	function chain(f,g) { return function() { f.apply(this); g.apply(this) } }  // chain two notify functions

	var rhsNontermNodes = [];
	var lastPauseNode;
	for (var i = 0; i < this.rhs.length; ++i) {
	    var sym = this.rhs[i];
	    var symNode = parentNode.newChild (sym, span);
	    var symSpan = symNode.span;
	    var fader = makeFader (symSpan);
	    var hider = makeHider (symSpan);
	    hider();
	    span.appendChild (symSpan);
	    if (sym instanceof lw.NontermReference) {
		if (typeof (lastPauseNode) == "undefined")
		    fader()
		else {
		    lastPauseNode.notifyExpanded = chain (lastPauseNode.notifyExpanded, fader)
		    lastPauseNode.notifyCollapsed = chain (lastPauseNode.notifyCollapsed, hider)
		}
		if (sym.nonterminal.pause)
		    lastPauseNode = symNode;
		rhsNontermNodes.push (symNode);
	    } else
		fader()
	}

	var rhsNontermCount = rhsNontermNodes.length;
	if (rhsNontermCount == 0)
	    parentNode.notifyExpanded();
	else {
	    parentNode.unexpandedChildren = rhsNontermCount;
	    for (var i = 0; i < rhsNontermNodes.length; ++i) {
		var symNode = rhsNontermNodes[i];
		var oldNotifyFullyExpanded = symNode.notifyExpanded;
		var oldNotifyCollapsed = symNode.notifyCollapsed;
		symNode.notifyExpanded
		    = chain (symNode.notifyExpanded,
			     function() {
				 if (--parentNode.unexpandedChildren == 0)
				     parentNode.notifyExpanded() })

		symNode.notifyCollapsed
		    = chain (symNode.notifyCollapsed,
			     function() {
				 if (parentNode.unexpandedChildren++ == 0)
				     parentNode.notifyCollapsed() })
	    }
	}

	parentSpan.replaceChild (span, oldSpan);

	if (parentNode.symbol.nonterminal.commit) {
	    letter.history = [];
	    letter.hideUndo();
	} else {
	    letter.history.push (function() {
		parentSpan.replaceChild (oldSpan, span);
		parentNode.clear();
		letter.nontermCount = oldNontermCount;
		letter.nontermUsage = oldNontermUsage;
		letter.ruleUsage = oldRuleUsage;
		letter.conceal();
		parentNode.notifyCollapsed();
		letter.updateEnabledOptions();
	    });
	    letter.showUndo();
	}

	letter.updateEnabledOptions();

	if (letter.nontermCount == 0)
	    letter.reveal();
    }

    // Term
    lw.Term = function(text) {
	this.text = text
    }

    // Nonterm
    lw.Nonterm = function(sym,prompt,anon) {
	extend (this, { id: sym,
			rules: [],
			anonymous: anon,
			pause: false,
			commit: false })
	if (typeof(prompt) != 'undefined')
	    this.prompt = this.defaultPrompt = prompt
    }
    lw.Nonterm.prototype.prompt = lw.Nonterm.prototype.defaultPrompt = "Select an option...";
    lw.Nonterm.prototype.placeholder = "";

    lw.Nonterm.prototype.addRule = function(hint,rhs,maxUsage) { this.rules.push(new lw.Rule(this.newRuleId(),hint,this,rhs,maxUsage)) }
    lw.Nonterm.prototype.newRuleId = function() { return this.id + "#" + (this.rules.length + 1) }
    lw.Nonterm.prototype.isHyperlink = function() { return this.rules.length == 1 && this.rules[0].hint == "" }

    lw.Nonterm.prototype.hasActiveRules = function(letter) {
	for (var i = 0; i < this.rules.length; i++)
	    if (letter.ruleActive (this.rules[i]))
		return true;
	return false;
    }

    // Nonterm.attach
    // This method renders the HTML controllers
    var dummyName = 0;
    lw.Nonterm.prototype.attach = function (parent, parentSpan, placeholder, prompt) {
	var letter = parent.letter;

	if (typeof placeholder == 'undefined')
	    placeholder = this.placeholder;

	if (typeof prompt == 'undefined')
	    prompt = this.prompt;

	++letter.nontermUsage[this.id];

	var span = document.createElement("SPAN");
	var phElement = document.createTextNode (placeholder);
	span.appendChild (phElement);

	if (this.hasActiveRules (letter)) {
	    if (this.isHyperlink()) {
		var link = document.createElement("A");
		var rule = this.rules[0];
		link.href = "#";
		link.innerHTML = prompt;
		link.onclick = function() { rule.expand (parentSpan, span, parent) };
		span.appendChild (link);
		++letter.nontermCount;

	    } else  {
		var select = document.createElement("SELECT");
		select.setAttribute ("class", "letter options");
		select.name = "#" + (++dummyName);
		var promptOption = document.createElement("OPTION");
		promptOption.value = 0;
		promptOption.text = prompt;
		select.appendChild (promptOption);
		var activeRules = [];
		for (var i = 0; i < this.rules.length; ++i)
		    if (letter.ruleActive (this.rules[i])) {
			var rule = this.rules[i];
			activeRules.push (rule);
			var option = document.createElement("OPTION");
			option.value = i + 1;
			option.text = rule.hint;
			select.appendChild (option);
			parent.options.push (new lw.Option (rule, option));
		    }
		select.onchange = function() {
		    var i = select.selectedIndex;
		    if (i > 0)
			activeRules[i-1].expand (parentSpan, span, parent);
		    select.selectedIndex = 0;
		}
		span.appendChild (select);
		++letter.nontermCount;
	    }
	}

	parentSpan.appendChild (span);
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

	// handle missing args
	if (typeof args == 'undefined')
	    args = {};
	var myArgs = { undoId: (("id" in args) ? args.id : "undo"),
		       id: "letter",
		       reveal: "reveal" };
	extend (myArgs, args);
	args = myArgs;

	// identify key DOM nodes
	if (!document.getElementById (args.undoId))
	    args.undoId = args.id;
	var parent = document.getElementById (args.id);

	// set defaults
	extend (this, { grammar: grammar,
			parent: parent,
			history: [],
			undoRechargeTime: 5000,
			undoCharge: undoRechargeTicks,
			nontermCount: 0,
			ruleUsage: {},
			nontermUsage: {} })

	// clear nonterm & rule tallies
	for (var id in grammar.nonterm) {
	    var nonterm = grammar.nonterm[id];
	    this.nontermUsage[id] = 0;
	    for (var i = 0; i < nonterm.rules.length; ++i)
		this.ruleUsage[nonterm.rules[i].id] = 0;
	}

	// set up final reveal
	if ("reveal" in args) {
	    var revealDiv = document.getElementById (args.reveal);
	    if (typeof revealDiv != 'undefined')
		this.revealDiv = revealDiv;
	}

	// set up undo button
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
	this.undoParent = undoParent;

	// OK, ready to go
	parent.innerHTML = "";  // clear any loading animation
	this.root = new LetterWriter.Node (this, new LetterWriter.NontermReference (grammar.start));
	parent.appendChild (this.root.span);
    }

    lw.Letter.prototype.ruleActive = function(rule) {
	if (("maxUsage" in rule) && this.ruleUsage[rule.id] >= rule.maxUsage)
	    return false;
	var ruleNontermUsage = {};
	for (var i = 0; i < rule.rhs.length; ++i) {
	    var sym = rule.rhs[i];
	    if (sym instanceof LetterWriter.NontermReference) {
		var nonterm = sym.nonterminal;
		if (!(nonterm.id in ruleNontermUsage))
		    ruleNontermUsage[nonterm.id] = 0;
		++ruleNontermUsage[nonterm.id];
	    }
	}
	for (var id in ruleNontermUsage) {
	    var nonterm = this.grammar.nonterm[id];
	    if (("maxUsage" in nonterm) && this.nontermUsage[id] + ruleNontermUsage[id] > nonterm.maxUsage)
		return false;
	}
	return true;
    }

    lw.Letter.prototype.undo = function() {
	if (this.history.length)
	    (this.history.pop())();
    }

    lw.Letter.prototype.hideUndo = function() { hideElement(this.undoDiv) }
    lw.Letter.prototype.showUndo = function() { showElement(this.undoDiv) }

    lw.Letter.prototype.reveal = function() { if ("revealDiv" in this) showElement(this.revealDiv) }
    lw.Letter.prototype.conceal = function() { if ("revealDiv" in this) hideElement(this.revealDiv) }

    lw.Letter.prototype.clear = function() {
	this.parent.innerHTML = "";
	this.undoParent.innerHTML = "";
    }

    lw.Letter.prototype.updateEnabledOptions = function() {
	this.root.iterate (this.root.updateEnabledOptions);
    }

    // Node: a node in the Letter parse tree
    // Has pointers back to the DOM
    lw.Node = function(letter,symbol,parent) {
	extend (this, { letter: letter,
			parent: parent,
			symbol: symbol,
			span: document.createElement("SPAN"),
			options: [],
			child: [] })

	if (parent instanceof LetterWriter.Node)
	    parent.child.push (this)

	if (symbol instanceof LetterWriter.Term)
	    this.span.innerHTML = symbol.text;
	else if (symbol instanceof LetterWriter.NontermReference)
	    this.symbol.nonterminal.attach (this, this.span, symbol.placeholder(), symbol.prompt());
	else
	    throw "Unknown symbol type encountered during rule expansion";
    }

    lw.Node.prototype.newChild = function(symbol) { return new lw.Node(this.letter, symbol, this) }
    lw.Node.prototype.clear = function() { this.child = [] }
    lw.Node.prototype.notifyExpanded = function() {
//	console.log ("Node expanded: " + this.span.outerHTML);
    }
    lw.Node.prototype.notifyCollapsed = function() {
//	console.log ("Node collapsed: " + this.span.outerHTML);
    }

    lw.Node.prototype.updateEnabledOptions = function() {
	var letter = this.letter;
	for (var i = 0; i < this.options.length; ++i) {
	    this.options[i].element.disabled = !letter.ruleActive (this.options[i].rule);
	}
    }

    lw.Node.prototype.iterate = function(f) {
	for (var i = 0; i < this.child.length; ++i)
	    this.child[i].iterate (f);
	f.apply (this);
    }

    // Option: wrapper for Rule in parse tree
    lw.Option = function(rule,element) {
	this.rule = rule
	this.element = element
    }

    // done
    return lw;
})();
