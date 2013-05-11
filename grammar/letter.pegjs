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



start
 = body

nonterm_symbol
 = "@" symbol

rule
 = nonterm_symbol spc* "=" spc* rhs spc*

rhs
 = "{" hint:text "=>" rhs_list "}"
 / "{" rhs_list "}"

rhs_list
 = text_and_nonterms "|" rhs_list
 / text_and_nonterms

text_and_nonterms
 = head:text_char tail:text_and_nonterms? { return head + tail; }
 / nonterm_symbol text_and_nonterms?
 / rhs text_and_nonterms?

text
 = head:text_char tail:text? { return head + tail; }

text_char
 = !"=>" [^#\{\}\|]


symbol
  = first:[A-Za-z_] rest:symbol_tail? { return first + rest; }

symbol_tail
 = parent:symbol_chars "." child:symbol { return parent + "." + child; }
 / symbol_chars

symbol_chars
 = chars:[0-9A-Za-z_]* { return chars.join(""); }

spc
  = [ \t\n\r]
  / comment { return ""; }

comment
  = multi_line_comment
  / single_line_comment

multi_line_comment
  = "#/*" (!"*/" source_character)* "*/"

multi_line_comment_no_line_terminator
  = "#/*" (!("*/" / line_terminator) source_character)* "*/"

single_line_comment
  = "#//" (!line_terminator source_character)*

line_terminator
  = [\n\r\u2028\u2029]

source_character
  = .
