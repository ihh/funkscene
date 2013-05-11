// Example:

// @start = {Let us begin the letter. => Sire, the people are {What to tell him? => @revolting|@delighted}}
// @revolting = {That they are revolting against his cruel authority. => sadly in open revolt.}
// @delighted = {That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}

// Alternative:

// @start = {Let us begin the letter. => Sire, the people are @people_state}
// @people_state = {What to tell him? => @revolting|@delighted}

// If there is no hint, then a suitable default will be used
// (derived from the nonterminal name, or generic "Please select..." text if the nonterminal is anonymous).

// If a nonterminal is deterministic (has only one outgoing rule),
// its hint text will be retained but it will be automatically transformed,
// so programmer can use this to "override" default hint texts.


{
    var anonNonterms = 0;
    var lhsStack = [];
    var rules = {};
    var hint = {};
    var nonterms = [];
    var defaultStart = "start";

    function pushLhs(sym) { lhsStack.push(sym); rules[sym] = []; nonterms.push(sym); return true }
    function popLhs() { return lhsStack.pop() }
    function currentLhs() { return lhsStack[lhsStack.length - 1] }

    function addRule(rhs) { rules[currentLhs()].push(rhs); return true }
    function makeAnonId() { return ++anonNonterms; }
    function isAnonId(sym) { return /^[\d]+$/.test(sym) }
    function defaultHint(sym) { return isAnonId(sym) ? "Please choose an option..." : sym.replace(/_/g, ' ') }
    function makeSymbol(sym) { return { id: sym } }

    function getStart() {
	var rhsSymbol = {};
	for (var lhs in rules) {
	    for (var i = 0; i < rules[lhs].length; ++i) {
		var rhs = rules[lhs][i];
		for (var j = 0; j < rhs.length; ++j) {
		    var sym = rhs[j];
		    if (typeof(sym) == 'object')
			rhsSymbol[sym.id] = true;
		}
	    }
	}
	for (var sym in rhsSymbol) {
	    if (!(sym in rules)) {
		console.log ("Symbol @" + sym + " is never defined");
	    }
	}

	var notOnRhs = [];
	for (var lhs in rules) {
	    if (!(lhs in rhsSymbol))
		notOnRhs.push (lhs);
	}

	if (notOnRhs.length > 0)
	    console.log ("The following symbols are defined, but never used: " + notOnRhs.map(function(x){return"@"+x}).join(" "));

	var start;
	if (defaultStart in rules) {
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
}


start
 = spc* rule*  { return [rules, hint, getStart()]; }

nonterm_symbol
 = "@" s:symbol  { return s; }

rule
 = lhs:nonterm_symbol spc* &{return pushLhs(lhs)} "=" spc* "{" rhs:rhs "}" spc* {popLhs()}

rhs
 = h:text "=>" rhs_list  { hint[currentLhs()] = h; }
 / rhs_list  { var lhs = currentLhs(); hint[lhs] = defaultHint(lhs); }

rhs_list
 = rhs:sym_expr+ &{return addRule(rhs)} ("|" tail:rhs_list)?

sym_expr
 = text
 / sym:nonterm_symbol  { return makeSymbol(sym) }
 / "{" &{return pushLhs(makeAnonId())} rhs:rhs "}" { return makeSymbol(popLhs()) }

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
