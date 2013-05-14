var LetterWriter = (function(){
    // create the LetterWriter object
    var lw = {};

    // globals
    var defaultStart = "start";
    lw.defaultStart = function() { return defaultStart }

    // generic functions
    function indexOf(needle) {
        for(var i = 0; i < this.length; i++) {
	    if(this[i] === needle) {
                return i;
	    }
        }
        return -1;
    };

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

    // LetterWriter.Grammar
    // this.nonterm = Object mapping nonterminal IDs (without the leading "@") to LetterWriter.Nonterminal objects
    // this.nonterms = Array of LetterWriter.Nonterminal objects, in the order they're declared in the Grammar
    // this.start = LetterWriter.Nonterminal object deemed to be the start
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

    // method to return canonical serialization of a Grammar
    // if normalize==true, then all anonymous nonterminal expressions will be assigned explicit names
    // NB: for any grammar g, the function toCanonicalString(true) should be a fixed point, i.e.
    //    g.toCanonicalString(true) == g.toCanonicalString(true).toCanonicalString(true)
    //                              == g.normalize().toCanonicalString()
    // and thus
    // g.normalize().isNormalized() == g.hasNormal()
    //                              == true
    var anonPrefix = "phrase";
    lw.Grammar.prototype.toCanonicalString = function(normalize) {
	var grammar = this;
	var newId = {};
	var anonCount = 0;
	function createAnonId() {
	    var newId;
	    while ((newId = anonPrefix + (++anonCount)) in grammar.nonterm) { }
	    return newId;
	}
	if (normalize) {
	    for (var i = 0; i < this.nonterms.length; ++i)
		if (this.nonterms[i].anonymous) {
		    newId[this.nonterms[i].id] = createAnonId()
		}
	    if (grammar.start.id != defaultStart) {
		if (defaultStart in grammar.nonterm) {  // hmm, I think this should never happen (a nonterm called @start that isn't the start), but just in case
		    newId[defaultStart] = createAnonId()
		    console.log ("wow Player, you have been manipulating the Grammar with your Bare Hands?")
		}
		newId[grammar.start.id] = defaultStart
	    }
	}
	return grammar.toStringRenamed (newId, normalize);
    }

    lw.Grammar.prototype.toStringRenamed = function(newId,normalize) {
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
	    return makePlaceholderPrompt(placeholder,prompt) + "@" + ((id in newId) ? newId[id] : id);
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
				return makeNontermRef(placeholder,prompt,nonterm.id);
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
	if (this.params.length) {
	    var g = this;
	    str += "param " + g.params.map(function(p){
		return p + "{" + g.paramMin[p] + "=>" + g.paramMax[p] + "}" + " = " + g.paramInitVal[p]
	    }).join(", ") + "\n";
	}
	for (var i = 0; i < this.nonterms.length; ++i) {
	    var nonterm = this.nonterms[i];
	    if ((normalize || !nonterm.anonymous) && nonterm.rules.length) {
		var id = nonterm.id in newId ? newId[nonterm.id] : nonterm.id;
		if (nonterm.random) str += "random ";
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

    // method to clone a Grammar
    lw.Grammar.prototype.clone = function() {
	return new lw.Grammar (this.toCanonicalString (false));
    }

    // method to normalize a Grammar, i.e. remove all anonymous nonterminals
    lw.Grammar.prototype.normalize = function() {
	return new lw.Grammar (this.toCanonicalString (true));
    }

    // method to test if a Grammar is normalized
    lw.Grammar.prototype.isNormalized = function() {
	return this.normalize().toCanonicalString(true) == this.toCanonicalString(true);
    }

    // method to test if a Grammar *can* be normalized,
    // to something that is then invariant under normalization/serialization
    // this is a basic test... its meaning is a bit abstract hence the fun name
    lw.Grammar.prototype.feelsNormal = function() {
	return this.normalize().isNormalized();
    }

    // editor methods
    lw.Grammar.prototype.newEditor = function(parentId) {
	return new lw.GrammarEditor (this, parentId);
    }

    // NontermEditor
    var nontermIdAttr = "nontermid";
    lw.NontermEditor = function(grammar,nonterm,parentId) {
	if (typeof nonterm == 'undefined')
	    nonterm = grammar.start;

	var parentDiv = $("#"+parentId);

	extend (this, { grammar: grammar,
			nonterm: nonterm,
			parentId: parentId,
			parentDiv: parentDiv,
			ruleDivs: [] });

	var listItem = this.listItem = $('<div/>').attr(nontermIdAttr,nonterm.id);
	var nontermDiv = this.nontermDiv = $('<div/>').addClass("nonterminal");
	var propsDiv = this.propsDiv = $('<div/>').addClass("properties");
	var rulesDiv = this.rulesDiv = $('<div/>').addClass("expansions");
	nontermDiv.append(propsDiv).append(rulesDiv);
	listItem.append('<h3>@' + nonterm.id + '</h3>').append(nontermDiv);
	parentDiv.append(listItem);

	this.propDiv = {};
	function addProperty(editor,name,value) {
	    var propDiv = editor.propDiv[name] = {};
	    var propNameValueDiv = propDiv.parent = $('<div/>').addClass("property");
	    var propNameDiv = propDiv.name = $('<div/>').addClass("propname");
	    var propValueDiv = propDiv.value = $('<div/>').addClass("propvalue");
	    propNameDiv.append(name);
	    propValueDiv.append(value);
	    propNameValueDiv.append (propNameDiv);
	    propNameValueDiv.append (propValueDiv);
	    propsDiv.append (propNameValueDiv);
	}

//	addProperty (this, "Phrase", "@" + nonterm.id);
	addProperty (this, "Placeholder", nonterm.placeholder);
	addProperty (this, "Prompt", nonterm.prompt);
	addProperty (this, "Pause", nonterm.pause);
	addProperty (this, "Commit", nonterm.commit);
	addProperty (this, "Random", nonterm.random);
	addProperty (this, "Limit", ("maxUsage" in nonterm) ? nonterm.maxUsage : "");

	this.hintTitleDiv = $('<div class="hint title">Hint</div>');
	var titleDiv = $('<div class="rule"/>').append(this.hintTitleDiv).append('<div class="rhs title">Expands to</div><div class="limit title">Limit</div>');
	this.rulesDiv.append(titleDiv);
	for (var i = 0; i < nonterm.rules.length; ++i)
	    this.addRule (nonterm.rules[i]);
    }

    lw.NontermEditor.prototype.addRule = function(rule) {
	
	var hintDiv = $('<div/>').addClass("hint").append(rule.hint);
	var rhsDiv = $('<div/>').addClass("rhs").append(rule.rhs.map(function(sym){return sym.asText()}).join(""));
	var limitDiv = $('<div/>').addClass("limit").append("maxUsage" in rule && rule.maxUsage > 0 ? rule.maxUsage : "");
	var ruleDiv = $('<div/>').addClass("rule").append(hintDiv).append(rhsDiv).append(limitDiv);
	this.rulesDiv.append (ruleDiv);
	
	this.ruleDivs.push ({ rule: ruleDiv,
			      hint: hintDiv,
			      rhs: rhsDiv,
			      limit: limitDiv });
    }

    // GrammarEditor
    lw.GrammarEditor = function(grammar,parentId) {
	if (typeof parentId == 'undefined' || parentId == "")
	    parentId = "editorList";
	var parentDiv = $("#"+parentId);

	this.nonterm = [];
	for (var i = 0; i < grammar.nonterms.length; ++i) {
	    var nonterm = grammar.nonterms[i];
	    this.nonterm.push (new lw.NontermEditor (grammar, nonterm, parentId));
	}

	parentDiv.accordion({
	    header: "> div > h3",
	    event: "click hoverintent"
	});

	parentDiv.sortable({
	    axis: "y",
// uncomment to make entire nonterminal div draggable
	    handle: "h3",
	    update: function(event,ui) {
		grammar.nonterms = parentDiv.sortable("toArray",{attribute:nontermIdAttr}).map(function(id){return grammar.nonterm[id]});
		console.log ("update called");
	    }});
    }

    // From http://jqueryui.com/accordion/#hoverintent
    $.event.special.hoverintent = {
	setup: function() {
	    $( this ).bind( "mouseover", jQuery.event.special.hoverintent.handler );
	},
	teardown: function() {
	    $( this ).unbind( "mouseover", jQuery.event.special.hoverintent.handler );
	},
	handler: function( event ) {
	    var currentX, currentY, timeout,
            args = arguments,
            target = $( event.target ),
            previousX = event.pageX,
            previousY = event.pageY;
	    
	    function track( event ) {
		currentX = event.pageX;
		currentY = event.pageY;
	    };
	    
	    function clear() {
		target
		    .unbind( "mousemove", track )
		    .unbind( "mouseout", clear );
		clearTimeout( timeout );
	    }
	    
	    function handler() {
		var prop,
		orig = event;
		
		if ( ( Math.abs( previousX - currentX ) +
		       Math.abs( previousY - currentY ) ) < 7 ) {
		    clear();
		    
		    event = $.Event( "hoverintent" );
		    for ( prop in orig ) {
			if ( !( prop in event ) ) {
			    event[ prop ] = orig[ prop ];
			}
		    }
		    // Prevent accessing the original event since the new event
		    // is fired asynchronously and the old event is no longer
		    // usable (#6028)
		    delete event.originalEvent;
		    
		    target.trigger( event );
		} else {
		    previousX = currentX;
		    previousY = currentY;
		    timeout = setTimeout( handler, 100 );
		}
	    }
	    
	    timeout = setTimeout( handler, 100 );
	    target.bind({
		mousemove: track,
		mouseout: clear
	    });
	}
    };

    // Rule
    lw.Rule = function(id,hint,lhs,rhs,maxUsage) {
	extend (this, { id: id,
			hint: hint,
			lhs: lhs,
			rhs: rhs })
	if (typeof maxUsage != "undefined" && maxUsage > 0)
	    this.maxUsage = maxUsage;
    }

    lw.Rule.prototype.weight = function(letter) {
	var weight = 1;
	if (letter.ruleActive (this))
	    try {
		var weightFunc = LetterWriter.parser.parse (this.hint, "sum_expr");
		weight = weightFunc (letter);
		if (weight < 0) weight = 0;
	    } catch (e) {
		// hint does not parse as a rule, so just use default weight of 1
		console.log ("The following could not be parsed as a weight: " + this.hint);
	    }
	else  // rule is not active
	    weight = 0;
	return weight;
    }

    var fadeTime = 500;  // milliseconds
    var fadeSteps = 25;
    lw.Rule.prototype.expand = function (parentSpan, oldSpan, parentNode) {
	parentNode.leaf = false;
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

	function chain(f,g) { return function() { f.apply(this); g.apply(this) } }  // chain two notify functions

	var rhsNontermNodes = [];
	var lastPauseNode;
	var rhsQueue = [];
	for (var i = 0; i < this.rhs.length; ++i)
	    rhsQueue.push ([this.rhs[i], parentNode, this]);
	while (rhsQueue.length) {
	    var sym_parent_source = rhsQueue.shift();
	    var sym = sym_parent_source[0], currentParentNode = sym_parent_source[1], sourceRule = sym_parent_source[2];
	    var symNode = currentParentNode.newChild (sym, span);  // creates LetterWriter.Node, attaches to parse tree; if nonrandom, creates controllers & attaches to DOM
	    symNode.sourceRule = sourceRule;
	    var symSpan = symNode.span;

	    if (sym instanceof lw.NontermReference && sym.nonterminal.random) {
		// automatically expand random rule, prepend expansion to list of nonterminals remaining to be processed
		symNode.leaf = false;
		var rule = sym.nonterminal.randomRule (letter);
		if (rule instanceof lw.Rule) {
		    rhsQueue.splice.apply (rhsQueue, [0,0].concat(rule.rhs.map(function(sym){return [sym, symNode, rule]})));
		} else {
		    console.log ("@" + sym.nonterminal.id + " has no active rules that can be automatically expanded; using placeholder text");
		    symSpan.appendChild (symNode.placeholderSpan);
		}
		continue;
	    }

	    // nonrandom symbol (Terminal or NontermReference)
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
	    letter.undoRechargeTime = initialUndoRechargeTime;  // you've been a good Player
	} else {
	    letter.history.push (function() {
		parentSpan.replaceChild (oldSpan, span);
		parentNode.clear();
		letter.conceal();
		letter.showParams();
		parentNode.notifyCollapsed();
		letter.updateEnabledOptions();
	    });
	    letter.showUndo();
	}

	letter.updateEnabledOptions();

	if (letter.completed()) {
	    letter.hideParams();
	    letter.reveal();
	}
    }

    // Term
    lw.Term = function(text) {
	this.text = text
    }
    lw.Term.prototype.asText = function() { return this.text }

    // Nonterm
    lw.Nonterm = function(sym,prompt,anon) {
	extend (this, { id: sym,
			rules: [],
			anonymous: anon,
			pause: false,
			commit: false,
			random: false })
	if (typeof(prompt) != 'undefined')
	    this.prompt = this.defaultPrompt = prompt
    }
    lw.Nonterm.prototype.asText = function() { return "@" + this.id + " " }
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
    lw.Nonterm.prototype.attach = function (parent, parentSpan, placeholderSpan, prompt) {
	var letter = parent.letter;

	if (typeof prompt == 'undefined')
	    prompt = this.prompt;

	var span = document.createElement("SPAN");

	if (this.hasActiveRules (letter)) {
	    if (this.isHyperlink()) {
		var link = document.createElement("A");
		var rule = this.rules[0];
		link.href = "#";
		link.innerHTML = prompt;
		link.onclick = function() { rule.expand (parentSpan, span, parent) };
		span.appendChild (link);

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

		// the callback that expands the next rule when the player selects an option
		select.onchange = function() {
		    var i = select.selectedIndex;
		    if (i > 0)
			activeRules[i-1].expand (parentSpan, span, parent);
		    select.selectedIndex = 0;
		}
		span.appendChild (select);
	    }
	} else {
	    console.log ("@" + this.id + " has no active rules that can be chosen; using placeholder text");
	    span = placeholderSpan;
	}

	parentSpan.appendChild (span);
	return span;
    }

    lw.Nonterm.prototype.makeReference = function(placeholder,prompt) {
	return new lw.NontermReference(this,placeholder,prompt)
    }

    // Nonterm method to select a random rule
    lw.Nonterm.prototype.randomRule = function(letter) {
	var total = 0;
	var weight = [];
	for (var i = 0; i < this.rules.length; ++i) {
	    var w = this.rules[i].weight(letter);
	    weight.push(w);
	    total += w;
	}
	var r = Math.random() * total;
	for (var i = 0; i < this.rules.length; ++i)
	    if ((r -= weight[i]) <= 0)
		return this.rules[i];
	return undefined;
    }

    // NontermReference
    lw.NontermReference = function(nonterm,placeholder,prompt) {
	extend (this, { nonterminal: nonterm,
			placeholder: function() { return typeof(placeholder) == 'undefined' ? nonterm.placeholder : placeholder },
			prompt: function() { return typeof(prompt) == 'undefined' ? nonterm.prompt : prompt } })
    }
    lw.NontermReference.prototype.asText = function() {
	return this.nonterminal.asText()
 }

    // Letter
    var undoRechargeTicks = 100;  // undo recharge will be split over this many callbacks for smooth animation
    var undoRechargeTimeMultiplier = 1.05;  // 5% increase in recharge time each time player uses Undo
    var initialUndoRechargeTime = 5000;  // the initial value, resets after a commit
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
			undoRechargeTime: initialUndoRechargeTime,
			undoCharge: undoRechargeTicks,
			paramValue: {} })

	extend (this.paramValue, grammar.paramInitVal);

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

	// set up the sliders
	this.paramsDiv = $("#slidersParent");
	this.paramsDiv.append('<div id="sliders"/>');
	for (var i = 0; i < grammar.params.length; ++i) {
	    var name = grammar.params[i];
	    var min = grammar.paramMin[name];
	    var max = grammar.paramMax[name];
	    var value = grammar.paramInitVal[name];
	    var letter = this;
	    var sliderDiv = $("<div></div>")
		.addClass("slider")
		.slider({ min: 0,
			  max: 1,
			  value: value,
			  step: .01,
			  change: function(event,ui) {
			      letter.paramValue[name] = ui.value;
			  }})
		.prepend('<span class="slidermin sliderlabel">'+min+ '</span>')
		.append('<span class="slidermax sliderlabel">'+max+ '</span>');

	    var paramDiv = $("<div></div>")
		.addClass("sliderparam")
		.append('<span>' + name + '</span>');

	    var parentDiv = $("<div></div>")
		.addClass("sliderparent")
		.append(sliderDiv)
		.append(paramDiv);

	    $("#sliders").append (parentDiv);
	}
	this.showParams();

	// OK, ready to go
	this.root = new LetterWriter.Node (this, new LetterWriter.NontermReference (grammar.start));
	parent.innerHTML = "";  // clear any loading animation
	parent.appendChild (this.root.span);
    }

    lw.Letter.prototype.ruleActive = function(rule) {
	if (("maxUsage" in rule) && this.ruleUsage(rule.id) >= rule.maxUsage)
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
	    if (("maxUsage" in nonterm) && this.nontermUsage(id) + ruleNontermUsage[id] > nonterm.maxUsage)
		return false;
	}
	return true;
    }

    lw.Letter.prototype.nontermUsage = function(id) {
	var n = 0;
	this.root.iterate (function(){
	    if (this.symbol instanceof LetterWriter.NontermReference && (this.symbol.id == id || typeof(id) == 'undefined'))
		++n;
	});
	return n;
    }

    lw.Letter.prototype.ruleUsage = function(id) {
	var n = 0;
	this.root.iterate (function(){
	    if (typeof(this.sourceRule) != 'undefined' && this.sourceRule.id == id)
		++n;
	});
	return n;
    }

    lw.Letter.prototype.completed = function() {
	var letter = this;
	var leaves = 0;
	this.root.iterate (function(){
	    if (this.symbol instanceof LetterWriter.NontermReference && this.symbol.nonterminal.hasActiveRules(letter) && this.leaf)
		++leaves;
	});
	return leaves == 0;
    }

    lw.Letter.prototype.undo = function() {
	if (this.history.length)
	    (this.history.pop())();
    }

    lw.Letter.prototype.hideUndo = function() { hideElement(this.undoDiv) }
    lw.Letter.prototype.showUndo = function() { showElement(this.undoDiv) }

    lw.Letter.prototype.hideParams = function() { hideElement(this.paramsDiv[0]) }
    lw.Letter.prototype.showParams = function() { showElement(this.paramsDiv[0]) }

    lw.Letter.prototype.reveal = function() { if ("revealDiv" in this) showElement(this.revealDiv) }
    lw.Letter.prototype.conceal = function() { if ("revealDiv" in this) hideElement(this.revealDiv) }

    lw.Letter.prototype.clear = function() {
	this.parent.innerHTML = "";
	this.undoParent.innerHTML = "";
	this.paramsDiv[0].innerHTML = "";
    }

    lw.Letter.prototype.updateEnabledOptions = function() {
	this.root.iterate (this.root.updateEnabledOptions);
    }

    // Node: a node in the Letter parse tree
    // Has pointers back to the DOM
    lw.Node = function(letter,symbol,parentNode,parentSpan) {
	extend (this, { letter: letter,
			parent: parentNode,
			symbol: symbol,
			sourceRule: undefined,
			span: document.createElement("SPAN"),
			parentSpan: parentSpan,
			options: [],
			child: [],
			leaf: true })

	if (parentNode instanceof LetterWriter.Node)
	    parentNode.child.push (this)

	if (symbol instanceof LetterWriter.Term)
	    this.span.innerHTML = symbol.text;
	else if (symbol instanceof LetterWriter.NontermReference) {
	    this.placeholderSpan = document.createElement("SPAN");
	    this.placeholderSpan.appendChild (document.createTextNode (symbol.placeholder()));
	    if (!symbol.random)
		this.symbol.nonterminal.attach (this, this.span, this.placeholderSpan, symbol.prompt());
	} else
	    throw "Unknown symbol type encountered during rule expansion";
    }

    lw.Node.prototype.newChild = function(symbol,parentSpan) { return new lw.Node(this.letter, symbol, this, parentSpan) }
    lw.Node.prototype.clear = function() { this.child = []; this.leaf = true }
    lw.Node.prototype.notifyExpanded = function() {
//	console.log ("Node expanded: " + this.span.outerHTML);
    }
    lw.Node.prototype.notifyCollapsed = function() {
//	console.log ("Node collapsed: " + this.span.outerHTML);
    }

    lw.Node.prototype.showPlaceholder = function() {
	if (this.span.parentNode == this.parentSpan)
	    this.parentSpan.replaceChild (this.placeholderSpan, this.span);
    }

    lw.Node.prototype.hidePlaceholder = function() {
	if (this.placeholderSpan.parentNode == this.parentSpan)
	    this.parentSpan.replaceChild (this.span, this.placeholderSpan);
    }

    lw.Node.prototype.updateEnabledOptions = function() {
	var letter = this.letter;
	var enabledNow = 0, enabledBefore = 0;
	for (var i = 0; i < this.options.length; ++i) {
	    if (!this.options[i].element.disabled) ++enabledBefore;
	    var active = letter.ruleActive (this.options[i].rule);
	    if (active) ++enabledNow;
	    this.options[i].element.disabled = !active;
	}
	if (enabledNow == 0 && enabledBefore > 0) {
	    this.showPlaceholder();
	    this.notifyExpanded();
	} else if (enabledNow > 0 && enabledBefore == 0) {
	    this.hidePlaceholder();
	    this.notifyCollapsed();
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
