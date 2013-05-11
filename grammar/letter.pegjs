// Example:

// @start = {Let us begin the letter. => Sire, the people are {What to tell him? => @revolting|@delighted}}
// @revolting = {That they are revolting against his cruel authority. => sadly in open revolt.}
// @delighted = {That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}

// Alternative:

// @start = {Let us begin the letter. => Sire, the people are @people_state}
// @people_state = {What to tell him? => @revolting|@delighted}

// If there is no prompt, then a suitable default will be used
// (derived from the nonterminal name, or generic "Please select..." text if the nonterminal is anonymous).

// If a nonterminal is deterministic (has only one outgoing rule),
// its prompt text will be retained but it will be automatically transformed,
// so programmer can use this to "override" default prompt texts.


{
    var anonNonterms = 0;
    var lhsStack = [];
    var nonterms = [];
    var nontermObj = {};
    var defaultStart = "start";

    function pushLhs(sym) { lhsStack.push(sym); nonterms.push(sym); return true }
    function popLhs() { return lhsStack.pop() }
    function currentLhs() { return lhsStack[lhsStack.length - 1] }

    function addRule(rhs) { getNontermObject(currentLhs()).rules.push(rhs); return true }
    function makeAnonId() { return ++anonNonterms; }
    function isAnonId(sym) { return /^[\d]+$/.test(sym) }
    function defaultPrompt(sym) { return isAnonId(sym) ? "Please choose an option..." : sym.replace(/_/g, ' ') }

    function getNontermObject(sym) {
	if (!(sym in nontermObj))
	    nontermObj[sym] = { id: sym,
				rules: [],
				before: "",
				prompt: defaultPrompt(sym) };
	return nontermObj[sym];
    }

    function getStart() {
	var rhsSymbol = {};
	for (var lhs in nontermObj) {
	    for (var i = 0; i < nontermObj[lhs].rules.length; ++i) {
		var rhs = nontermObj[lhs].rules[i];
		for (var j = 0; j < rhs.length; ++j) {
		    var sym = rhs[j];
		    if (typeof(sym) == 'object')
			rhsSymbol[sym.id] = true;
		}
	    }
	}
	for (var sym in rhsSymbol) {
	    if (!nontermObj[sym].rules.length) {
		console.log ("Symbol @" + sym + " is never defined");
	    }
	}

	var notOnRhs = [];
	for (var lhs in nontermObj) {
	    if (!(lhs in rhsSymbol))
		notOnRhs.push (lhs);
	}

	if (notOnRhs.length > 0)
	    console.log ("The following symbols are defined, but never used: " + notOnRhs.map(function(x){return"@"+x}).join(" "));

	var start;
	if (defaultStart in nontermObj) {
	    if (notOnRhs.length > 0)
		console.log ("However, @" + defaultStart + " is defined, so we're using that as the root.");
	    start = defaultStart;
	} else if (notOnRhs.length) {
	    start = notOnRhs[0];
	    if (notOnRhs.length == 1)
		console.log ("So, @" + start + " makes a natural choice for the start symbol. Use @" + defaultStart + " to override.");
	    else
		console.log ("The first of these symbols to be defined was @" + start + " so we'll use that as the root.");
	} else if (nonterms.length) {
	    start = nonterms[0];
	    console.log ("The first symbol to be defined was @" + start + " so we'll use that as the root.");
	}
	return start;
    }

    function makeGrammar() {
	return { nonterm: nontermObj,
		 start: getStart() };
    }
}


start
 = spc* rule*  { return makeGrammar(); }

nonterm_symbol
 = "@" s:symbol  { return s; }

rule
 = lhs:nonterm_symbol spc* &{return pushLhs(lhs)} "=" spc* "{" rhs:rhs "}" spc* {popLhs()}

rhs
 = before:text "=>" prompt:text "=>" rhs_list  { var n = getNontermObject(currentLhs()); n.before = before; n.prompt = prompt }
 / prompt:text "=>" rhs_list  { getNontermObject(currentLhs()).prompt = prompt }
 / rhs_list

rhs_list
 = rhs:sym_expr+ &{return addRule(rhs)} ("|" tail:rhs_list)?

sym_expr
 = text
 / sym:nonterm_symbol  { return getNontermObject(sym) }
 / "{" &{return pushLhs(makeAnonId())} rhs:rhs "}" { return getNontermObject(popLhs()) }

text
 = "\\" escaped:[#\{\}\|=\@] tail:text? { return escaped + tail; }
 / "\\\\" tail:text? { return "\\\\" + tail; }
 / !"=>" "=" tail:text? { return "=" + tail; }
 / comment tail:text? { return tail; }
 / head:text_chars tail:text? { return head + tail; }

text_chars
 = chars:[^#\{\}\|=\@]+  { return chars.join(""); }


symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

spc
  = [ \t\n\r]
  / comment { return ""; }

comment
  = multi_line_comment
  / single_line_comment

multi_line_comment
  = "/*" (!"*/" source_character)* "*/"

multi_line_comment_no_line_terminator
  = "/*" (!("*/" / line_terminator) source_character)* "*/"

single_line_comment
  = "//" (!line_terminator source_character)*

line_terminator
  = [\n\r\u2028\u2029]

source_character
  = .
