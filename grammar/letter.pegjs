// Example:

// @start = [Let us begin the letter.]{Sire, the people are [...|What to tell him?]{That they are revolting against his cruel authority. => sadly in open revolt.|That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}}

// Alternative:

// @start = [Let us begin the letter.]{Sire, the people are @people}
// @people = [...|What to tell him?]{That they are revolting against his cruel authority. => sadly in open revolt. | That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}

// If there is no prompt, then a suitable default will be used
// (derived from the nonterminal name, or generic "Please select..." text if the nonterminal is anonymous).


{
    var anonNonterms = 0;
    var lhsStack = [];
    var nonterms = [];
    var nontermObj = {};
    var defaultStart = "start";

    function pushLhs(sym) { lhsStack.push(sym); nonterms.push(sym); return true }
    function popLhs() { return lhsStack.pop() }
    function currentLhs() { return getNontermObject (lhsStack[lhsStack.length - 1]) }
    function addRule(hint,rhs,count) { currentLhs().addRule(hint,rhs,count); return true }

    function makeAnonId() { return ++anonNonterms; }
    function isAnonId (sym) { return /^[\d]+$/.test(sym) }
    function defaultPrompt (sym) { return isAnonId(sym) ? undefined : sym.replace(/_/g, ' ') }

    function setNontermProperties(placeholder,prompt,maxUsage,modifiers) {
	var lhs = currentLhs();
	if (typeof(placeholder) != 'undefined')
	    lhs.placeholder = placeholder;
	if (typeof(prompt) != 'undefined')
	    lhs.prompt = prompt;
	if (typeof(maxUsage) != 'undefined' && maxUsage > 0)
	    lhs.maxUsage = maxUsage;
	for (var i = 0; i < modifiers.length; ++i)
	    extend (lhs, modifiers[i]);
	return true;
    }

    function makeTerm(text) {
	return new LetterWriter.Term(text)
    }

    function getNontermObject(sym) {
	if (!(sym in nontermObj))
	    nontermObj[sym] = new LetterWriter.Nonterm(sym,defaultPrompt(sym));
	return nontermObj[sym];
    }

    function makeNontermReference(sym,placeholder,prompt) {
	return getNontermObject(sym).makeReference(placeholder,prompt)
    }

    function getStart() {
	var rhsSymbol = {};
	for (var lhs in nontermObj) {
	    for (var i = 0; i < nontermObj[lhs].rules.length; ++i) {
		var rhs = nontermObj[lhs].rules[i].rhs;
		for (var j = 0; j < rhs.length; ++j) {
		    var sym = rhs[j];
		    if (sym instanceof LetterWriter.NontermReference)
			rhsSymbol[sym.nonterminal.id] = true;
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
	    if (!(lhs in rhsSymbol) && lhs != defaultStart)
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
}

start
 = spc* rule*  { return [nontermObj, getStart()]; }

nonterm_symbol
 = "@" s:symbol  { return s; }

rule
 = mods:nonterm_modifier* lhs:nonterm_symbol spc* &{return pushLhs(lhs)}
   n:max_count? "=>" spc* pp:placeholder_prompt spc* &{return setNontermProperties(pp[0],pp[1],n,mods)}
   rhs_list spc* {popLhs()}

nonterm_modifier
 = "pause" spc*  { return { pause: true } }
 / "commit" spc* { return { commit: true } }

rhs_list
 = rhs (spc* "|" spc* rhs_list)?

rhs
 = "{" hc:hint_with_count symbols:sym_expr+ "}"  { addRule(hc[0],symbols,hc[1]) }

hint_with_count
 = text:text n:max_count spc* "=>" { return [text, n] }
 / text:text "=>" { return [text, undefined] }
 / { return ["", undefined] }

max_count
 = "[" spc* "most" spc+ n:positive_integer spc* "]" spc*  { return n }
 / "[" spc* "once" spc* "]" spc*  { return 1 }
 / "[" spc* "twice" spc* "]" spc*  { return 2 }
 / "[" spc* "thrice" spc* "]" spc*  { return 3 }

positive_integer
 = h:[1-9] t:[0-9]* { t.unshift(h); return parseInt (t.join(""), 10); }

sym_expr
 = pp:placeholder_prompt spc* sym:nonterm_or_anon  { return makeNontermReference(sym,pp[0],pp[1]) }
 / text:text  { return makeTerm(text) }

nonterm_or_anon
 = nonterm_symbol
 / "{" &{return pushLhs(makeAnonId())} rhs_list "}"  { return popLhs(); }

placeholder_prompt
 = "[" placeholder:text "|" prompt:text "]" { return [placeholder, prompt]; }
 / "[" prompt:text "]" { return [undefined, prompt]; }
 / { return [undefined, undefined]; }

text
 = "\\" escaped:[#\[\]\{\}\|=\@] tail:text? { return escaped + tail; }
 / "\\\\" tail:text? { return "\\\\" + tail; }
 / !"=>" "=" tail:text? { return "=" + tail; }
 / comment tail:text? { return tail; }
 / head:text_chars tail:text? { return head + tail; }

text_chars
 = chars:[^#\[\]\{\}\|=\@]+  { return chars.join(""); }

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
