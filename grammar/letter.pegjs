// Example:

// @start = [Let us begin the letter.]{Sire, the people are [...|What to tell him?]{That they are revolting against his cruel authority. => sadly in open revolt.|That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}}

// Alternative:

// @start = [Let us begin the letter.]{Sire, the people are @people}
// @people = [...|What to tell him?]{That they are revolting against his cruel authority. => sadly in open revolt. | That they are delighted with his rule. => ever more enamored with your dazzling Majesty.}

// If there is no prompt, then a suitable default will be used
// (derived from the nonterminal name, or generic "Please select..." text if the nonterminal is anonymous).


{
    var params = [];
    var anonNonterms = 0;
    var lhsStack = [];
    var nonterms = [];
    var nontermObj = {};

    function extend(a,b) { return LetterWriter.extend(a,b) }

    function addParam(p,v,min,max) {
	if (/^not$/i.test(p))
	    throw "You cannot have a parameter called 'not', because 'not' is a reserved keyword. Can you use another parameter name?";
	params.push (new LetterWriter.Param(p,v,min,max))
	return true;
    }

    function pushLhs(sym) { lhsStack.push(sym); nonterms.push(sym); return true }
    function popLhs() { return lhsStack.pop() }
    function currentLhs() { return getNontermObject (lhsStack[lhsStack.length - 1]) }
    function addRule(hint,rhs,count) { currentLhs().addRule(hint,rhs,count); return true }

    function makeAnonId() { return ++anonNonterms; }
    function isAnonId (sym) { return /^[\d]+$/.test(sym) }
    function defaultPrompt (sym) { return isAnonId(sym) ? undefined : sym.replace(/_/g, ' ') }
    function defaultStart() { return LetterWriter.defaultStart() }

    function setNontermProperties(props) {
	var lhs = currentLhs();
	if ("placeholder" in props)
	    lhs.placeholder = props.placeholder;
	if ("prompt" in props)
	    lhs.prompt = props.prompt;
	if (("maxUsage" in props) && props.maxUsage > 0)
	    lhs.maxUsage = props.maxUsage;
	if ("modifiers" in props)
	    for (var i = 0; i < props.modifiers.length; ++i)
		extend (lhs, props.modifiers[i]);

	if (lhs.random) {
	    if (lhs.commit) {
		console.log ("In @" + lhs.id + ": can't commit at randomized choices. Clearing 'commit', keeping 'random'")
		lhs.commit = false
	    }
	    if (lhs.pause) {
		console.log ("In @" + lhs.id + ": can't pause at randomized choices. Clearing 'pause', keeping 'random'")
		lhs.pause = false
	    }
	}

	return true;
    }

    function makeTerm(text) {
	return new LetterWriter.Term(text)
    }

    function getNontermObject(sym) {
	if (!(sym in nontermObj))
	    nontermObj[sym] = new LetterWriter.Nonterm(sym,defaultPrompt(sym),isAnonId(sym));
	return nontermObj[sym];
    }

    function makeNontermReference(sym,props) {
	return getNontermObject(sym).makeReference(props).sanitizeQualifiers()
    }

    function getStart() {
	var rhsSymbol = {};
	for (var lhs in nontermObj) {
	    for (var i = 0; i < nontermObj[lhs].rules.length; ++i) {
		var rule = nontermObj[lhs].rules[i];
		var rhs = rule.rhs;
		for (var j = 0; j < rhs.length; ++j) {
		    var sym = rhs[j];
		    if (sym instanceof LetterWriter.NontermReference) {
			var id = sym.nonterminal.id;
			rhsSymbol[id] = true;
			// do some qualifier validation, now that all the nonterminal properties have been declared
			sym.sanitizeQualifiers()
		    }
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
	    if (!(lhs in rhsSymbol) && lhs != defaultStart())
		notOnRhs.push (lhs);
	}

	if (notOnRhs.length > 0)
	    console.log ("The following symbols are defined, but never used: " + notOnRhs.map(function(x){return"@"+x}).join(" "));

	var start;
	if (defaultStart() in nontermObj) {
	    if (notOnRhs.length > 0)
		console.log ("However, @" + defaultStart() + " is defined, so we're using that as the root.");
	    start = defaultStart();
	} else if (notOnRhs.length) {
	    start = notOnRhs[0];
	    if (notOnRhs.length == 1)
		console.log ("So, @" + start + " makes a natural choice for the start symbol. Use @" + defaultStart() + " to override.");
	    else
		console.log ("The first of these symbols to be defined was @" + start + " so we'll use that as the root.");
	} else if (nonterms.length) {
	    start = nonterms[0];
	    console.log ("The first symbol to be defined was @" + start + " so we'll use that as the root.");
	}

	return nontermObj[start];
    }
}

start
 = spc* statement*  { return { nonterm: nontermObj,
			       start: getStart(),
			       nonterms: nonterms.map(function(id){return nontermObj[id]}),
			       params: params } }

statement = param_decl / rule

param_decl
 = "param" spc+ param_list spc*

param_list
    = p:symbol spc* r:param_range spc* v:param_value spc*  &{return addParam(p,v,r[0],r[1])}  ("," spc* param_list)?

param_value
    = "=" spc* v:weight  { return v }
    / { return 0.5 }

param_range
    = "{" min:text "=>" max:text "}"  { return [min,max] }
    / { return [LetterWriter.defaultNever,LetterWriter.defaultAlways] }

nonterm_symbol
 = "@" s:symbol  { return s; }

rule
 = mods:nonterm_modifier* lhs:nonterm_symbol q:sym_modifiers spc* &{return pushLhs(lhs)}
   n:max_count? "=>" spc* pp:placeholder_prompt spc*
   &{return setNontermProperties(extend(extend({maxUsage:n,modifiers:mods},q),pp))}
   "{" rhs_list "}" spc* {popLhs()}

nonterm_modifier
 = "pause" spc*  { return { pause: true } }
 / "commit" spc* { return { commit: true } }
 / "random" spc* { return { random: true } }

rhs_list
 = rhs ("|" spc* rhs_list)?

rhs
 = hc:hint_with_count symbols:sym_expr* { addRule(hc[0],symbols,hc[1]) }

ui_rhs
 = symbols:sym_expr* { return symbols }

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
 = pp:placeholder_prompt sym:nonterm_or_anon q:sym_modifiers { return makeNontermReference(sym,extend(pp,q)) }
 / text:text  { return makeTerm(text) }

nonterm_or_anon
 = nonterm_symbol
 / "{" &{return pushLhs(makeAnonId())} rhs_list "}"  { return popLhs(); }

placeholder_prompt
 = "[" placeholder:text "|" prompt:text "]" spc* { return {placeholder:placeholder, prompt:prompt}; }
 / "[" prompt:text "]" spc* { return {prompt:prompt}; }
 / { return {}; }

sym_modifiers
 = p:pause_modifier c:commit_modifier  { return extend(p,c) }

pause_modifier
 = ";" { return { pause: true } }
 / "" { return {} }

commit_modifier
 = "!" { return { commit: true } }
 / "" { return {} }

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

// Used to parse "hints" for randomized nonterminals as probabilistic weights
sum_expr
    = l:product_expr spc* op:("+"/"-") spc* r:sum_expr
{ return new LetterWriter.ParamFunc ({l:l,r:r,op:op}) }
  / product_expr

product_expr
    = l:primary_expr spc* op:("*"/"/") spc* r:product_expr
{ return new LetterWriter.ParamFunc ({l:l,r:r,op:op}) }
    / ("!" spc* / ("not"i spc+)) l:product_expr
{ return new LetterWriter.ParamFunc ({op:"!",l:l}) }
  / primary_expr

primary_expr
    = n:weight  { return new LetterWriter.ParamFunc ({op:"#",value:n}) }
    / x:symbol  { return new LetterWriter.ParamFunc ({op:"?",param:x}) }
    / "(" spc* e:sum_expr spc* ")"  { return e; }

weight
 = n:[0-9]+ "%"           { return parseFloat (n.join("")) / 100; }
 / h:[0-9]* "." t:[0-9]+  { return parseFloat (h + "." + t.join("")); }
 / n:[0-9]+               { return parseFloat (n.join("")); }
