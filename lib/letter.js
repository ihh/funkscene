var LetterWriter = (function(){
    // create the LetterWriter object
    var lw = {};

    // globals
    var defaultStart = "start";
    lw.defaultStart = function() { return defaultStart }
    var anonymousNonterminalPrefix = "phrase";
    var newParamPrefix = "Attribute";
    lw.defaultNever = "0%";
    lw.defaultAlways = "100%";

    var nontermAnchorPrefix = "phrase_"

    // generic functions
    function chain(f,g) { return function() { f.apply(this); g.apply(this) } }  // chain two notify functions

    function sanitizeId(id) {
	id = id.replace(/\s/g,'_')
	id = id.replace(/[^a-zA-Z0-9_]/g,'')
	if (/^[0-9]/.test(id)) id = '_' + id
	return id
    }

    function setUnion(array1,array2) {
	var h = {};
	function f(x) { h[x] = 1 }
	array1.map(f);
	array2.map(f);
	return Object.keys(h)
    }

    function indexOf(haystack,needle) {
        for(var i = 0; i < haystack.length; i++) {
	    if(haystack[i] === needle) {
                return i;
	    }
        }
        return -1;
    };

    function extend (destination, source, doNotOverwrite) {  // source overwrites destination
	if (typeof(source) != "undefined") {
	    for (var property in source) {
		if (source.hasOwnProperty(property))
		    if (!doNotOverwrite || !destination.hasOwnProperty(property))
			destination[property] = source[property];
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
	if (typeof(div) != 'undefined')
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

	var anonCount = 0;
	var grammar = this;
	this.createAnonId = function(prefix,suffix) {
	    var newId;
	    do { newId = (prefix || anonymousNonterminalPrefix) + (++anonCount) + (suffix || "") }
	    while (newId in grammar.nonterm)
	    return newId;
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

    lw.Grammar.prototype.findParam = function(paramId) {
	for (var i = 0; i < this.params.length; ++i)
	    if (this.params[i].id.toLowerCase() == paramId.toLowerCase())
		return this.params[i];
	return undefined;
    }

    lw.Grammar.prototype.usesParam = function(paramId) {
	for (var id in this.nonterm)
	    if (this.nonterm[id].hasParam(paramId))
		return true;
	return false;
    }

    lw.Grammar.prototype.createNewParamId = function() {
	var i, id;
	for (i = 1; this.usesParam(id=newParamPrefix+i) || typeof(this.findParam(id)) != "undefined"; ++i) { }
	return id;
    }

    // method to return canonical serialization of a Grammar
    // if normalize==true, then all anonymous nonterminal expressions will be assigned explicit names
    // NB: for any grammar g, the function toCanonicalString(true) should be a fixed point, i.e.
    //    g.toCanonicalString(true) == g.toCanonicalString(true).toCanonicalString(true)
    //                              == g.normalize().toCanonicalString()
    // and thus
    // g.normalize().isNormalized() == g.hasNormal()
    //                              == true
    lw.Grammar.prototype.toCanonicalString = function(normalize) {
	var grammar = this;
	var newId = {};
	if (normalize) {
	    for (var i = 0; i < this.nonterms.length; ++i)
		if (this.nonterms[i].anonymous) {
		    newId[this.nonterms[i].id] = this.createAnonId()
		}
	    if (grammar.start.id != defaultStart) {
		if (defaultStart in grammar.nonterm) {  // hmm, I think this should never happen (a nonterm called @start that isn't the start), but just in case
		    newId[defaultStart] = this.createAnonId()
		    console.log ("wow Player, you have been manipulating the Grammar with your Bare Hands?")
		}
		newId[grammar.start.id] = defaultStart
	    }
	}
	return grammar.toStringRenamed (newId, normalize);
    }

    function makePreamblePlaceholderPrompt(props) {
	var str = "";
	var gotPreamble = props.hasOwnProperty("preamble");
	var gotPlaceholder = props.hasOwnProperty("placeholder");
	var gotPrompt = props.hasOwnProperty("prompt");
	if (gotPreamble || gotPlaceholder || gotPrompt) {
	    str += "["
		+ (gotPreamble
		   ? (props.preamble
		      + "|" + (gotPlaceholder ? props.placeholder : "")
		      + "|" + (gotPrompt ? props.prompt: ""))
		   : ((gotPlaceholder
		       ? (props.placeholder + "|")
		       : "") + (gotPrompt ? props.prompt: "")))
		+ "]"
	}
	return str;
    }

    function makeMaxUsage(obj) {
	var str = ""
	if ("maxUsage" in obj) {
	    var max = obj.maxUsage;
	    if (max == 1) str = "[once] "
	    else if (max == 2) str = "[twice] "
	    else if (max == 3) str = "[thrice] "
	    else str = "[most " + obj.maxUsage + "] ";
	}
	return str;
    }

    lw.Grammar.prototype.toStringRenamed = function(newId,normalize) {

	function makeNontermRef(props,id) {
	    return makePreamblePlaceholderPrompt(props)
		+ "@" + ((id in newId) ? newId[id] : id)
		+ ((("pause" in props) && props.pause) ? ";" : "")
		+ ((("commit" in props) && props.commit) ? "!" : "")
		+ ((("random" in props) && props.random) ? "?" : "");
	}

	function makeRhsExpr(props,rules) {
	    var str = makePreamblePlaceholderPrompt (props);
	    str += "{";
	    for (var j = 0; j < rules.length; ++j) {
		var rule = rules[j];
		if (j > 0) str += "|";
		if (rule.hint.length || "maxUsage" in rule)
		    str += rule.hint + makeMaxUsage(rule) + "=>";
		str += rule.rhs.map(function(sym){
		    if (sym instanceof LetterWriter.NontermReference) {
			var nonterm = sym.nonterminal;
			if (nonterm.anonymous) {
			    if (normalize)
				return makeNontermRef (sym.props, nonterm.id);  // anonymous id remapping will have been set up as part of normalization
			    return makeRhsExpr (sym.props, nonterm.rules);
			}
			return makeNontermRef (sym.props, nonterm.id);
		    } else
			return sym.asText();
		}).join("");
	    }
	    str += "}";
	    return str;
	}

	var str = "";
	if ("wait" in this.undo)
	    str += "undo { wait: " + this.undo.wait + " }\n"

	if (this.params.length)
	    str += "control " + this.params.map(function(p){return p.asText()}).join(", ") + "\n";
	for (var i = 0; i < this.nonterms.length; ++i) {
	    var nonterm = this.nonterms[i];
	    if ((normalize || !nonterm.anonymous) && nonterm.rules.length) {
		var id = nonterm.id in newId ? newId[nonterm.id] : nonterm.id;
		if (nonterm.random) str += "random ";
		if (nonterm.pause) str += "pause ";
		if (nonterm.commit) str += "commit ";
		str += "@" + id + makeMaxUsage(nonterm) + " => "
		    + makeRhsExpr (nonterm, nonterm.rules) + "\n";
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
    lw.Grammar.prototype.newEditor = function(args) {
	return new lw.GrammarEditor (this, args);
    }

    // NontermEditor
    var nteDummyCount = 0;
    lw.NontermEditor = function(grammarEditor,nonterm,parentDiv,olderSiblingDiv) {
	var nontermEditor = this;
	var grammar = grammarEditor.grammar;
	var notify = grammarEditor.notifyChange;

	if (typeof nonterm == 'undefined')
	    nonterm = grammar.start;
	var nid = nonterm.asText();

	var isStart = nonterm.isStart(grammar)

	extend (this, { grammarEditor: grammarEditor,
			grammar: grammar,
			nonterm: nonterm,
			parentDiv: parentDiv,
			ruleEditor: {} });

	var listItem = this.listItem = $('<div/>').attr(nontermIdAttr,nonterm.id);
	var nontermDiv = this.nontermDiv = $('<div/>').addClass("nonterminal");

	var incomingOpts = $('<ul/>')
	var incomingMenu = $('<ul/>')
	    .addClass("menu")
	    .append($("<li/>")
		    .append($('<a/>').attr("href","#").addClass("editorLink").text("Incoming"))
		    .append(incomingOpts))

	var outgoingOpts = $('<ul/>')
	var outgoingMenu = $('<ul/>')
	    .addClass("menu")
	    .append($("<li/>")
		    .append($('<a/>').attr("href","#").addClass("editorLink").text("Outgoing"))
		    .append(outgoingOpts))

	var mapLink = $('<a/>')
	    .attr("href","#editorMap").addClass("editorLink").text("Map")
	    .click(function(e){ grammarEditor.debugMap.showNeighbors([nonterm.id]) })

	incomingMenu.dropit({beforeShow:function(){
	    incomingOpts.empty()
	    var incoming = nonterm.incomingNonterms(grammar,true)
	    if (incoming.length == 0)
		incomingOpts.append($("<li/>").append($("<span/>")
						      .addClass("undefinedParameter")
						      .text("No incoming links")))
	    else
		for (var i = 0; i < incoming.length; ++i) {
		    var nontermEditor = grammarEditor.nontermEditor[incoming[i].id];
		    incomingOpts.append($("<li/>")
					.append($("<a/>")
						.attr("href","#").text(incoming[i].asText())
						.click((function(nontermEditor){
						    return function(e){
							e.preventDefault();
							nontermEditor.focus()}})(nontermEditor))))
		}
	}})
	
	outgoingMenu.dropit({beforeShow:function(){
	    outgoingOpts.empty()
	    var outgoing = nonterm.outgoingNonterms(true)
	    if (outgoing.length == 0)
		outgoingOpts.append($("<li/>").append($("<span/>")
						      .addClass("undefinedParameter")
						      .text("No outgoing links")))
	    else
		for (var i = 0; i < outgoing.length; ++i) {
		    var nontermEditor = grammarEditor.nontermEditor[outgoing[i].id];
		    outgoingOpts.append($("<li/>")
					.append($("<a/>")
						.attr("href","#").text(outgoing[i].asText())
						.click((function(nontermEditor){
						    return function(e){
							e.preventDefault();
							nontermEditor.focus()}})(nontermEditor))))
		}
	    
	}})

	nontermDiv
	    .append($("<div/>").addClass("editorNavLinks")
		    .append(incomingMenu).append(" ")
		    .append(outgoingMenu).append(" ")
		    .append(mapLink))

	var propDiv = this.propDiv = {};
	var propsDiv = $('<div/>').addClass("NontermProperties")
	nontermDiv.append(propsDiv)

	var fields = 5
	var propColumn = new Array(fields)
	for (var n = 0; n < fields; ++n)
	    propsDiv.append (propColumn[n] = $('<div/>').addClass("NontermPropertiesColumn"))
	var c = 0

	addProperty (this, "Phrase @", "id", {type:"text",size:15,keepFocus:false,hasWarning:false,parentDiv:propColumn[c++]}, "The word used to identify this phrase.", grammarEditor.nontermRenamingFilter(nonterm))

	this.randomControl =
	    addControl ({ property: "random",
			  parentDiv: propColumn[c++],
			  name: "Player",
			  inputDiv: isStart ? ": Human" : $('<select/>').attr('name','nontermPlayer'+(++nteDummyCount)).append('<option value="0">Human</option><option value="1">Computer</option>'),
			  hasWarning: false,
			  getInput: function(){return isStart ? false : this.inputDiv.val() == "1"},
			  setInput: function(x){if (!isStart) this.inputDiv.val(x ? 1 : 0)},
			  tooltip: "If the Computer is selected to play a particular phrase, then the placeholder, prompt and hints will never be displayed to the player. Instead, the computer will make the selection automatically. Instead of 'Option' text for the player, the 'Option (computer)' field can contain the name of a slider-controllable attribute, which the computer will use as a probability to randomly select an option.",
			  notify: function(random){return nontermEditor.updatePlayer(random)} });

	addProperty (this, "Limit?", "maxUsage", {type:"text",size:3,parentDiv:propColumn[c++]}, "The Limit field specifies the maximum number of times that the phrase " + nid + " may be used in the document. Leave this blank for no limit.");
	addProperty (this, "One-way choice?", "commit", {type:"checkbox",hasWarning:false,parentDiv:propColumn[c++]}, "If the Commit box is checked, then after " + nid + " is expanded, the undo history will be cleared: the player will not be able to go back.");
	addProperty (this, "Hide later text?", "pause", {type:"checkbox",hasWarning:false,parentDiv:propColumn[c++]}, "If the Pause box is checked, then all text that appears after " + nid + " in any given expansion will be hidden until " + nid + " has been fully expanded.");

	if (isStart)
	    this.propDiv.id.value.html(nonterm.id);
	else {
	    var inputDiv = nontermEditor.propDiv.id.input
	    inputDiv
		.focus (function(){ inputDiv.val (inputDiv.val().replace(/_/g," ")) })
		.blur (function(){ inputDiv.val (inputDiv.val().replace(/ /g,"_")) })
	}

	this.advancedOptionsDisplayed = false
	function updateAdvancedView(reveal) {
	    if (typeof reveal == 'undefined') reveal = nontermEditor.advancedOptionsDisplayed
	    if (reveal) {
		nontermEditor.preambleControl.containerDiv.show()
		nontermEditor.placeholderControl.containerDiv.show()
		nontermEditor.propDiv.maxUsage.parent.show()
		if (!nonterm.random) {
		    nontermEditor.propDiv.pause.parent.show()
		    nontermEditor.propDiv.commit.parent.show()
		}
		for (var id in nontermEditor.ruleEditor)
		    nontermEditor.ruleEditor[id].showAdvanced()
	    } else {
		if (!nonterm.hasOwnProperty("preamble"))
		    nontermEditor.preambleControl.containerDiv.hide()
		if (!nonterm.hasOwnProperty("placeholder"))
		    nontermEditor.placeholderControl.containerDiv.hide()
		if (!nonterm.hasOwnProperty("maxUsage"))
		    nontermEditor.propDiv.maxUsage.parent.hide()
		if (!nonterm.hasOwnProperty("pause") || nonterm.pause == lw.Nonterm.prototype.pause)
		    nontermEditor.propDiv.pause.parent.hide()
		if (!nonterm.hasOwnProperty("commit") || nonterm.commit == lw.Nonterm.prototype.commit)
		    nontermEditor.propDiv.commit.parent.hide()
		for (var id in nontermEditor.ruleEditor)
		    nontermEditor.ruleEditor[id].hideAdvanced()
	    }
	}
	this.advancedControl = addConfig ({property: "advancedOptionsDisplayed",
					   name: "&nbsp;",  // hack, force width
					   inputDiv: $('<a href="#">'),
					   setInput: function(x){ this.inputDiv.html ($('<i/>').append(x ? "Show less" : "Show more")) },
					   isToggle: true,
					   inputEvent: "click",
					   preventDefaultInputEvent: true,
					   notify: updateAdvancedView })

	this.preambleControl =
	    addControl ({property: "preamble",
			 inputDiv: $('<textarea rows="3"/>'),
			 keepFocus: false,
			 filter: nontermEditor.validatePlainText(function(){return nontermEditor.preambleControl.warningDiv},"The preamble is not expanded or preprocessed at all, and so"),
			 tooltip: "This text is called the preamble. It is displayed wherever the phrase, " + nid + ", occurs in the narrative, and it goes before any other text or controllers associated with " + nid + ". It does not disappear or change after the player makes a choice."})
	this.preambleDiv = this.preambleControl.inputDiv;

	this.placeholderControl =
	    addControl ({property: "placeholder",
			 inputDiv: $('<textarea rows="2"/>'),
			 keepFocus: false,
			 filter: nontermEditor.validatePlainText(function(){return nontermEditor.placeholderControl.warningDiv},"The placeholder is not expanded or preprocessed at all, and so"),
			 tooltip: "This text is called the placeholder. It follows on from the preamble (which is the box above). The placeholder is visible only until the phrase, " + nid + ", is expanded; it disappears when the player makes a choice. The texts flow seamlessly together; the player will not see any difference between the placeholder text and preceding text (at least, not until they make a choice)."})
	this.placeholderDiv = this.placeholderControl.inputDiv;

	updateAdvancedView()  // might as well do this here, let the ruleEditors take care of themselves

	this.promptControl =
	    addControl ({property: "prompt",
			 inputDiv: $('<textarea rows="1"/>'),
			 keepFocus: false,
			 filter: nontermEditor.validatePlainText(function(){return nontermEditor.promptControl.warningDiv},"The prompt is not expanded or preprocessed at all, and so"),
			 tooltip: "The prompt is the question asked to the player whenever " + nid + " occurs in the narrative, prompting them to choose from the various hints, each of which leads to an expansion for " + nid + "."})
	this.propDiv.prompt = {parent:this.promptControl.containerDiv,input:this.promptControl.inputDiv}  // legacy hack

	var addRuleLink = $('<a href="#">Add an option</a>')
	    .click(function(e){ e.preventDefault(); nontermEditor.addRule(); notify() })

	if (grammarEditor.tooltips)
	    addRuleLink.attr("title","Click to add another hint=>expansion.").tooltip()

	var deleteNontermLink = $('<a href="#">Delete</a>')
	    .click(function(e){
		e.preventDefault();
		var incoming = nonterm.incomingNonterms(grammar,true);
		if (incoming.length) {
		    if (!confirm ("Really, delete "+nonterm.asText()+" from the phrasebook? This will not actually delete it but just erase its rules, since it is referenced by other phrases ("+incoming.map(function(n){return n.asText()}).join(", ")+")"))
			return;
		    nontermEditor.resetNonterm()
		} else {
		    if (nonterm.isBare() ? false : !confirm ("Really, delete "+nonterm.asText()+" from the phrasebook?"))
			return;
		    grammarEditor.deleteNonterm (nonterm);
		}
		notify() })

	var copyNontermLink = $('<a href="#">Duplicate</a>')
	    .click(function(e){
		e.preventDefault();
		grammarEditor.copyNonterm (nonterm);
		notify() })

	if (grammarEditor.tooltips) {
	    deleteNontermLink.attr("title","Click to delete this phrase from the phrasebook.").tooltip()
	    copyNontermLink.attr("title","Click to copy this phrase.").tooltip()
	}

	var deleteOrCopySpan = $('<span/>')
	    .addClass("deleteNonterminal")

	if (!isStart)
	    deleteOrCopySpan
	    .append(deleteNontermLink)
	    .append(" / ")

	deleteOrCopySpan
	    .append(copyNontermLink)
	    .append(" phrase")

	var rulesDiv = this.rulesDiv = $('<div/>').addClass("rules");
	nontermDiv
	    .append(rulesDiv)
	    .append($('<span class="addRule"></span>').append(addRuleLink))

	nontermDiv.append(deleteOrCopySpan)

	this.anchor = $('<a/>')
	this.header = $('<h3/>')
	this.setHeader()
	listItem.append(this.header.append(this.anchor)).append(nontermDiv);
	if (typeof (olderSiblingDiv) == 'null')
	    parentDiv.prepend(listItem);
	else if (typeof (olderSiblingDiv) == 'undefined')
	    parentDiv.append(listItem);
	else
	    listItem.insertAfter(olderSiblingDiv);

	// refactoring needed here... no need for addProperty() method or propDiv object
	function addProperty(editor,name,property,controlInfo,tooltip,filter) {
	    var type = controlInfo.type
	    var propDiv = editor.propDiv[property] = {};
	    var inputDiv
	    if (typeof filter == 'undefined')
		filter = function(x){return x}
	    if (type == "textarea")
		inputDiv = $('<textarea rows="1"/>')
	    else
		inputDiv = $('<input type="' + type + '" size="' + controlInfo.size + '"/>')
	    inputDiv.attr("id",nonterm.id+"-"+property)
	    if (type == "text" || type == "textarea") {
		// these are the default controls
	    } else {
		// checkbox
		if (nonterm[property]) inputDiv.attr("checked","checked");
		controlInfo.getInput = function(){
		    return inputDiv.is(":checked")
		}
		controlInfo.setInput = function(x){
		    if (x)
			inputDiv.attr("checked","checked")
		    else
			inputDiv.removeAttr("checked")
		}
	    }
	    propDiv.input = inputDiv;
	    propDiv.info = addControl (extend ({ property: property,
						 name: name,
						 isForm: type != "textarea",
						 inputDiv: inputDiv,
						 filter: filter,
						 tooltip: tooltip },
					      controlInfo))
	    propDiv.parent = propDiv.info.containerDiv
	    propDiv.name = propDiv.info.nameDiv
	    propDiv.value = propDiv.info.valueDiv
	}

	function addControl(h) {
	    var property = ("property" in h) ? h.property : undefined
	    var owner = ("owner" in h) ? h.owner : nonterm
	    var inputDiv = h.inputDiv
	    var info = extend ( { isForm: false,
				  isToggle: false,
				  hasWarning: true,
				  keepFocus: true,
				  property: property,
				  owner: owner,
				  name: property.charAt(0).toUpperCase() + property.substring(1),
				  parentDiv: nontermDiv,
				  containerType: 'div',
				  filter: function(x){return x},
				  set: function(x){owner[property]=x},
				  get: function(){return (property in owner) ? owner[property] : ""},
				  getInput: function(){return this.isToggle ? !(this.get()) : inputDiv.val()},
				  setInput: function(x){inputDiv.val(x)},
				  inputEvent: "change",
				  preventDefaultInputEvent: false,
				  change: function(e){
				      if (info.preventDefaultInputEvent)
					  e.preventDefault()
				      var oldVal = info.get()
				      var newVal = info.filter(info.getInput())
				      info.setInput(newVal)
				      if (oldVal != newVal) { info.set(newVal); info.notify(newVal); notify() }
				      if (info.keepFocus) info.inputDiv.focus() },
				  notify: function(newVal) { }
				}, h)
	    info.setInput(info.get())
	    if (inputDiv instanceof Object && info.inputEvent in inputDiv)
		inputDiv[info.inputEvent].apply(inputDiv,[info.change])
	    info.controlDiv = info.isForm ? $('<'+info.containerType+'/>').addClass("formWrapper").append($('<form action="#">').append(inputDiv)) : inputDiv
	    info.parentDiv
		.append (info.containerDiv = $('<'+info.containerType+'/>').addClass("NontermControl").addClass(info.property+"PropertyEditor")
			 .append(info.nameDiv = $('<'+info.containerType+'/>').addClass("NontermControlName")
				 .append(info.name))
			 .append(info.valueDiv = $('<'+info.containerType+'/>').addClass("NontermControlValue")
				 .append(info.controlDiv)))
	    if (info.hasWarning)
		info.containerDiv.append(info.warningDiv = $('<'+info.containerType+'/>').addClass("NontermControlWarning"))
	    if (grammarEditor.tooltips)
	    	info.containerDiv.attr("title",info.tooltip).tooltip()

	    return info
	}
	this.addControl = addControl

	function addConfig(h) { return addControl(extend ({owner:nontermEditor}, h)) }
	this.addConfig = addConfig

	for (var i = 0; i < nonterm.rules.length; ++i)
	    this.addRuleDiv (nonterm.rules[i]);
	this.createRuleSortable()

	this.updatePlayer();
    }

    lw.NontermEditor.prototype.createRuleSortable = function() {
	var nonterm = this.nonterm;
	var ruleParentDiv = this.rulesDiv;
	var notify = this.grammarEditor.notifyChange
	ruleParentDiv.sortable
	({axis: "y",
	  update: function(event,ui) {
	      var rule = {};
	      for (var i = 0; i < nonterm.rules.length; ++i)
		  rule[nonterm.rules[i].id] = nonterm.rules[i];
	      nonterm.rules = ruleParentDiv.sortable("toArray",{attribute:ruleIdAttr}).map(function(id){return rule[id]});
	      notify()
	    }});
    }

    lw.NontermEditor.prototype.destroyRuleSortable = function() {
	this.rulesDiv.sortable("destroy");
    }

    lw.NontermEditor.prototype.focus = function() {
	this.header.click()
	// setting the document.location doesn't quite work sometimes, probably because animation rolls content away
	var newLoc = "#" + nontermAnchorPrefix + this.nonterm.id
	function setLocation() { document.location = newLoc }
	window.setTimeout(setLocation,400)
//	setLocation()
    }

    function plural(n,noun) { return n + " " + noun + (n == 1 ? "" : "s") }
    lw.NontermEditor.prototype.setHeader = function() {
	this.anchor.attr("name",nontermAnchorPrefix + this.nonterm.id)
	this.anchor.empty().append(this.nonterm.asText())
	var orphan = this.nonterm.isOrphan(this.grammar)
	var bare = this.nonterm.isBare()
	var loose = this.nonterm.looseEnds()
	var looseText = plural(loose,"empty option")
 	if (orphan && bare) this.anchor.append(" (orphan, bare)")
	else if (orphan && loose > 0) this.anchor.append(" (orphan, " + looseText + ")")
	else if (orphan) this.anchor.append(" (orphan)")
	else if (bare) this.anchor.append(" (bare)")
	else if (loose > 0) this.anchor.append(" (" + looseText + ")")
    }

    lw.NontermEditor.prototype.updatePlayer = function(random) {
	if (typeof random == 'undefined') random = this.nonterm.random;
	if (random) {
	    this.propDiv.prompt.parent.hide()
	    this.propDiv.pause.parent.hide()
	    this.propDiv.commit.parent.hide()
	} else {
	    this.propDiv.prompt.parent.show()
	    if (this.advancedOptionsDisplayed) {
		this.propDiv.pause.parent.show()
		this.propDiv.commit.parent.show()
	    }
	}
	var newClass = random ? "computerHint" : "playerHint"
	for (var id in this.ruleEditor) {
	    this.ruleEditor[id].hintName.html(random ? "Probability" : "Option");
	    this.ruleEditor[id].hintInput
		.removeClass("playerHint computerHint")
		.addClass(newClass)
	    this.ruleEditor[id].validateHint(random)
	}
	this.propDiv.prompt.input
	    .removeClass("playerHint computerHint")
	    .addClass(newClass)
	return random;
    }

    function appendFormWrapper(parentDiv,inputDiv) {
	var formDiv = $('<form action="#">').append(inputDiv);
	parentDiv.append(formDiv);
    }

    lw.NontermEditor.prototype.resetNonterm = function() {
	var nontermEditor = this;
	var nonterm = this.nonterm;

	delete nonterm.preamble;
	delete nonterm.placeholder;
	extend (nonterm, new LetterWriter.Nonterm (nonterm.id, nonterm.defaultPrompt, nonterm.anonymous))

	this.preambleDiv.val(nonterm.preamble)
	this.placeholderDiv.val(nonterm.placeholder)
	this.propDiv.prompt.input.val(nonterm.prompt)
	this.propDiv.maxUsage.input.val("maxUsage" in nonterm ? nonterm.maxUsage : "")
	
	function updateCheckbox(property) {
	    if (nonterm[property])
		nontermEditor.propDiv[property].input.attr("checked","checked")
	    else
		nontermEditor.propDiv[property].input.removeAttr("checked")
	}

	updateCheckbox("pause")
	updateCheckbox("commit")

	this.randomControl.setInput (nonterm.random)

	for (var ruleId in this.ruleEditor)
	    this.ruleEditor[ruleId].rule.remove()
	this.ruleEditor = []

	this.addRule()
    }

    lw.NontermEditor.prototype.addRule = function() {
	this.destroyRuleSortable()
	this.addRuleDiv (this.nonterm.addEmptyRule());
	this.createRuleSortable()
	this.updatePlayer();
    }

    lw.NontermEditor.prototype.validatePlainText = function(warningDivFunc,prefix) {
	return function(text) {
	    var warningDiv = warningDivFunc()
	    if (/[\S]/.test(text)) {
		var errorPrefix = prefix + " should not contain any \"special\" characters.  These special characters include square braces [], curly braces {}, =, $, @, and #. If you have to include those, you should prefix them with a backslash \"\\\". The specific error encountered was as follows:"
		try {
		    LetterWriter.parser.parse (text, "text");
		} catch (e) {
		    showWarningIcon (warningDiv, errorPrefix + buildErrorMessage(e))
		    return text
		}
		hideWarningIcon (warningDiv)
	    }
	    return text;
	}
    }

    lw.NontermEditor.prototype.addRuleDiv = function(rule) {
	var grammar = this.grammar;
	var grammarEditor = this.grammarEditor;
	var nontermEditor = this;
	var notify = grammarEditor.notifyChange;
	var nonterm = nontermEditor.nonterm;

	var ruleDiv = $('<div/>').addClass("rule").attr(ruleIdAttr,rule.id);

	var deleteLinkDiv = $('<a href="#">Delete option</a>')
	var deleteDiv = $('<div/>').addClass("deleteRule").append(deleteLinkDiv)

	if (grammarEditor.tooltips)
	    deleteDiv.attr("title","Click to delete this row.").tooltip()

	deleteLinkDiv.click (function(e){
	    e.preventDefault();
	    if (rule.isBare() || confirm ("Really, delete option"+(/\S/.test(rule.hint)?(' "'+rule.hint+'"'):"")+"?")) {
		nonterm.rules.splice (indexOf (nonterm.rules, rule), 1);
		delete nontermEditor.ruleEditor[rule.id];
		ruleDiv.remove();
		if (nonterm.rules.length == 0)
		    nontermEditor.addRule();  // give it at least one empty rule
		grammarEditor.refreshHeaders()
		notify() } })

	var rhsGet = function() { return rule.rhsAsText() }
	var limitGet = function() { return ("maxUsage" in rule) && rule.maxUsage > 0 ? rule.maxUsage : "" }

	var hintInputDiv = $('<textarea rows="1"/>').attr({name: "hint" + rule.id})
	var rhsInputDiv = $('<textarea rows="4"/>').attr({name: "rhs" + rule.id})
	var limitInputDiv = $('<input type="text" size="3"/>').attr({name: "limit" + rule.id})

	function validateHint(random) {
	    if (typeof random == 'undefined') random = nonterm.random;
	    var hintWarningDiv = ruleEditor.hintInputWarning
	    if (random) {
		if (/[\S]/.test(rule.hint)) {
		    var errorPrefix = "For phrases whose expansion is chosen by the computer, the hint should be a number (representing a probability or a relative rate) or the name of an attribute. This does not look like a number or the name of an attribute, at least not within this program's limited parsing abilities. The specific error message encountered was as follows: "
		    var weightFunc;
		    try {
			weightFunc = LetterWriter.parser.parse (rule.hint, "sum_weight_expr");
		    } catch (e) {
			showWarningIcon (hintWarningDiv, errorPrefix + buildErrorMessage(e))
			return
		    }
		    var bad = weightFunc.getBadParams(grammar)
		    if (bad.missing.length)
			showWarningIcon (hintWarningDiv, "Some parameters in this expression (" + bad.missing.map(function(x){return"$"+x}).join(", ") + ") are not referenced anywhere in the phrasebook, so they are probably not going to work the way you intended.")
		    else if (bad.unsafe.length)
			showWarningIcon (hintWarningDiv, "Some parameters (" + bad.unsafe.map(function(x){return"$"+x}).join(", ") + ") are not assigned to sliders; they are only assigned as \"side-effects\" of other phrase expansions. As such, I cannot (without a more elaborate analysis) guarantee that they will have a meaningful probabilistic value, or indeed any value at all, at the time this rule is expanded. I hope you know what you're doing.")
		    else
			hideWarningIcon (hintWarningDiv)
		} else
		    hideWarningIcon (hintWarningDiv)
	    } else  // !random
		nontermEditor.validatePlainText(function(){return hintWarningDiv},"For phrases whose expansion is chosen by the player, the hint will not itself be expanded, and so")(rule.hint)
	}

	function hintInputChange(e){
	    rule.hint = e.target.value;
	    validateHint()
	    nontermEditor.setHeader()
	    notify() }

	function warnEmptyRhs() {
	    var rhsWarningDiv = ruleEditor.rhsInputWarning
	    showWarningIcon (rhsWarningDiv, "This expansion is empty; it will disappear when the player selects it. You might want at least some text here.")
	}

	function rhsInputChange(e) {
	    var oldRhs = rule.rhs;
	    if (e.type == "change") {  // prevent event firing a second time for autocompletechange
		var newRhsText = e.target.value;
		var rhsWarningDiv = ruleEditor.rhsInputWarning
		var newRhs;
		if (newRhsText == "") {
		    warnEmptyRhs()
		    newRhs = []
		} else {
 		    try {
 			newRhs = LetterWriter.parser.parse (newRhsText, "ui_rhs");
 			hideWarningIcon (rhsWarningDiv)
		    } catch (err) {
			var msg = buildErrorMessage(err);
			console.log("Syntax error in expansion of @" + rule.lhs.id + ":\n" + msg);
			showWarningIcon (rhsWarningDiv, "It looks like there might be a syntax error in this expansion. The error reported by the parser was as follows:\n" + msg)
			// TODO: make parser more forgiving, e.g. "@," or "@@@@" or "@ " should not trigger a syntax error; probably no need for "#" to be a special character
			// TODO: if there is a syntax error and the text contains special characters ("{}[]" etc), try re-parsing with characters escaped
			return;
		    }
		}

		if (typeof(newRhs) != 'undefined') {
		    function scanRhsForNewSymbols(rhs,callback) {
			for (var i = rhs.length - 1; i >= 0; --i) {
			    var newSym = rhs[i];
			    if (newSym instanceof LetterWriter.NontermReference) {
				if (newSym.nonterminal.id in grammar.nonterm)
				    newSym.nonterminal = grammar.nonterm[newSym.nonterminal.id]
				else {
				    callback (newSym)
				    var newNonterm = newSym.nonterminal;
				    for (var j = 0; j < newNonterm.rules.length; ++j)
					scanRhsForNewSymbols (newNonterm.rules[j].rhs, callback) } } } }

		    // rename anonymous nonterminals
		    scanRhsForNewSymbols(newRhs,function(sym){
			var newNonterm = sym.nonterminal;
			if (newNonterm.anonymous)
			    newNonterm.id = grammar.createAnonId((sym.random()
								  ? "computer_"
								  : "player_") + anonymousNonterminalPrefix,
								 "_" + nonterm.id) })

		    // incorporate all new nonterminals into grammar.
		    // those flagged as anonymous will have the modifiers copied into their properties
		    var grammarChanged = false
		    scanRhsForNewSymbols(newRhs,function(sym){
			grammarChanged = true
			grammarEditor.addNonterm (sym, nonterm)  // migrates anonymous modifiers into nonterm properties
			// clear the anonymous flag
			sym.nonterminal.anonymous = false })

		    rule.rhs = newRhs;
		    rhsInputDiv.val (rule.rhsAsText());

		    var deletedIds = {}
		    for (var i = 0; i < oldRhs.length; ++i)
			if (oldRhs[i] instanceof LetterWriter.NontermReference && oldRhs[i].nonterminal.isOrphan(grammar) && oldRhs[i].nonterminal.isBare() && !(oldRhs[i].nonterminal.id in deletedIds)) {
			    deletedIds[oldRhs[i].nonterminal.id] = true
			    grammarChanged = true
			    grammarEditor.deleteNonterm(oldRhs[i].nonterminal)
			}

		    grammarEditor.refreshHeaders()

		    notify()
		    if (grammarChanged)
			nontermEditor.focus()
		}
	    }
	}

	rhsInputDiv.autocomplete ({ change: rhsInputChange,
				    source: function(request,response) {
					var matchNonterm = /^(.*)(@[a-zA-Z0-9]*)$/.exec (request.term)
					var suggestions = []
					if (matchNonterm && matchNonterm[2].length >= 1) {
					    var typed = matchNonterm[1]
					    var prefix = matchNonterm[2]
					    for (var i = 0; i < grammar.nonterms.length; ++i) {
						var nonterm = grammar.nonterms[i];
						var tag = nonterm.asText()
						if (tag.length >= prefix.length && tag.substring(0,prefix.length) == prefix.toLowerCase())
						    suggestions.push ( {label: tag,
									value: typed + tag + " "} ) } }
					else {
					    var matchParam = /^(.*)($[a-zA-Z0-9]*)$/.exec (request.term)
					    if (matchParam) {
						var typed = matchParam[1]
						var prefix = matchParam[2]
						// TODO: autocomplete $param names here...
					    }
					}
					response(suggestions) }})

	function limitInputChange(e){
	    var newMaxUsage = e.target.value;
	    if (newMaxUsage > 0) rule.maxUsage = newMaxUsage
	    else delete rule.maxUsage
	    notify() }

	var ruleEditor
	    = this.ruleEditor[rule.id]
	    = { rule: ruleDiv,
		hintInput: hintInputDiv,
		rhsInput: rhsInputDiv,
		validateHint: validateHint,
		controlInfo: {},
		showAdvanced: function(){this.controlInfo.maxUsage.containerDiv.show()},
		hideAdvanced: function(){
		    if (!rule.hasOwnProperty("maxUsage"))
			this.controlInfo.maxUsage.containerDiv.hide()} }

	function addRuleControl(info) {
	    ruleEditor.controlInfo[info.property] = nontermEditor.addControl (extend ({owner:rule,parentDiv:ruleDiv}, info))
	    ruleEditor[info.property+"Name"] = ruleEditor.controlInfo[info.property].nameDiv
	    ruleEditor[info.property+"Div"] = ruleEditor.controlInfo[info.property].containerDiv
	    ruleEditor[info.property+"InputWarning"] = ruleEditor.controlInfo[info.property].warningDiv
	}

	addRuleControl ({property: "hint",
			 name: "Option ",
			 inputDiv: hintInputDiv,
			 keepFocus: false,
			 change: hintInputChange})

	addRuleControl ({property: "rhs",
			 name: "Expands to ",
			 get: rhsGet,
			 inputDiv: rhsInputDiv,   // this one has to keepFocus; rhs modifications can disrupt grammar
			 change: rhsInputChange})

	addRuleControl ({property: "maxUsage",
			 name: "Limit?",
			 inputDiv: limitInputDiv,
			 keepFocus: false,
			 change: limitInputChange})

	if (rule.rhs.length == 0)
	    warnEmptyRhs()

	ruleDiv.append (deleteDiv)

	this.rulesDiv.append (ruleDiv)

	if (!nontermEditor.advancedOptionsDisplayed)
	    ruleEditor.hideAdvanced()
    }

    lw.NontermEditor.prototype.replaceParams = function(oldParam,newParam) {
	if (this.nonterm.random)
	    for (var i = 0; i < this.nonterm.rules.length; ++i) {
		var rule = this.nonterm.rules[i];
		if (rule.hasParam(oldParam)) {
		    rule.replaceParam(oldParam,newParam)
		    var hintInputDiv = this.ruleEditor[rule.id].hintInput;
		    hintInputDiv.val (rule.hint)
		}
	    }
    }

    lw.NontermEditor.prototype.refreshExpansions = function() {
	for (var i = 0; i < this.nonterm.rules.length; ++i) {
	    var rule = this.nonterm.rules[i]
	    this.ruleEditor[rule.id].rhsInput.val(rule.rhsAsText())
	}
	this.setHeader()
    }

    var warningIconPath = "img/warning.png"
    function showWarningIcon(div,message) {
	div.empty().append($('<img/>').attr("src",warningIconPath)).attr("title",message).tooltip()
    }

    function hideWarningIcon(div) {
	div.empty()
    }

    // GrammarEditor
    var nontermIdAttr = "nontermID";
    var paramIdAttr = "paramID";
    var ruleIdAttr = "ruleID";
    lw.GrammarEditor = function(grammar,args) {
	var grammarEditor = this;
	this.notifyChangeInner = function(){}
	this.notifyChange = function() { grammarEditor.notifyChangeInner() }
	var notify = this.notifyChange
	var parentIdPrefix = ("parentIdPrefix" in args) ? args.parentIdPrefix : undefined;

	if (typeof parentIdPrefix == 'undefined' || parentIdPrefix == "")
	    parentIdPrefix = "editor";
	var parentDiv = $("#"+parentIdPrefix+"List");
	var paramsParentDiv = $("#"+parentIdPrefix+"Params");
	var templateDiv = $("#"+parentIdPrefix+"Template");
	var mapDiv = $("#"+parentIdPrefix+"Map");
	var undoInput = $("#"+parentIdPrefix+"UndoWait");

	extend (this, args);
	this.grammar = grammar;
	this.parentIdPrefix = parentIdPrefix;
	this.parentDiv = parentDiv;
	this.paramsParentDiv = paramsParentDiv;

	undoInput
	    .val(("wait" in grammar.undo) ? grammar.undo.wait : initialUndoRechargeTime)
	    .change(function(){ undoInput.val (grammar.undo.wait = parseInt (undoInput.val())); notify() })

	if (templateDiv.length)
	    this.addNotify (function() { templateDiv[0].value = grammar.toCanonicalString() })

	function showDebugMap() {
	    grammarEditor.debugMap = new lw.DebugMapView (grammarEditor, mapDiv[0])
	}

	if (mapDiv.length) {
	    this.addNotify (showDebugMap)
	    showDebugMap()
	}

	this.sortLink = $("<a/>").attr("href","#").addClass("editorLink")
	this.sortLink.insertBefore (parentDiv)

	function alphabetSort(e) {
	    e && e.preventDefault()
	    if (!grammarEditor.sortedByAlphabet) {
		grammarEditor.destroyNontermAccordion()
		var newChildOrder =
		    parentDiv.children().sort (function(a,b) {
			var ida = a.getAttribute(nontermIdAttr), idb = b.getAttribute(nontermIdAttr)
			return ida < idb ? -1 : (ida > idb ? +1 : 0) })
		newChildOrder.detach()
		parentDiv.append (newChildOrder)
		grammarEditor.sortedByAlphabet = true
		grammarEditor.createNontermAccordion()
	    }
	    grammarEditor.sortLink.text ("Custom sort")
	    grammarEditor.sortLink.click (customSort)
	}

	function customSort(e) {
	    e && e.preventDefault()
	    if (grammarEditor.sortedByAlphabet) {
		grammarEditor.destroyNontermAccordion()
		var newChildOrder =
		    parentDiv.children().sort (function(a,b) {
			var idxa = indexOf(grammar.nonterms,
					   grammar.nonterm[a.getAttribute(nontermIdAttr)])
			var idxb = indexOf(grammar.nonterms,
					   grammar.nonterm[b.getAttribute(nontermIdAttr)])
			return idxa < idxb ? -1 : (idxa > idxb ? +1 : 0) })
		newChildOrder.detach()
		parentDiv.append (newChildOrder)
		grammarEditor.sortedByAlphabet = false
		grammarEditor.createNontermAccordion()
	    }
	    grammarEditor.sortLink.text ("Alphabetic sort")
	    grammarEditor.sortLink.click (alphabetSort)
	}

	this.sortedByAlphabet = false
	customSort()

	this.nontermEditor = {};
	for (var i = 0; i < grammar.nonterms.length; ++i) {
	    var nonterm = grammar.nonterms[i];
	    this.addNontermEditor (nonterm, undefined);  // sibling div = undefined; new div will go at the end
	}

	this.createNontermAccordion();

	$("#addNontermLink")
	    .click(function(e,ui){
		e.preventDefault();
		grammarEditor.addNonterm
		(new lw.NontermReference
		 (new lw.Nonterm (grammar.createAnonId(), undefined, false),
		  {}));
		notify() })

	this.paramContainerDivs = []
	for (var i = 0; i < grammar.params.length; ++i) {
	    // TODO: make param editor list Sortable; record the order
	    var param = grammar.params[i];
	    this.addParamDiv(param,i+1)
	}

	this.createParamSortable();

	$("#addSliderLink")
	    .click(function(e,ui){
		e.preventDefault();
		var param = new lw.Param (grammar.createNewParamId(), 0.5, LetterWriter.defaultNever, LetterWriter.defaultAlways)
		grammar.params.push(param)
		grammarEditor.addParamDiv(param,grammar.params.length)
		notify() })
	    .attr("title","Click to add a new slider-controllable attribute. This by itself will not make the attribute do anything; you also need to mark some phrases as 'random', and then enter the name of the attribute in the 'Option (computer)' field for some of that phrase's expansions. This will signal to the computer that it should use the named attribute to control those random expansions.").tooltip()

    }

    lw.GrammarEditor.prototype.tooltips = true;

    lw.GrammarEditor.prototype.createNontermAccordion = function() {
	var grammar = this.grammar;
	var parentDiv = this.parentDiv;
	var notify = this.notifyChange

	parentDiv.accordion({
	    header: "> div > h3",
	    heightStyle: "content",
	    event: "click hoverintent"
	});

	if (!this.sortedByAlphabet)
	    parentDiv.sortable({
		axis: "y",
		// if uncommented, nonterminal div can only be dragged by header bar
		//	    handle: "h3",
	    update: function(event,ui) {
		grammar.nonterms = parentDiv.sortable("toArray",{attribute:nontermIdAttr}).map(function(id){return grammar.nonterm[id]});
		notify()
	    }});
    }

    lw.GrammarEditor.prototype.destroyNontermAccordion = function() {
	var parentDiv = this.parentDiv;
	if (!this.sortedByAlphabet)
	    parentDiv.sortable("destroy");
	parentDiv.accordion("destroy");
    }

    lw.GrammarEditor.prototype.createParamSortable = function() {
	var grammar = this.grammar;
	var paramsParentDiv = this.paramsParentDiv;
	var notify = this.notifyChange
	this.paramsParentDiv.sortable
	({axis: "y",
	  update: function(event,ui) {
	      var param = {};
	      for (var i = 0; i < grammar.params.length; ++i)
		  param[grammar.params[i].id] = grammar.params[i];
	      grammar.params = paramsParentDiv.sortable("toArray",{attribute:paramIdAttr}).map(function(id){return param[id]});
	      notify()
	    }});
    }

    lw.GrammarEditor.prototype.destroyParamSortable = function() {
	this.paramsParentDiv.sortable("destroy");
    }

    lw.GrammarEditor.prototype.addParamDiv = function(param,pos) {
	var grammarEditor = this;
	var grammar = this.grammar;
	var notify = grammarEditor.notifyChange

	var paramDiv = $('<input type="text"/>').
	    attr("name","paramName#"+pos).attr("value",param.name);

	paramDiv.change(function(e,ui){
	    var oldId = param.id, oldName = param.name, newName = e.target.value
	    // sanitize newName
	    newName = sanitizeId(newName)
	    var newId = newName.toLowerCase()
	    paramDiv.val(newName)
	    // update
	    if (newName != oldName) {
		if (newId == oldId) {
		    param.name = newName
		    notify()
		} else if (typeof (grammar.findParam(newId)) != "undefined") {
		    alert ("You cannot change the name of this parameter from '" + oldName + "' to '" + newName + "', because there is already a parameter called '" + newName + "'");
		    paramDiv.val(oldName)
		} else {
		    grammarEditor.destroyParamSortable()
		    for (var i = 0; i < grammar.nonterms.length; ++i)
			grammarEditor.nontermEditor[grammar.nonterms[i].id].replaceParams (oldName, newName)
		    paramContainerDiv.attr(paramIdAttr,newName)
		    param.id = newId
		    param.name = newName
		    grammarEditor.createParamSortable()
		    notify()
		}
	    }
	})

	var paramMinDiv = $('<input type="text"/>')
	    .attr("name","paramMin#"+pos).attr("value",param.min)
	    .change(function(e,ui){param.min = e.target.value; notify() })

	var paramMaxDiv = $('<input type="text"/>')
	    .attr("name","paramMax#"+pos).attr("value",param.max)
	    .change(function(e,ui){param.max = e.target.value; notify() })

	var paramInitialValueDiv = $('<span/>');
	var paramLabelSpan = $('<span/>').addClass("editorSliderLabel").append(' ').append(paramInitialValueDiv).append(' ')
	function updateInitialValue(){paramInitialValueDiv.empty().append('Starting level: '+Math.round(100*param.init)+'%')}
	updateInitialValue()
	var paramSliderDiv = $('<div/>').addClass("editorSlider")
	    .slider({ min: 0,
		      max: 1,
		      value: param.init,
		      step: .01,
		      change: function(event,ui) {
			  param.init = ui.value;
			  updateInitialValue()
		      }})

	var paramDeleteLink = $('<a href="#">Delete this slider</a>')
	if (grammarEditor.tooltips)
	    paramDeleteLink.attr("title","Click to delete this slider.").tooltip()
	paramDeleteLink.click(function(e,ui){
	    e.preventDefault();
	    grammarEditor.destroyParamSortable()
	    if (!grammar.usesParam(param.id) || confirm ("Really, delete slider for $"+param.id+"?")) {
		grammar.params.splice (indexOf (grammar.params, param), 1)
		paramContainerDiv.remove()
	    }
	    grammarEditor.createParamSortable()
	    notify()
	})

	var paramContainerDiv = $('<div/>').addClass("editorSliderContainer")
	    .attr(paramIdAttr,param.id)
	    .append($('<form/>')
		    .append("<i>Name:</i> $").append(paramDiv)
		    .append(" <i>Label at 0%:</i> ").append(paramMinDiv)
		    .append(" <i>Label at 100%:</i> ").append(paramMaxDiv)
		    .append(paramLabelSpan))
	    .append($('<span/>').addClass("editorSliderDeleteLink").append(paramDeleteLink))
	    .append($('<div/>').addClass("editorSliderAndLabel").append(paramSliderDiv))
	this.paramContainerDivs.push(paramContainerDiv);
	this.paramsParentDiv.append(paramContainerDiv);
    }

    lw.GrammarEditor.prototype.remove = function() {
	this.destroyNontermAccordion()
	for (var id in this.nontermEditor)
	    this.nontermEditor[id].listItem.remove()
	for (var i = 0; i < this.paramContainerDivs.length; ++i)
	    this.paramContainerDivs[i].remove()
	this.parentDiv.empty()
	this.paramsParentDiv.empty()
	this.sortLink.remove()
    }

    lw.GrammarEditor.prototype.addNontermEditor = function(nonterm,siblingDiv) {
	if (this.sortedByAlphabet) {
	    var divs = this.parentDiv.children()
	    siblingDiv = null
	    for (var i = 0; i < divs.length; ++i)
		if (divs[i].getAttribute(nontermIdAttr) < nonterm.id)
		    siblingDiv = divs[i];
	    else
		break;
	}
	var nontermEditor = new lw.NontermEditor (this, nonterm, this.parentDiv, siblingDiv);
	this.nontermEditor[nonterm.id] = nontermEditor;
    }

    lw.GrammarEditor.prototype.refreshExpansions = function() {
	for (var id in this.nontermEditor)
	    this.nontermEditor[id].refreshExpansions()
    }

    lw.GrammarEditor.prototype.refreshHeaders = function() {
	for (var id in this.nontermEditor)
	    this.nontermEditor[id].setHeader()
    }

    lw.GrammarEditor.prototype.renameNonterm = function(oldId,newId) {
	var grammar = this.grammar
	var nonterm = grammar.nonterm[oldId]
	var oldNontermEditor = this.nontermEditor[oldId]
	this.destroyNontermAccordion()
	delete this.nontermEditor[oldId]
	oldNontermEditor.listItem.css("display","none");
	nonterm.id = newId
	delete grammar.nonterm[oldId]
	grammar.nonterm[newId] = nonterm
	var newNontermEditor = new lw.NontermEditor (this, nonterm, this.parentDiv, oldNontermEditor.listItem)
	this.nontermEditor[newId] = newNontermEditor
	this.refreshExpansions()
	oldNontermEditor.listItem.remove()
	this.createNontermAccordion()
	newNontermEditor.focus()
    }

    lw.GrammarEditor.prototype.deleteNonterm = function(nonterm) {
	var grammar = this.grammar
	var id = nonterm.id
	this.destroyNontermAccordion()
	grammar.nonterms.splice (indexOf(grammar.nonterms,nonterm), 1)
	delete grammar.nonterm[id]
	var nontermEditor = this.nontermEditor[id]
	nontermEditor.listItem.remove()
	delete this.nontermEditor[id]
	this.createNontermAccordion()
    }

    lw.GrammarEditor.prototype.addNonterm = function(nontermRef,sibling) {
	var nonterm = nontermRef.nonterminal;
	if (nonterm.anonymous) {
	    extend (nonterm, nontermRef.props);  // migrate all the properties into the nonterminal
	    nontermRef.props = {};
	    nontermRef.buildAccessors();  // a bit hacky, but the compiler doesn't know about the editor, so that's how it is
	}
	else
	    nonterm.addEmptyRule();  // give new nonterminal an empty rule or it won't be displayed
	this.addNontermInner(nonterm,sibling)
    }

    lw.GrammarEditor.prototype.addNontermInner = function(nonterm,sibling) {
	var grammar = this.grammar;
	var siblingDiv;
	if (typeof(sibling) == 'undefined')
	    sibling = grammar.nonterms[grammar.nonterms.length - 1]
	grammar.nonterm[nonterm.id] = nonterm;
	grammar.nonterms.splice (indexOf(grammar.nonterms,sibling) + 1, 0, nonterm);
	var siblingEditor = this.nontermEditor[sibling.id];
	siblingDiv = siblingEditor.listItem;
	this.destroyNontermAccordion();
	this.addNontermEditor(nonterm,siblingDiv);
	this.createNontermAccordion();
    }

    lw.GrammarEditor.prototype.copyNonterm = function(sibling) {
	var nonterm = sibling.clone(this.grammar)
	this.addNontermInner(nonterm,sibling)
    }

    lw.GrammarEditor.prototype.nontermRenamingFilter = function(nonterm) {
	var grammarEditor = this;
	var grammar = grammarEditor.grammar;
	return function(newId) {
	    var oldId = nonterm.id;
	    // sanitize newId
	    newId = sanitizeId(newId).toLowerCase()
	    grammarEditor.nontermEditor[oldId].propDiv.id.input.val(newId)
	    // update
	    if (newId != oldId)
		if (newId in grammar.nonterm) {
		    alert ("You cannot change the name of this phrase from @" + oldId + " to @" + newId + ", because there is already a phrase called @" + newId + ".");
		    grammarEditor.nontermEditor[oldId].propDiv.id.input.val(oldId)
		    newId = oldId
		} else
		    grammarEditor.renameNonterm(oldId,newId)
	    return newId
	}
    }

    lw.GrammarEditor.prototype.addNotify = function(f) { this.notifyChangeInner = chain (this.notifyChangeInner, f) }
    lw.GrammarEditor.prototype.warnChange = function(warningDiv,msg,f) {
	this.warnChangeFunction = function() { showWarningIcon (warningDiv, msg) }
	this.addNotify (this.warnChangeFunction)
	if (typeof f != 'undefined')
	    this.addNotify (f)
    }

    // Rule
    lw.Rule = function(id,hint,lhs,rhs,maxUsage) {
	extend (this, { id: id,
			lhs: lhs,
			rhs: rhs })
	if (typeof hint != "undefined")
	    this.hint = hint;
	else if (lhs.anonymous)
	    this.hint = ""
	if (typeof maxUsage != "undefined" && maxUsage > 0)
	    this.maxUsage = maxUsage;
    }
    lw.Rule.prototype.hint = "Choose me!";

    lw.Rule.prototype.clone = function() {
	var rule = new lw.Rule (this.id, this.hint, this.lhs, [], this.maxUsage)
	extend (rule, this, true)
	for (var i = 0; i < this.rhs.length; ++i)
	    rule.rhs.push (this.rhs[i].clone())
	return rule;
    }

    lw.Rule.prototype.isBare = function() {
	return (this.hint == lw.Rule.prototype.hint || this.hint == "") && this.rhs.length == 0
    }

    lw.Rule.prototype.isLooseEnd = function() {
	return this.rhs.length == 0
    }

    lw.Rule.prototype.rhsAsText = function() {
	return this.rhs.map(function(sym){return sym.asText()}).join("");
    }

    lw.Rule.prototype.weight = function(scope) {
	var weight = 1;
	if (letter.ruleActive(this) && this.hint.length > 0) {
	    var weightFunc = LetterWriter.ParamFunc.newFromString (this.hint);
	    if (typeof weightFunc != 'undefined') {
		weight = weightFunc.evaluate(scope);
		if (typeof(weight) == 'undefined' || weight < 0) weight = 0;
	    }
	}
	return weight;
    }

    lw.Rule.prototype.hasParam = function(param) {
	var weightFunc = LetterWriter.ParamFunc.newFromString (this.hint);
	return (typeof(weightFunc) != 'undefined' && weightFunc.hasParam(param))
    }

    lw.Rule.prototype.replaceParam = function(oldParam,newParam) {
	var weightFunc = LetterWriter.ParamFunc.newFromString (this.hint);
	if (typeof(weightFunc) != 'undefined' && weightFunc.hasParam(oldParam)) {
	    weightFunc.replace(oldParam,newParam)
	    this.hint = weightFunc.asText()
	}
	// TODO: replace Param in rhs ParamAssignment's and ParamReference's
    }

    var fadeTime = 500;  // milliseconds
    var fadeSteps = 25;
    lw.Rule.prototype.expand = function (parentSpan, oldSpan, parentNode) {
	parentNode.leaf = false;
	extend (parentNode.expansionParamValue = {}, parentNode.letter.paramValue);  // record Param settings, for later analytics interest
	parentNode.expansionDate = new Date(); // ditto timestamp

	var letter = parentNode.letter;
	var span = document.createElement("SPAN");  // this will be the parent of all expanded DOM nodes

	function iterateDom(node,pre,post) {
	    pre.apply(node)
	    if (node.hasChildNodes()) {
		var child = node.firstChild;
		while (child) {
		    if (child.nodeType === 1) {
			iterateDom(child,pre,post);
		    }
		    child = child.nextSibling;
		}
	    }
	    if (typeof post == 'function')
		post.apply(node)
	}

	function makeHider(span) {
	    return function() {
		iterateDom(span,function(){
		    this.className += " unselectable"
		    if (this.tagName.toLowerCase() == "select")
			this.setAttribute ("disabled", "disabled")})
		span.setAttribute ("style", "opacity: 0");
	    }
	}

	function makeFader(span) {
	    return function() {
		iterateDom(span,function(){
		    this.className = this.className.replace(/ unselectable/g,"")
		    if (this.tagName.toLowerCase() == "select")
			this.removeAttribute ("disabled")})
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
	    var preambleSpan = symNode.preambleSpan;
	    var symSpan = symNode.span;

	    if (sym instanceof lw.NontermReference && sym.random()) {
		// automatically expand random rule, prepend expansion to list of nonterminals remaining to be processed
		symNode.leaf = false;
		var rule = sym.nonterminal.randomRule (symNode.getScope());
		if (rule instanceof lw.Rule) {
		    rhsQueue.splice.apply (rhsQueue, [0,0].concat(rule.rhs.map(function(sym){return [sym, symNode, rule]})));
		} else {
		    console.log ("@" + sym.nonterminal.id + " has no active rules that can be automatically expanded; using placeholder text");
		    symSpan.appendChild (symNode.placeholderSpan);
		}
		continue;
	    }

	    // nonrandom symbol (Term or NontermReference)
	    var fader = chain (makeFader(symSpan), makeFader(preambleSpan))
	    var hider = chain (makeHider(symSpan), makeHider(preambleSpan));
	    hider();
	    span.appendChild (preambleSpan);
	    span.appendChild (symSpan);
	    if (typeof (lastPauseNode) == "undefined")
		fader()
	    else {
		lastPauseNode.notifyExpanded = chain (lastPauseNode.notifyExpanded, fader)
		lastPauseNode.notifyCollapsed = chain (lastPauseNode.notifyCollapsed, hider)
	    }
	    if (sym instanceof lw.NontermReference) {
		if (sym.pause())
		    lastPauseNode = symNode;
		rhsNontermNodes.push (symNode);
	    }
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

	if (parentNode.symbol.commit()) {
	    letter.history = [];
	    letter.hideUndo();
	    letter.undoRechargeTime = initialUndoRechargeTime;  // you've been a good Player
	} else {
	    letter.history.push (function() {
		parentSpan.replaceChild (oldSpan, span);
		parentNode.clear();
		letter.showParams();
		parentNode.notifyCollapsed();
		letter.updateEnabledOptions();
		letter.notifyChange()
	    });
	    letter.showUndo();
	}

	letter.updateEnabledOptions();

	if (letter.completed()) {
	    letter.hideParams();
// turn off this reveal-the-IDE trick, for now
//	    letter.reveal();
	}

	letter.notifyChange()
    }

    // Param
    lw.Param = function(p,v,min,max) {
	extend (this, {id: p.toLowerCase(),
		       name: p,
		       init: (v > 1 ? 1 : v),
		       min: min,
		       max: max})
    }

    lw.Param.prototype.asText = function() {
	return "$" + this.name + " {" + this.min + "=>" + this.max + "}" + " = " + this.init
    }

    // ParamFunc
    lw.ParamFunc = function(args) {
	this.op = undefined;
	extend (this, args);
	switch (this.op.toLowerCase()) {
	case "and": this.op = "*"; break;
	case "vs": this.op = "/"; break;
	case "or": this.op = "+"; break;
	case "not": this.op = "!"; break;
	case "*":  // l*r   (multiplication of independent probabilities)
	case "/":  // l/r   (division, useful as a likelihood ratio or relative rate)
	case "+":  // l+r   (addition, l & r measure mutually exclusive events whose union we want)
	case "-":  // l-r   (subtraction, not really safe except when l=1)
	case "!":  // 1-l   (negation, represents everything except event l)
	case ".":  // l.r   (string concatenation)
	case "$":  // param (a parameter; can be a slider-controlled, locally-, or globally-scoped variable)
	case "#":  // value (a numeric constant)
	case "'":  // value (a string constant)
	    break;
	default:
	    throw "Unknown operation " + this.op;
	    break;
	}
    }

    lw.ParamFunc.newFromString = function(str,isStringContext) {
	var weightFunc;
	try {
	    weightFunc = LetterWriter.parser.parse (str, isStringContext ? "param_expr" : "sum_weight_expr");
	} catch (e) {
	    console.log ("The following could not be parsed as a " + (isStringContext ? "string" : "weight") + ": " + str);
	}
	return weightFunc;
    }

    lw.ParamFunc.prototype.evaluate = function(scope) {
	switch (this.op) {
	case "*": return this.l.evaluate(scope) * this.r.evaluate(scope);
	case "/": return this.l.evaluate(scope) / this.r.evaluate(scope);
	case "+": return this.l.evaluate(scope) + this.r.evaluate(scope);
	case "-": return this.l.evaluate(scope) - this.r.evaluate(scope);
	case ".": return String(this.l.evaluate(scope)) + String(this.r.evaluate(scope));
	case "!": return 1 - this.l.evaluate(scope);
	case "$":
	    while (typeof(scope) != 'undefined') {
		if (this.param in scope.paramValue)
		    return scope.paramValue[this.param];
		else
		    scope = scope.parent;
	    }
	    return undefined;
	case "#": return this.value;
	case "'": return this.value;
	}
    }

    lw.ParamFunc.prototype.asText = function() {
	switch (this.op) {
	case "*":
	case "/":
	case "+":
	case "-":
	case ".":
	    return this.l.asText() + " " + this.op + " " + this.r.asText();
	case "!":
	    return "not " + this.l.asText();
	case "$":
	    return "$" + this.param;
	case "#":
	    return this.value;
	case "'":
	    return '"' + this.value.replace('"','\\"') + '"';
	default:
	    break;
	}
	return undefined;
    }

    lw.ParamFunc.prototype.getParams = function() {
	switch (this.op) {
	case "*":
	case "/":
	case "+":
	case "-":
	case ".":
	    return setUnion (this.l.getParams(), this.r.getParams());
	case "!":
	    return this.l.getParams();
	case "$":
	    return [this.param.toLowerCase()];
	case "#":
	case "'":
	    return [];
	default:
	    break;
	}
	return undefined;
    }

    lw.ParamFunc.prototype.hasParam = function(id) {
	switch (this.op) {
	case "*":
	case "/":
	case "+":
	case "-":
	case ".":
	    return this.l.hasParam(id) || this.r.hasParam(id);
	case "!":
	    return this.l.hasParam(id);
	case "$":
	    return this.param.toLowerCase() == id.toLowerCase();
	case "#":
	case "'":
	    return false;
	default:
	    break;
	}
	return undefined;
    }

    lw.ParamFunc.prototype.replace = function(oldParam,newParam) {
	switch (this.op) {
	case "*":
	case "/":
	case "+":
	case "-":
	case ".":
	    this.l.replace(oldParam,newParam);
	    this.r.replace(oldParam,newParam);
	    break;
	case "!":
	    this.l.replace(oldParam,newParam);
	    break;
	case "$":
	    if (this.param.toLowerCase() == oldParam.toLowerCase())
		this.param = newParam;
	    break;
	case "#":
	case "'":
	default:
	    break;
	}
    }

    lw.ParamFunc.prototype.getBadParams = function(grammar) {
	var rhsParam = {}, sliderParam = {}
	for (var i = 0; i < grammar.params.length; ++i)
	    sliderParam[grammar.params[i].id] = true
	for (var i = 0; i < grammar.nonterms.length; ++i)
	    for (var j = 0; j < grammar.nonterms[i].rules.length; ++j)
		for (var k = 0; k < grammar.nonterms[i].rules[j].rhs.length; ++k)
		    if (grammar.nonterms[i].rules[j].rhs[k] instanceof LetterWriter.ParamAssignment)
			rhsParam[grammar.nonterms[i].rules[j].rhs[k].id] = true
	var params = this.getParams(), missing = [], unsafe = [];
	for (var i = 0; i < params.length; ++i)
	    if (!(params[i] in sliderParam))
		((params[i] in rhsParam) ? unsafe : missing).push (params[i]);
	return { missing: missing, unsafe: unsafe };
    }

    // Scope: a helper class for evaluating ParamFunc's
    lw.Scope = function(parent) { extend (this, { parent:parent, paramValue:{} }) }

    // Term
    lw.Term = function(text) {
	this.text = text
    }
    lw.Term.prototype.clone = function() { var term = new lw.Term(this.text); extend(term,this); return term }
    lw.Term.prototype.asText = function() { return this.text }

    // Nonterm
    lw.Nonterm = function(sym,prompt,anon) {
	extend (this, { id: sym,
			rules: [],
			anonymous: anon })
	if (typeof(prompt) != 'undefined')
	    this.prompt = this.defaultPrompt = prompt
    }
    lw.Nonterm.prototype.asText = function() { return "@" + this.id }
    lw.Nonterm.prototype.prompt = lw.Nonterm.prototype.defaultPrompt = "Select an option...";
    lw.Nonterm.prototype.placeholder = "...<br>";
    lw.Nonterm.prototype.preamble = "";
    lw.Nonterm.prototype.pause = false;
    lw.Nonterm.prototype.commit = false;
    lw.Nonterm.prototype.random = false;

    lw.Nonterm.prototype.clone = function(grammar) {
	var nonterm = new lw.Nonterm (grammar.createAnonId(this.id + "_copy"),
				      this.prompt,
				      this.anonymous)
	extend (nonterm, this, true)
	nonterm.rules = []
	for (var i = 0; i < this.rules.length; ++i)
	    nonterm.rules.push (this.rules[i].clone())
	return nonterm;
    }

    lw.Nonterm.prototype.addEmptyRule = function() { return this.addRule(undefined,[],undefined) }
    lw.Nonterm.prototype.addRule = function(hint,rhs,maxUsage) { this.rules.push(new lw.Rule(this.newRuleId(),hint,this,rhs,maxUsage)); return this.rules[this.rules.length - 1] }
    lw.Nonterm.prototype.newRuleId = function() { return this.id + "-" + (this.rules.length + 1) }
    lw.Nonterm.prototype.isHyperlink = function() { return this.rules.length == 1 && this.rules[0].hint == "" }

    lw.Nonterm.prototype.numberOfActiveRules = function(letter) {
	var n = 0
	for (var i = 0; i < this.rules.length; i++)
	    if (letter.ruleActive (this.rules[i]))
		++n
	return n
    }

    lw.Nonterm.prototype.hasActiveRules = function(letter) {
	for (var i = 0; i < this.rules.length; i++)
	    if (letter.ruleActive (this.rules[i]))
		return true;
	return false;
    }

    lw.Nonterm.prototype.hasParam = function(param) {
	if (this.random)
	    for (var i = 0; i < this.rules.length; i++)
		if (this.rules[i].hasParam(param))
		    return true;
	return false;
    }

    lw.Nonterm.prototype.isBare = function() {
	// HACK/WORKAROUND: don't check the prompt here.
	// REASON: default prompt is currently computed from phrase name by parser.
	// renaming the phrase currently doesn't recompute the default prompt (logic is tucked away in parser),
	// so you get the ghost of the old phrase name showing up in the prompt,
	// and this looks like the nonterminal has been edited, violating its "Bare" status.
	if (this.hasOwnProperty("preamble")
	    || this.hasOwnProperty("placeholder"))
	    return false;
	for (var i = 0; i < this.rules.length; i++)
	    if (!this.rules[i].isBare())
		return false;
	return true;
    }

    lw.Nonterm.prototype.looseEnds = function() {
	var n = 0
	for (var i = 0; i < this.rules.length; i++)
	    if (this.rules[i].isLooseEnd())
		++n
	return n
    }

    lw.Nonterm.prototype.isStart = function(grammar) {
	return this.id == lw.defaultStart() || this === grammar.start;
    }

    lw.Nonterm.prototype.isOrphan = function(grammar) {
	return !this.isStart(grammar) && this.incomingNonterms(grammar,true).length == 0
    }

    lw.Nonterm.prototype.incomingNonterms = function(grammar,excludeSelf) {
	var incoming = [];
	for (var i = 0; i < grammar.nonterms.length; ++i) {
	    var nonterm = grammar.nonterms[i];
	    var found = false;
	    if (nonterm != this || !excludeSelf)
		for (var j = 0; !found && j < nonterm.rules.length; ++j)
		    for (var k = 0; !found && k < nonterm.rules[j].rhs.length; ++k) {
			var sym = nonterm.rules[j].rhs[k];
			if (sym instanceof lw.NontermReference && sym.nonterminal === this) {
			    incoming.push(nonterm);
			    found = true;
			}
		    }
	}
	return incoming;
    }

    lw.Nonterm.prototype.outgoingNonterms = function(excludeSelf) {
	var outgoing = [], gotNonterm = {};
	for (var i = 0; i < this.rules.length; ++i) {
	    for (var j = 0; j < this.rules[i].rhs.length; ++j) {
		var sym = this.rules[i].rhs[j];
		if (sym instanceof lw.NontermReference) {
		    var rhsNonterm = sym.nonterminal
		    if ((rhsNonterm != this || !excludeSelf) && !(rhsNonterm.id in gotNonterm)) {
			outgoing.push(rhsNonterm);
			gotNonterm[rhsNonterm.id] = true
		    }
		}
	    }
	}
	return outgoing;
    }

    // Nonterm.attach
    // This method renders the HTML controllers
    var dummyName = 0;
    lw.Nonterm.prototype.attach = function (parentNode, parentSpan, placeholderSpan, prompt) {
	var letter = parentNode.letter;

	if (typeof prompt == 'undefined')
	    prompt = this.prompt;

	var span = document.createElement("SPAN");
	span.appendChild (placeholderSpan)

	if (this.hasActiveRules (letter)) {
	    if (this.isHyperlink()) {
		var link = document.createElement("A");
		parentNode.selectControl = link;
		var rule = this.rules[0];
		link.href = "#";
		link.innerHTML = prompt;
		link.onclick = function(e) { e.preventDefault(); rule.expand (parentSpan, span, parentNode) };
		span.appendChild (link);

	    } else  {
		var select = document.createElement("SELECT");
		parentNode.selectControl = select;
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
			parentNode.options.push (new lw.Option (rule, option));
		    }

		// the callback that expands the next rule when the player selects an option
		select.onchange = function() {
		    var i = select.selectedIndex;
		    if (i > 0)
			activeRules[i-1].expand (parentSpan, span, parentNode);
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

    lw.Nonterm.prototype.makeReference = function(props) {
	return new lw.NontermReference(this,props)
    }

    // Nonterm method to select a random rule
    lw.Nonterm.prototype.randomRule = function(scope) {
	var total = 0;
	var weight = [];
	for (var i = 0; i < this.rules.length; ++i) {
	    var w = this.rules[i].weight(scope);
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
    lw.NontermReference = function(nonterm,props) {
	var myProps = extend ({}, props);
	extend (this, { nonterminal: nonterm,
			props: myProps });

	this.buildAccessors();
    }

    lw.NontermReference.prototype.clone = function() {
	var ref = new lw.NontermReference (this.nonterminal, this.props)
	return ref
    }

    lw.NontermReference.prototype.buildAccessors = function() {
	var myProps = this.props;
	function propAccessor(name) { return function() { return (name in myProps) ? myProps[name] : this.nonterminal[name] } }
	extend (this, { preamble: propAccessor("preamble"),
			placeholder: propAccessor("placeholder"),
			prompt: propAccessor("prompt"),
			commit: propAccessor("commit"),
			pause: propAccessor("pause"),
			random: propAccessor("random") })

	this.asText = function() {
	    return makePreamblePlaceholderPrompt(myProps)
		+ this.nonterminal.asText()
		+ (("pause" in myProps) && myProps.pause ? ";" : "")
		+ (("commit" in myProps) && myProps.commit ? "!" : "")
		+ (("random" in myProps) && myProps.random ? "?" : "")
	}
    }

    lw.NontermReference.prototype.sanitizeQualifiers = function() {
	if (this.random()) {
	    if (this.commit()) {
		console.log ("In rule for @" + lhs + ": can't commit at randomized choice (@" + id + "). Ignoring '!' modifier")
		delete this.props.commit
	    }

	    if (this.pause()) {
		console.log ("In rule for @" + lhs + ": can't pause at randomized choice (@" + id + "). Ignoring ';' modifier")
		delete this.props.pause
	    }
	}
	this.buildAccessors();
	return this;  // allow chaining/returning
    }

    // ParamReference
    lw.ParamReference = function(id) { this.id = id }
    lw.ParamReference.prototype.clone = function() { var p = new lw.ParamReference(this.id); extend(p,this); return p }
    lw.ParamReference.prototype.asText = function() {
	return "$" + this.id + ";"
    }

    lw.ParamReference.prototype.evaluate = function(scope) {
	while (typeof(scope.parent) != 'undefined' && !(this.id in scope.paramValue))
	    scope = scope.parent;
	return (this.id in scope.paramValue) ? scope.paramValue[this.id] : undefined;
    }


    // ParamAssignment
    lw.ParamAssignment = function(args) { extend (this, args) }
    lw.ParamAssignment.prototype.clone = function() { return new lw.ParamAssignment(this) }
    lw.ParamAssignment.prototype.asText = function() {
	return "$" + this.id + " " + (this.local ? "@=" : "=") + " " + this.value.asText() + ";"
    }

    lw.ParamAssignment.prototype.updateScope = function(scope) {
	var paramScope = scope
	if (!this.local)
	    while (typeof(paramScope.parent) != 'undefined' && !(this.id in paramScope.paramValue))
		paramScope = paramScope.parent;
	paramScope.paramValue[this.id] = this.value.evaluate(scope)
    }

    // Letter
    var undoRechargeTicks = 100;  // undo recharge will be split over this many callbacks for smooth animation
    var undoRechargeTimeMultiplier = 1.05;  // 5% increase in recharge time each time player uses Undo
    var initialUndoRechargeTime = 5000;  // the initial value, resets after a commit
    lw.Letter = function(grammar,args,parentIdPrefix) {
	var letter = this;

	// handle missing args
	if (typeof args == 'undefined')
	    args = {};
	var myArgs = { undoId: (("id" in args) ? args.id : "undo"),
		       id: "letter",
		       reveal: "reveal",  // id of DIV to reveal when game completes (TODO: more than one such DIV?)
		       editor: undefined };
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
			nodeCount: 0,  // used to give each node a unique ID
			undoRechargeTime: ("wait" in grammar.undo) ? grammar.undo.wait : initialUndoRechargeTime,
			undoCharge: undoRechargeTicks,
			paramValue: {},
			notifyChangeInner: function(){},
			notifyChange: function() { letter.notifyChangeInner() } })

	for (var i = 0; i < grammar.params.length; ++i)
	    this.paramValue[grammar.params[i].id] = grammar.params[i].init;

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

	var undo = function(e) {
	    e && e.preventDefault();
	    if (letter.undoCharge >= undoRechargeTicks && letter.history.length) {
		letter.undo();
		if (letter.undoRechargeTime > 0) {
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
		}
	    };
	};
	undoDiv.onclick = undo;

	this.undoDiv = undoDiv;
	this.hideUndo();

	undoDiv.appendChild (undoLink);
	undoDiv.appendChild (undoDummyLink);
	undoDiv.appendChild (spacerDiv);
	if (letter.undoRechargeTime > 0)
	    undoDiv.appendChild (meterDiv);

	var undoParent = document.getElementById (args.undoId);
	undoParent.appendChild (undoDiv);
	this.undoParent = undoParent;

	// set up the sliders
	this.paramsDiv = $("#slidersParent");
	this.paramsDiv.append('<div id="sliders"/>');
	for (var i = 0; i < grammar.params.length; ++i) {
	    var param = grammar.params[i];
	    var min = param.min;
	    var max = param.max;
	    var value = param.init;
	    var letter = this;
	    var sliderDiv = $("<div></div>")
		.addClass("slider")
		.slider({ min: 0,
			  max: 1,
			  value: value,
			  step: .01,
			  change: function(event,ui) {
			      letter.paramValue[param.id] = ui.value;
			  }})
		.prepend('<span class="slidermin sliderlabel">'+min+ '</span>')
		.append('<span class="slidermax sliderlabel">'+max+ '</span>');

	    var paramDiv = $("<div></div>")
		.addClass("sliderparam")
		.append('<span>' + param.name + '</span>');

	    var parentDiv = $("<div></div>")
		.addClass("sliderparent")
		.append(paramDiv)
		.append(sliderDiv)

	    $("#sliders").append (parentDiv);
	}
	this.showParams();

	// OK, ready to go
	this.root = new LetterWriter.Node (this, new LetterWriter.NontermReference (grammar.start, {}));
	parent.innerHTML = "";  // clear any loading animation
	parent.appendChild(this.root.preambleSpan);
	parent.appendChild(this.root.span);

	// set up debug parse tree view
	if (typeof parentIdPrefix == 'undefined' || parentIdPrefix == "")
	    parentIdPrefix = "editor";
	var parseDiv = $("#"+parentIdPrefix+"ParseTree");
	function showDebugParseTree() { letter.debugParseTree = new lw.DebugParseTreeView (letter, parseDiv[0]) }
	if (parseDiv.length) {
	    this.addNotify(showDebugParseTree)
	    showDebugParseTree()
	}
    }

    lw.Letter.prototype.attachEditor = function(editor) { this.editor = editor }
    lw.Letter.prototype.detachEditor = function(editor) { this.editor = null }
    
    lw.Letter.prototype.addNotify = function(f) { this.notifyChangeInner = chain (this.notifyChangeInner, f) }

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
	if ("root" in this)
	    this.root.iteratePost (function(){
		if (this.symbol instanceof LetterWriter.NontermReference && (this.symbol.id == id || typeof(id) == 'undefined'))
		    ++n;
	    });
	return n;
    }

    lw.Letter.prototype.termNodes = function() {
	var n = 0;
	this.root.iteratePost (function(){
	    if (this.symbol instanceof LetterWriter.Term)
		++n;
	});
	return n;
    }

    lw.Letter.prototype.ruleUsage = function(id) {
	var n = 0;
	this.root.iteratePost (function(){
	    if (typeof(this.sourceRule) != 'undefined' && this.sourceRule.id == id)
		++n;
	});
	return n;
    }

    lw.Letter.prototype.completed = function() {
	var letter = this;
	var leaves = 0;
	this.root.iteratePost (function(){
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
    lw.Letter.prototype.showParams = function() {
	if (this.grammar.params.length)
	    showElement(this.paramsDiv[0]) }

    lw.Letter.prototype.reveal = function() { if ("revealDiv" in this) showElement(this.revealDiv) }

    lw.Letter.prototype.clear = function() {
	this.parent.innerHTML = "";
	this.undoParent.innerHTML = "";
	this.paramsDiv[0].innerHTML = "";
    }

    lw.Letter.prototype.updateEnabledOptions = function() {
	this.root.iteratePost (this.root.updateEnabledOptions);
    }

    // Node: a node in the Letter parse tree
    // Has pointers back to the DOM
    lw.Node = function(letter,symbol,parentNode,parentSpan) {
	extend (this, { letter: letter,
			count: ++letter.nodeCount,
			parent: parentNode,
			symbol: symbol,
			sourceRule: undefined,
			creationParamValue: {},
			preambleSpan: document.createElement("SPAN"),
			placeholderSpan: document.createElement("SPAN"),
			span: document.createElement("SPAN"),
			parentSpan: parentSpan,
			options: [],
			child: [],
			leaf: true })

	if (parentNode instanceof LetterWriter.Node) {
	    parentNode.child.push (this)
	    extend (this.creationParamValue, parentNode.expansionParamValue)
	}

	if (symbol instanceof LetterWriter.Term)
	    this.span.innerHTML = this.terminalTextToHtml(symbol.text);
	else if (symbol instanceof LetterWriter.NontermReference) {
	    this.preambleSpan.innerHTML = this.terminalTextToHtml(symbol.preamble());
	    this.placeholderSpan.innerHTML = this.terminalTextToHtml(symbol.placeholder());
	    if (!symbol.random())
		this.symbol.nonterminal.attach (this, this.span, this.placeholderSpan, symbol.prompt());
	} else if (symbol instanceof LetterWriter.ParamAssignment) {
	    // empty span is fine
	} else if (symbol instanceof LetterWriter.ParamReference) {
	    var value = symbol.evaluate (this.getScope())
	    if (typeof value == 'undefined')
		this.span.innerHTML = '<span class="undefinedParameter">' + symbol.id + '</span>'
	    else
		this.span.innerHTML = this.terminalTextToHtml(value)
	} else
	    throw "Unknown symbol type encountered during rule expansion";
    }

    lw.Node.prototype.terminalTextToHtml = function(text) {
	return text.replace(/\n/g,"<br>").replace(/_([^_]+)_/g,"<i>$1</i>").replace(/\*([^\*]+)\*/g,"<b>$1</b>")
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
	if (this.leaf) {
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
    }

    lw.Node.prototype.iteratePost = function(f,last) {
	for (var i = 0; i < this.child.length; ++i)
	    if (this.child[i].iteratePost(f,last))
		return true;
	f.apply (this);
	return this === last;
    }

    lw.Node.prototype.iteratePre = function(f,last) {
	f.apply (this);
	if (this === last)
	    return true;
	for (var i = 0; i < this.child.length; ++i)
	    if (this.child[i].iteratePre(f,last))
		return true;
	return false;
    }

    lw.Node.prototype.iterateAncestorsPost = function(f,last,child) {
	f.apply(this,[child]);
	if (this === last)
	    return;
	if (typeof(this.parent) != 'undefined')
	    this.parent.iterateAncestorsPost(f,last,this)
    }

    lw.Node.prototype.iterateAncestorsPre = function(f,last,child) {
	if (typeof(this.parent) != 'undefined')
	    if (this.parent.iterateAncestorsPre(f,last,this))
		return true;
	f.apply(this,[child]);
	if (this === last)
	    return true;
    }

    lw.Node.prototype.iterateChild = function(f,last) {
	for (var i = 0; i < this.child.length; ++i) {
	    f.apply (this.child[i]);
	    if (this.child[i] === last)
		break;
	}
    }

    lw.Node.prototype.iterateNontermChild = function(f) {
	this.iterateChild (function(){
	    if (this.symbol instanceof lw.NontermReference)
		f.apply(this) })
    }

    lw.Node.prototype.nontermChildren = function() {
	var nc = []
	this.iterateNontermChild (function(c){nc.push(c)})
	return nc
    }

    lw.Node.prototype.getScope = function() {
	var node = this
	var finalScope
	function updateScope(node,last,scope) {
	    if (node === last)
		finalScope = scope
	    else if (node.symbol instanceof lw.NontermReference) {
		var inner = new lw.Scope (scope)
		node.iterateChild (function() { updateScope(this,last,inner) }, last)
	    } else if (node.symbol instanceof lw.ParamAssignment)
		node.symbol.updateScope(scope)
	}
	updateScope (letter.root, this, finalScope = new lw.Scope())
	var sliderScope = new lw.Scope (finalScope)
	extend (sliderScope.paramValue, letter.paramValue)
	return sliderScope;
    }

    // Option: wrapper for Rule in parse tree
    lw.Option = function(rule,element) {
	this.rule = rule
	this.element = element
    }


    // debug map renderer
    lw.DebugMapView = function(grammarEditor,div) {
	var debugMapView = this;
	extend (this, {grammarEditor: grammarEditor,
		       grammar: grammarEditor.grammar,
		       div: div})

	// clear the DIV
	while (this.div.hasChildNodes())
	    this.div.removeChild (this.div.lastChild)

	// set the map height
	var length = this.grammar.nonterms.length
	var style = "min-height: " + (1.2*length/2 + 2) + "em"
	div.setAttribute("style",style)
	div.parentElement.setAttribute("style",style)

	// create the sigma instance
	this.sigInst = sigma.init(div).drawingProperties({
	    font: "Palatino Linotype",
	    defaultLabelColor: '#000',
	    defaultLabelSize: 14,
	    defaultLabelBGColor: '#000',
	    defaultLabelHoverColor: '#048',
	    labelThreshold: 0,
	    defaultEdgeType: 'curve',
	    defaultEdgeArrow: 'target',
	    defaultEdgeColor: '#000',
	    defaultNodeColor: '#222'
	}).graphProperties({
	    minNodeSize: 0.1,
	    maxNodeSize: 5,
	    minEdgeSize: 5,
	    maxEdgeSize: 5
	}).mouseProperties({
	    maxRatio: 1,
	    minRatio: 1,
	    blockScroll: false
	});

	// add nodes & edges
	var n = 0;
	var isRed = {}
	if (length % 4 > 0)
	    length = length - (length % 4) + 4
	var minStep = 4/length
	for (var n = 0; n < this.grammar.nonterms.length; ++n) {
	    var pos = 4*n/length
	    var angle = (n/length) * Math.PI * 2
	    var x = -Math.cos(angle) // (pos < 2) ? (pos - 1) : (3 - pos)
	    var y = (pos < 1) ? -pos : ((pos < 3) ? (pos - 2 + minStep/2) : (4 - pos))
	    var nonterm = this.grammar.nonterms[n]
	    var id = nonterm.id
	    var bare = nonterm.isBare()
	    var loose = nonterm.looseEnds()
	    var red = isRed[id] = bare || (loose > 0)
	    var orphan = nonterm.isOrphan(this.grammar)
	    this.sigInst.addNode(id,{ label: id.replace(/_/g," "),
				      color: red ? "#ff0000" : (orphan ? "#dd0000" : (nonterm.random ? "#ff88ff" : "#00cc00")),
				      size: red ? 2 : 1,
				      x: x,
				      y: y })
	}

	var gotEdge = {}
	for (var lhs in this.grammar.nonterm)
	    for (var j = 0; j < this.grammar.nonterm[lhs].rules.length; ++j)
		for (var k = 0; k < this.grammar.nonterm[lhs].rules[j].rhs.length; ++k) {
		    var sym = this.grammar.nonterm[lhs].rules[j].rhs[k];
		    if (sym instanceof lw.NontermReference) {
			var rhs = sym.nonterminal.id
			var edgeId = lhs + "." + rhs
			if (!gotEdge[edgeId]) {
			    this.sigInst.addEdge (edgeId, lhs, rhs, {color:isRed[rhs] ? "#ff0000" : (this.grammar.nonterm[lhs].random ? "#eeaaaa" : "#aa8888")})
			    gotEdge[edgeId] = true
			}
		    }
		}

	// mouse over a node hides nodes that aren't connected to it
	this.sigInst
	    .bind('overnodes',function(event){ debugMapView.showNeighbors(event.content) })
	    .bind('outnodes',function(){ debugMapView.showAllNodes() })
	    .bind('downnodes',function(event){
		var nodes = event.content;
		if (nodes.length) {
		    var id = nodes[0]
		    grammarEditor.nontermEditor[id].focus()
		}
	    })

	// draw
	this.sigInst.draw();
    }

    lw.DebugMapView.prototype.showAllNodes = function() {
	this.sigInst.iterEdges(function(e){
	    e.hidden = 0;
	}).iterNodes(function(n){
	    n.hidden = 0;
	}).draw()
    }

    lw.DebugMapView.prototype.showNeighbors = function(nodes) {
	var neighbors = {}, gotNeighbors = false;
	this.sigInst.iterEdges(function(e){
	    if(nodes.indexOf(e.source)>=0 || nodes.indexOf(e.target)>=0){
		neighbors[e.source] = 1;
		neighbors[e.target] = 1;
		gotNeighbors = true;
	    }
	})
	if (gotNeighbors)
	    this.sigInst.iterNodes(function(n){
		if(!neighbors[n.id]){
		    n.hidden = 1;
		}else{
		    n.hidden = 0;
		}
	    }).draw(2,2,2)
    }

    // debug parse tree renderer
    var charsShown = 20  // number of characters to show in long text labels
    lw.DebugParseTreeView = function(letter,div) {
	var debugParseTreeView = this
	extend (this, {letter:letter,
		       div:div})

	// clear the DIV
	while (this.div.hasChildNodes())
	    this.div.removeChild (this.div.lastChild)

	// create the sigma instance
	this.sigInst = sigma.init(div).drawingProperties({
	    font: "Palatino Linotype",
	    defaultLabelColor: '#000',
	    defaultLabelSize: 14,
	    defaultLabelBGColor: '#000',
	    defaultLabelHoverColor: '#048',
	    labelThreshold: 0,
	    defaultEdgeType: 'line',
	    defaultEdgeColor: '#000',
	    defaultNodeColor: '#222'
	}).graphProperties({
	    minNodeSize: 0.1,
	    maxNodeSize: 5,
	    minEdgeSize: 2,
	    maxEdgeSize: 2
	}).mouseProperties({
	    maxRatio: 1,
	    minRatio: 1,
	    blockScroll: false
	});

	// TODO: placeholders & prompts dangling off leaf nodes could be shown?
	// TODO: show notify triggers as arcs?
	// TODO: node mouseover info could include attribute settings at time of expansion?

	// children-together layout
	var nonterms = letter.nontermUsage()
	var terms = letter.termNodes()
	var nonEmptyPreambles = 0;
	function hasPreamble(node) {
	    return ((node.symbol instanceof LetterWriter.NontermReference)
		    && (node === letter.root || node.symbol.nonterminal.preamble != "")) }
	letter.root.iteratePost (function(){ if (hasPreamble(this)) ++nonEmptyPreambles	});
	function countDescendants(node) {
	    var n = hasPreamble(node) ? 1 : 0;
	    ++n;  // include ourself
	    node.iterateChild(function(){ n += countDescendants(this) })
	    return n }
	var debugParseNodes = nonterms + terms + nonEmptyPreambles;

	function makeNontermId(node,count,type) {
	    if (typeof node == 'undefined') return undefined
	    if (typeof count == 'undefined') count = node.count
	    if (typeof type == 'undefined') type = ""
	    return "@" + node.symbol.nonterminal.id + type + "#" + count
	}

	function makePreambleId(node) { return makeNontermId(node,undefined,".preamble") }
	function makeTextLabel(id,text) { return (text && /[^\s]/.test(text) ? text : "_") }  // just throws away id at the moment
	function makeTermId(node) { return makeNontermId(node.parent,node.count,".term") }
	function makeCodeId(node) { return makeNontermId(node.parent,node.count,".code") }
	function makeTermLabel(node) { return makeTextLabel(makeTermId(node),node.symbol.text) }
	function makeCodeLabel(node) { return makeTextLabel(makeCodeId(node),node.symbol.asText()) }

	var nodeId = {}
	var n = 0
	function quoteHtml(text) { var re1 = /</g, re2 = />/g; return typeof(text)=='undefined'?'<span class="undefinedParameter">undefined</span>' : text.replace(re1,"&lt;").replace(re2,"&gt;") }
	var getAttrs = function(node,attrs) {
	    var attr = {}
	    attr.Text = quoteHtml(node.symbol.asText())
	    if ("expansionDate" in node)
		attr["Expansion time"] = node.expansionDate.toString()
	    return extend(attr,attrs)
	}
	var addNode = function(node,parent,x) {
	    var attr = {Type:"Phrase",Player:node.symbol.random()?"Computer":"Human",Expanded:node.leaf?"not yet":"yes",stash:{node:node}}
	    var activeRules = 0
	    if (node.symbol instanceof LetterWriter.NontermReference) {
		if (node.leaf) {
		    activeRules = node.symbol.nonterminal.numberOfActiveRules(letter)
		    attr["Expansions available"] = activeRules>0 ? activeRules : '<span class="undefinedParameter">none</span>'
		    if (activeRules > 0)
			attr.stash.span = [node.placeholderSpan, node.selectControl]  // until we give placeholders their own nodes in the DebugParseTree view
		} else
		    attr.stash.span = [node.preambleSpan, node.span]
	    }
	    addDebugTreeNode(makeNontermId(node),makeNontermId(parent),extend({label:node.symbol.nonterminal.asText(),x:x,color:node.leaf?(activeRules>0?"#00cc00":"#ff0000"):(node.symbol.random()?"#ff88ff":"#aa8888"),size:node.leaf?2:1},getAttrs(node,attr))) }

	var addPreamble = function(parentNode,x) {
	    var text = parentNode.symbol.nonterminal.preamble
	    addDebugTreeNode(makePreambleId(parentNode),makeNontermId(parentNode),extend({label:makeTextLabel(makePreambleId(parentNode),text),x:x,color:"#ffcc44"},getAttrs(parentNode,{Text:quoteHtml(text),Type:"Preamble",stash:{span:[parentNode.preambleSpan],node:parentNode}}))) }

	var addTerm = function(termNode,x) {
	    addDebugTreeNode(makeTermId(termNode),makeNontermId(termNode.parent),extend({label:makeTermLabel(termNode),x:x,color:"#ffcc44"},getAttrs(termNode,{Type:"Text",stash:{span:[termNode.span],node:termNode.parent}}))) }

	var addCode = function(node,x) {
	    var isAssign = node.symbol instanceof LetterWriter.ParamAssignment
	    var attr = {Type:isAssign?"Parameter assignment":"Parameter reference",stash:{node:node}}
	    if (isAssign)
		attr.Scope = node.symbol.local ? "Local" : "Global"
	    else
		attr.stash.span = [node.span]
	    var evalsTo = isAssign ? node.symbol.value.evaluate(node.getScope()) : node.symbol.evaluate(node.getScope())
	    var isUndef = typeof(evalsTo) == 'undefined'
	    attr["Evaluates to"] = quoteHtml(evalsTo)
	    addDebugTreeNode(makeCodeId(node),makeNontermId(node.parent),extend({label:makeCodeLabel(node),x:x,color:isUndef?"#ff0022":(isAssign?"#0000ff":"#0088cc"),size:isUndef?2:1},getAttrs(node,attr))) }

	var addDebugTreeNode = function(id,parentId,props) {
	    var y = (0.5 + n++) / debugParseNodes
	    props = extend ({ label: id,
			      color: '#888888',
			      x: 0.5,
			      y: y },
			    props)
	    if (props.label.length > charsShown)
		props.label = props.label.substring(0,charsShown) + "..."
	    debugParseTreeView.sigInst.addNode(id,props)
	    if (typeof parentId != 'undefined') {
		debugParseTreeView.sigInst.addEdge (id + "." + parentId, id, parentId) } }

	addNode (letter.root, undefined, .5)

	var iterate = function(xmin,xmax) {
	    var node = this
	    var gotPreamble = hasPreamble(node)
	    var K = countDescendants(node)
	    var c = 0
	    function xrange(node) { 
		var d = typeof(node) == 'undefined' ? 1 : countDescendants(node)
		var xl = xmin + (xmax-xmin) * (c / K)
		c += d
		var xr = xmin + (xmax-xmin) * (c / K)
		return [xl,xr] }
	    function midpoint(lr) {
		return (lr[0] + lr[1]) / 2 }
	    if (gotPreamble)
		addPreamble (node, midpoint(xrange(undefined)))
	    var next = []
	    node.iterateChild(function(){
		var lr = xrange(this)
		var x = midpoint(lr)
		if (this.symbol instanceof LetterWriter.NontermReference)
		    addNode(this,node,x)
		else if (this.symbol instanceof LetterWriter.Term)
		    addTerm(this,x)
		else
		    addCode(this,x)
		next.push([this,lr])})
	    next.map(function(nlr){iterate.apply(nlr[0],nlr[1])})
	}

	iterate.apply (letter.root, [0,1])

	var popUp = false, highlightSpan = [];
	function attributesToString(attr) {
	    var text = ""
	    for (var key in attr) {
		var val = attr[key]
		if (val.length > charsShown) val = val.substring(0,charsShown) + "... <i>(truncated)</i>"
		if (key != "stash")  // crude hack: prevent display of objects stashed in sigma's attr hash
		    text += key + " : " + val + " <br>"
	    }
	    return text
	}
	
	function showNodeInfo(event) {
	    hideNodeInfo()
	    
	    var node;
	    debugParseTreeView.sigInst.iterNodes(function(n){
		node = n;
	    },[event.content[0]]);
	    
	    popUp = $('<div/>').append(
		attributesToString( node['attr'] )
	    ).attr(
		'id',
		'node-info'+debugParseTreeView.sigInst.getID()
	    ).css({
		'display': 'inline-block',
		'border-radius': 3,
		'padding': 5,
		'background': '#fff',
		'color': '#000',
		'box-shadow': '0 0 4px #666',
//		'position': 'absolute',
//		'left': node.displayX,
//		'top': node.displayY+15
	    });
	    
	    $('ul',popUp).css('margin','0 0 0 20px');
	    div.appendChild(popUp[0]);

	    if (("stash" in node.attr) && ("span" in node.attr.stash)) {
		highlightSpan = node.attr.stash.span
		for (var i = 0; i < highlightSpan.length; ++i)
		    highlightSpan[i].className += " parseTreeHighlight"
	    }
	}
	
	function hideNodeInfo() {
	    popUp && popUp.remove();
	    popUp = false;
	    for (var i = 0; i < highlightSpan.length; ++i)
		highlightSpan[i].className = highlightSpan[i].className.replace(/ parseTreeHighlight/g,"")
	    highlightSpan = []
	}

	function goToNonterm(event) {
	    var editor;
	    if ("editor" in debugParseTreeView.letter)
		editor = debugParseTreeView.letter.editor;
	    if (typeof (editor) != "undefined") {
		hideNodeInfo()

		var node;
		debugParseTreeView.sigInst.iterNodes(function(n){
		    node = n;
		},[event.content[0]]);

		if (("stash" in node.attr) && ("node" in node.attr.stash) && (node.attr.stash.node.symbol instanceof LetterWriter.NontermReference))
		    editor.nontermEditor[node.attr.stash.node.symbol.nonterminal.id].focus()
	    }
	}
	
	debugParseTreeView.sigInst
	    .bind('overnodes',showNodeInfo)
	    .bind('outnodes',hideNodeInfo)
	    .bind('downnodes',goToNonterm)

	// draw
	debugParseTreeView.sigInst.draw();
    }

    // done
    return lw;
})();

// JQuery Accordion: code to simulate click on intentional hover
// Adapted (hacked) from http://jqueryui.com/accordion/#hoverintent

// Commented out to disable it because it's REALLY ANNOYING - IH 5/27/2013

/*
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
		timeout = setTimeout( handler, 300 );
	    }
	}
	
	timeout = setTimeout( handler, 300 );
	target.bind({
	    mousemove: track,
	    mouseout: clear
	});
    }
};
*/