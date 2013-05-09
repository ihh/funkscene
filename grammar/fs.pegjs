{
    // Warning: duplicated code (also found in graph.pegjs)
    // The code & grammar must be exactly the same so that the node IDs match up (code smell....)
    var sceneStack = [];
    var sceneIndex = {};
    var sceneLine = {};
    var sceneColumn = {};

    var lastPageName;
    function setPageName(n) { lastPageName = n; return true; }
    function resetPageName() { lastPageName = undefined; return true; }

    function currentScene() { return sceneStack[sceneStack.length - 1]; }
    function startScene(l,c) {
	// for some reason, sceneFunction is getting called multiple times by the parser for the same scene
	// The line/column ID is a hacky workaround to ensure things only get defined once...
	// It also makes the node IDs more meaningful for debugging
	var lc = l + "." + c;
	var id;
	if (!sceneIndex[lc]) {
	    id = newNode(l,c);
	    sceneLine[id] = l;
	    sceneColumn[id] = c;
	    sceneIndex[lc] = id;
	} else
	    id = sceneIndex[lc];
	sceneStack.push(id);
	return true;
    }
    function endScene() { return sceneStack.pop(); return true; }

    var nodes = [];
    function newNode(l,c) {
	var n = typeof(lastPageName) == 'undefined' ? "scene" : lastPageName;
	n = (nodes.length + 1) + "(" + n + "," + l + "," + c + ")";
	nodes.push (n);
	return n;
    }

    // end of duplicated code

    function sceneFunction(continuation,includes,scene_desc,choices) {
	var f = "(function() {\n";
	if (FunkScene.debugging())
	    f += "\tFunkScene.locateDebugger(\"" + currentScene() + "\");\n";
	if (typeof(continuation) != 'undefined') {
            f += "var defaultContinuation = function(){defaultContinuation=undefined;return(" + continuation + ")();};\n";
	}
	f += "var __t=\"\",__c=[],__tc;\n";
	if (typeof(includes) != 'undefined') {
	    f += "FunkScene.disableDebugger();\n";
            for (var i = 0; i < includes.length; ++i) {
		var text = includes[i][0], incl = includes[i][1];
		if (typeof(text) != 'undefined') { f += text; }
		if (typeof(incl) != 'undefined') { f += "__tc=(" + incl + ")();\n__t+=__tc[0];\n__c=__c.concat(__tc[1]);\n"; }
	    }
	    f += "FunkScene.enableDebugger();\n";
	}
	f += scene_desc;
	f += "__c=__c.concat(" + renderList(choices) + ");\n";
	f += "return [__t,__c];})";

	return f;
    }

    function makeMinigameSceneFunction(intro,cazoo) {
	return "(function(){return function(callback){return FunkScene.runMinigame(" + intro + "," + cazoo + ",callback);}})";
    }

    function renderList(x) {
	if (typeof x === 'string') {
            return x;
	} else {
            return "[" + x.join(",") + "]";
	}
    }

    function joinScenes(scenes) {
	return "(function(){return FunkScene.joinScenes([" + scenes.join(",") + "]);})";	
    }

    function makeGoto (target) {
	return "[\"\", " + target + "]";
    }

    function gotoIfDefined(x) {
	return "(typeof(" + x + ") === 'undefined' ? [] : [\"\", " + x + "])";
    }

    function continueIfDefined() {
	return gotoIfDefined ("defaultContinuation");
    }

    function gosubWithContinuation(subroutine,continuation) {
	return "(function(){FunkScene.sceneDeque.push(" + continuation + ");return(" + subroutine + ")();})";
    }

    function gosubWithDefaultContinuation(subroutine) {
	return gosubWithContinuation(subroutine,"defaultContinuation");
    }

    function makeAssignment(name,scene) {
	return name + " = " + scene + ";\n";
    }

    function makeInput(prompt,target,var_name) {
	return ["[" + prompt + ", " + target + ", \"" + var_name + "\"]"];
    }

    function makeInlineConditional(cond,true_val,false_val) {
	return "((" + cond + ") ? (" + true_val + ") : (" + false_val + "))";
    }

    function makeConditional(cond,true_val,false_val) {
	return "if(" + cond + "){" + true_val + "}else{" + false_val + "}";
    }

    function makeCycle(cycle_var,cycles,loop_flag)
    {
	return "[" + cycles.join(",\n\t") + "][" + cycle_var + " = ((typeof(" + cycle_var + ") === 'undefined') ? 0 : (" + cycle_var + " >= " + (cycles.length - 1) + " ? " + (loop_flag ? 0 : (cycles.length - 1)) + " : " + cycle_var + " + 1))]";
    }

    function makeDummy(s) {
	return "(function(){" + s + ";return\"\";})()";
    }

    function eventCounter(tag) {
	return "FunkScene.namedEventCount[\"" + tag + "\"]";
    }

    function valueOrZero(v) {
	return "(typeof (" + v + ") === 'undefined' ? 0 : " + v + ")";
    }

    function incEventCount(tag) {
	var v = eventCounter(tag);
	return "(" + v + " = " + valueOrZero(v) + " + 1)";
    }

    function resetEventCount(tag) {
	var v = eventCounter(tag);
	return "(" + v + " = 0)";
    }

    function makeMeterBar(label,expr,max,units,color) {
	var func = "(function(){var level = " + expr + ";var max = ";
	if (typeof(max) == 'undefined' || max == "") {
      	    max = 1;
            func += "1";
	} else {
            func += max;
	    if (units.length > 0 && units.substring(0,1) == " ") {
		units = units.replace(/^\s?|\s*$/g,'')
		label += " + \"<br><small>(\" + level + \"" + units + ")</small>\"";
	    } else {
		label += " + \"<br><small>(\" + level + \"/\" + max + \"" + ")</small>\"";
  	    }
	}
	return func + ";return \"<tr><td class=\\\"meterTableLabel\\\">\" + " + label + " + \"</td><td class=\\\"meterTableBar\\\">\" + FunkScene.makeMeterBar(level/max," + color + ") + \"</td></tr>\\n\";})()";
    }

    function makeTable(classname,rows) {
	return "\"<p><table class=\\\"" + classname + "\\\">\\n\" + " + rows.join(" + ") + " + \"</table>\"";
    }

    function accumulate(expr,tail) {
	return "__t += " + expr + ";" + tail;
    }

    function accumulateQuoted(text,tail) {
	return "__t += \"" + text + "\";" + tail;
    }

    var iconPrefix = "img/icon/";
    var iconSuffix = ".svg";
    function makeIconText(icon,text) {
	return "\"<tr><td class=\\\"badge\\\"><img class=\\\"badgeIcon\\\" src=\\\"" + iconPrefix + icon + iconSuffix + "\\\"></td><td class=\\\"badgeText\\\">\" + " + text + " + \"</td></tr>\\n\"";
    }

    var oneTimeCount = 0;
    var oneTimeEventPrefix = "_oneTime";

    var badgeCount = 0;
    var badgeEventPrefix = "_badge";

    var cycleCount = 0;
    var cyclePrefix = "_cycle";
}

start
  = body

body
  = page:named_scene_assignment rest:body? { return page + rest; }
  / minigame:named_minigame_scene rest:body? { return minigame + rest; }
  / scene:scene rest:body? { return scene + rest; }
  / c:qualified_choose_expr rest:body? { return c + rest; }
  / code:code rest:body? { return code + rest; }

named_scene_assignment
  = "#PAGE" spc+ name:symbol spc+ &{return setPageName(name);} scene:named_scene &{return resetPageName();}
   { return makeAssignment (name, scene); }

named_scene
 = "#SCENE" spc &{return startScene(line,column);} s:named_scene_body "#ENDSCENE" &{return endScene();}  { return s; }
 / "#("     spc &{return startScene(line,column);} s:named_scene_body "#)"        &{return endScene();}  { return s; }

inline_named_scene_assignment
 = "#PAGE" spc+ name:symbol spc+ &{return setPageName(name);} scene:named_scene_body &{return resetPageName();}
   { return [name, makeAssignment (name, scene)]; }

named_scene_body
 = incl:include* scene_desc:scene_text choices:conjunctive_choice_list cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, choices) + ";\n" + cont[1]; }
 / incl:include* scene_desc:scene_text gosubs:gosub_chain cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, gosubs) + ";\n" + cont[1]; }
 / incl:include* scene_desc:scene_text cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, [makeGoto("defaultContinuation")]) + ";\n" + cont[1]; }
 / scene_body

gosub_chain
 = subr:gosub_clause chain:gosub_chain  { return gosubWithContinuation(subr,chain); }
 / subr:gosub_clause                    { return gosubWithDefaultContinuation(subr); }

scene
 = "#SCENE" spc &{return startScene(line,column);} s:scene_body "#ENDSCENE" &{return endScene();} { return s; }
 / "#("     spc &{return startScene(line,column);} s:scene_body "#)"        &{return endScene();} { return s; }

scene_body
 = incl:include* scene_desc:scene_text choices:conjunctive_choice_list cont:explicit_or_implicit_continuation
  { return sceneFunction (cont, incl, scene_desc, choices); }
 / incl:include* scene_desc:scene_text "#BREAK" spc cont:scene_body
  { return sceneFunction (cont, incl, scene_desc, [continueIfDefined()]); }
 / incl:include* scene_desc:scene_text choices:choice_list
  { return sceneFunction (undefined, incl, scene_desc, choices); }

include
 = scene_desc:scene_text? "#INCLUDE" spc+ included:symbol_or_scene { return [scene_desc,included]; }

conjunctive_choice_list
 = "#INPUT" spc prompt:quoted_text "#TO" spc var_name:symbol spc+ target:goto_clause_or_continuation
    { return makeInput (prompt, target, var_name); }
 / cond:if_expr target:basic_goto_clause
    { return ["((" + cond + ") ? (" + makeGoto(target) + ") : (" + continueIfDefined() + "))"]; }
 / qualified_choose_expr+

choice_list
 = conjunctive_choice_list
 / target:goto_clause { return [makeGoto (target)]; }
 / "#OVER" spc+ { return []; }
 / { return [continueIfDefined()]; }

explicit_or_implicit_continuation
 = basic_goto_clause
 / scene_body

basic_goto_clause
 = "#GOTO" spc+ target:symbol_or_scene spc+  { return target; }

goto_clause
 = basic_goto_clause
 / gosub:gosub_clause target:goto_clause_or_continuation
   { return gosubWithContinuation(gosub,target); }
 / gosub:gosub_clause
   { return gosubWithDefaultContinuation(gosub); }
 / "#CONTINUE" spc
   { return "FunkScene.continuationScene()"; }
 / "#BACK" spc
   { return "FunkScene.previousScene"; }

gosub_clause
 = "#GOSUB" spc+ subr:symbol_or_scene spc+ { return subr; }

goto_clause_or_continuation
 = goto_clause
 / scene_body

symbol_or_scene
  = "#CURRENT" { return "FunkScene.currentScene"; }
  / "#PREVIOUS" { return "FunkScene.previousScene"; }
  / '(' expr:balanced_code ')' { return expr; }
  / symbol
  / scene

choice
 = "#CHOOSE" spc+ choice_desc:nonempty_quoted_text "#FOR" spc+ target:symbol_or_scene spc
 { return [choice_desc, target]; }

choose_expr
 = c:choice
  { return "[" + c + "]"; }
 / "#SECRETLY" spc+ expr:if_expr c:choice
  { return "((" + expr + ") ? [" + c + "] : [])"; }
 /  expr:if_expr c:choice
  { return "((" + expr + ") ? [" + c + "] : [" + c[0] + "])"; }

qualified_choose_expr
 = choose_expr spc*
 / onetime_choose_cycle
 / tag:onetime_tag_expr cond:if_expr? c:choice spc*
  { var v = eventCounter(tag);
    c[1] = "(function(){" + incEventCount(tag) + ";return (" + c[1] + ")();})";
    return "(" + v + " > 0) ? [] : " +
     (((typeof cond === 'undefined') || cond.length == 0) ? ("[" + c + "]") : ("((" + cond + ") ? [" + c + "] : [])")); }
 / choose_cycle

onetime_tag_expr
 = "#AS" spc+ tag:symbol spc+ { return tag; }
 / "#ONCE" spc+ { return oneTimeEventPrefix + (++oneTimeCount); }

onetime_choose_cycle
  = "#ONCE" spc+ c:begin_choose_cycle spc+ cycles:choose_cycle_list "#STOP" spc*
  { cycles.push([]); return makeCycle (c, cycles, false); }

choose_cycle
  = c:begin_choose_cycle spc+ cycles:choose_cycle_list loop_flag:end_cycle spc*
  { return makeCycle (c, cycles, loop_flag); }

begin_choose_cycle
  = "#ROTATE(" spc* c:symbol spc* ")"   { return c; }
  / "#ROTATE"  { return cyclePrefix + (++cycleCount); }

choose_cycle_list
  = head:choose_expr spc* ("#NEXT" spc*)? tail:choose_cycle_list  { return [head].concat (tail); }
  / last:choose_expr spc*  { return [last]; }

inc_event_count
 = "#ACHIEVE" spc+ tag:symbol { return incEventCount (tag); }

reset_event_count
 = "#FAIL" spc+ tag:symbol { return resetEventCount (tag); }

query_event_count
 = "#ACHIEVED" spc+ tag:symbol { return valueOrZero (eventCounter (tag)); }

status_badges
 = badges:status_badge+
   { return makeTable ("badgeTable", badges); }

status_badge
 = "#SHOW" spc+ icon:icon_filename spc+ "#BADGE" spc text:nonempty_quoted_text expr:status_if_expr spc
   { return "((" + expr + ") ? (" + makeIconText(icon,text) + ") : \"\")"; }

status_if_expr
 = "#IF" spc expr:status_condition { return expr; }
 / "#NOW" { return 1; }

icon_filename
  = chars:[A-Za-z0-9\-_]+ { return chars.join(""); }

meter_bars
 = bars:meter_bar+
   { return makeTable ("meterTable", bars); }

meter_bar
 = "#BAR" label:quoted_text "#VALUE" spc+ expr:balanced_code max:meter_bar_max_clause? units:meter_bar_unit_clause color:meter_bar_color_clause? "#ENDBAR" spc
   { return makeMeterBar (label, expr, max, units, typeof(color) == 'undefined' ? "undefined" : ("\"" + color + "\"")); }

meter_bar_max_clause
 = "#MAX" spc+ expr:balanced_code { return expr; }

meter_bar_unit_clause
 = "#UNITS/" units:text { return " " + units; }
 / "#UNITS" spc+ units:text { return units; }
 / { return "\"\""; }

meter_bar_color_clause
 = "#COLOR" spc+ color:meter_bar_color spc+ { return color; }

meter_bar_color = "green" / "orange" / "red" / "purple" / "blue" / "yellow" / "pink" / "gray"

status_condition
 = expr:balanced_code "#NOW"
   { return expr; }
 / expr:balanced_code "#EVER"
   { var tag = badgeEventPrefix + (++badgeCount);
     var counter = eventCounter (tag);
     return "(" + counter + " = " + valueOrZero(counter) + " || " + expr + ")"; }
 / expr:balanced_code
   { return expr; }

if_expr
 = "#IF" spc+ expr:balanced_code { return expr; }

if_then_else
 = "#IF" spc+ cond:balanced_code then_else:if_body "#ENDIF" spc
   { return makeConditional(cond,then_else[0],then_else[1]); }

if_body
 = "#THEN" spc true_val:scene_text_or_goto false_val:else_clause
   { return [true_val, false_val]; }
 / "#THEN" spc true_val:scene_text_or_goto
   { return [true_val, "\"\""]; }

else_clause
 = "#ELSE" spc text:scene_text_or_goto
   { return text; }
 / "#ELSIF" spc+ cond:balanced_code then_else:if_body
   { return makeConditional(cond,then_else[0],then_else[1]); }

scene_text_or_goto
 = text:scene_text? target:goto_clause
   { return text + "return [__t,[" + makeGoto(target) + "]];"; }
 / scene_text

inline_if_then_else
 = "#IF" spc+ cond:balanced_code then_else:inline_if_body "#ENDIF" spc
   { return makeInlineConditional(cond,then_else[0],then_else[1]); }

inline_if_body
 = "#THEN" spc true_val:nonempty_quoted_text false_val:inline_else_clause
   { return [true_val, false_val]; }
 / "#THEN" spc true_val:nonempty_quoted_text
   { return [true_val, "\"\""]; }

inline_else_clause
 = "#ELSE" spc text:nonempty_quoted_text
   { return text; }
 / "#ELSIF" spc+ cond:balanced_code then_else:inline_if_body
   { return makeInlineConditional(cond,then_else[0],then_else[1]); }

cycle
  = c:begin_cycle spc cycles:cycle_list loop_flag:end_cycle
  { return makeCycle (c, cycles, loop_flag); }

cycle_list
  = head:postponed_quoted_text "#NEXT" spc tail:cycle_list  { return [head].concat (tail); }
  / last:postponed_quoted_text  { return [last]; }

begin_cycle
  = "#CYCLE(" spc* c:symbol spc* ")"   { return c; }
  / "#CYCLE"  { return cyclePrefix + (++cycleCount); }

end_cycle
  = "#LOOP" { return 1; }
  / "#STOP" { return 0; }

scene_scheduling_statement
  = "#STACK" spc+ s:symbol_or_scene spc+ { return "FunkScene.sceneDeque.push(" + s + ");"; }
  / "#QUEUE" spc+ s:symbol_or_scene spc+ { return "FunkScene.sceneDeque.unshift(" + s + ");"; }
  / "#FLUSH" spc+                       { return "FunkScene.sceneDeque = [];"; }

spc
  = [ \t\n\r]
  / comment { return ""; }

symbol
  = first:[A-Za-z_] rest:symbol_tail? { return first + rest; }

symbol_tail
 = parent:symbol_chars "." child:symbol { return parent + "." + child; }
 / symbol_chars

symbol_chars
 = chars:[0-9A-Za-z_]* { return chars.join(""); }

balanced_code
  = "##" tail:balanced_code? { return "#" + tail; }
  / c:inc_event_count tail:balanced_code? { return c + tail; }
  / c:reset_event_count tail:balanced_code? { return c + tail; }
  / c:query_event_count tail:balanced_code? { return c + tail; }
  / "(" inside:balanced_code ")" tail:balanced_code? { return "(" + inside + ")" + tail; }
  / "{" inside:balanced_code "}" tail:balanced_code? { return "{" + inside + "}" + tail; }
  / "[" inside:balanced_code "]" tail:balanced_code? { return "[" + inside + "]" + tail; }
  / head:balanced_code_chars tail:balanced_code? { return head + tail; }

balanced_code_chars
  = chars:[^#(){}\[\]]+ { return chars.join(""); }

code
  = "##" tail:code? { return "#" + tail; }
  / c:inc_event_count tail:code? { return c + tail; }
  / c:reset_event_count tail:code? { return c + tail; }
  / c:query_event_count tail:code? { return c + tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

statement
 = head:code ";" spc* { return head + ";"; }
 / head:code spc* { return head + ";"; }

statements
 = s:statement+ { return s.join(""); }

postponed_quoted_text
 = text:quoted_text { return "(function(){return" + text + ";})()"; }

nonempty_quoted_text
 = text:text { return '"' + text + '"'; }

quoted_text
 = nonempty_quoted_text
 / { return '""'; }

text
  = "\\#" tail:text? { return "#" + tail; }
  / "\\\\" tail:text? { return "\\\\" + tail; }
  / comment tail:text? { return tail; }
  / rank:hash_rank tail:text? { return rank + tail; }
  / "#$" v:symbol tail:text? { return "\" + " + v + " + \"" + tail; }
  / "#[" expr:balanced_code "#]" tail:text? { return "\" + " + expr + " + \"" + tail; }
  / "#{" code:statements "#}" tail:text? { return "\" + " + makeDummy(code) + " + \"" + tail; }
  / cond:inline_if_then_else tail:text? { return "\" + " + cond + " + \"" + tail; }
  / "#EVAL" expr:balanced_code "#TEXT" tail:text? { return "\" + " + expr + " + \"" + tail; }
  / "#INCLUDE" spc+ s:symbol tail:text? { return "\" + (" + s + "())[0] + \"" + tail; }
  / c:cycle tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / s:scene_scheduling_statement tail:text? { return "\" + " + makeDummy(s) + " + \"" + tail; }
  / c:inc_event_count tail:text? { return "\" + " + makeDummy(c) + " + \"" + tail; }
  / c:reset_event_count tail:text? { return "\" + " + makeDummy(c) + " + \"" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }
  / h:hash_run tail:text? { return h + tail; }

scene_text
  = "\\#" tail:scene_text? { return accumulateQuoted("#",tail); }
  / "\\\\" tail:scene_text? { return accumulateQuoted("\\\\",tail); }
  / comment tail:scene_text? { return tail; }
  / rank:hash_rank tail:scene_text? { return accumulateQuoted(rank,tail); }
  / "#$" v:symbol tail:scene_text? { return accumulate(v,tail); }
  / "#[" expr:balanced_code "#]" tail:scene_text? { return accumulate(expr,tail); }
  / "#{" code:statements "#}" tail:scene_text? { return code + tail; }
  / cond:if_then_else tail:scene_text? { return cond + tail; }
  / "#EVAL" expr:balanced_code "#TEXT" tail:scene_text? { return accumulate(expr,tail); }
  / c:cycle tail:scene_text? { return accumulate(c,tail); }
  / s:scene_scheduling_statement tail:scene_text? { return accumulate(s,tail); }
  / c:inc_event_count tail:scene_text? { return c + ";" + tail; }
  / c:reset_event_count tail:scene_text? { return c + ";" + tail; }
  / s:status_badges tail:scene_text? { return accumulate(s,tail); }
  / m:meter_bars tail:scene_text? { return accumulate(m,tail); }
  / "#TITLE" spc+ t:nonempty_quoted_text "#ENDTITLE" tail:scene_text?
     { return "document.title = " + t + ";" + tail; }
  / "#BUTTON" spc+ b:nonempty_quoted_text "#ENDBUTTON" tail:scene_text?
     { return "FunkScene.setContinueText(" + b + ");" + tail; }
  / "\"" tail:scene_text? { return accumulateQuoted ("\\\"", tail); }
  / "\n" tail:scene_text? { return accumulateQuoted ("\\n", tail); }
  / head:text_chars tail:scene_text? { return accumulateQuoted (head, tail); }
  / h:hash_run tail:scene_text? { return accumulateQuoted(h,tail); }

hash_run
 = h:[#] s:encoded_spc { return h + s; }
 / h1:[#] h2:[#]+ { return h1 + h2.join(""); }

encoded_spc
 = " "
 / [\t] { return "\\t"; }
 / [\n] { return "\\n"; }
 / [\r] { return "\\r"; }

hash_rank
 = "#!" / "#0" / "#1" / "#2" / "#3" / "#4" / "#5" / "#6" / "#7" / "#8" / "#9"

text_chars
  = chars:[^#\\\"\n]+ { return chars.join(""); }

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

named_minigame_scene
  = "#PAGE" spc+ name:symbol spc+ &{return setPageName(name);} "#SCENE" spc &{return startScene(line,column);} intro:cazoo_intro_text "#MINIGAME" spc cazoo:quoted_cazoo_code "#ENDSCENE" &{return endScene();} &{return resetPageName();}
    { return makeAssignment (name, makeMinigameSceneFunction(intro,cazoo)); }
  / "#PAGE" spc+ name:symbol spc+  &{return setPageName(name);} "#(" spc &{return startScene(line,column);} intro:cazoo_intro_text "#MINIGAME" spc cazoo:quoted_cazoo_code "#)" &{return endScene();}  &{return resetPageName();}
    { return makeAssignment (name, makeMinigameSceneFunction(intro,cazoo)); }

quoted_cazoo_code
 = c:cazoo_code { return '"' + c + '"'; }

cazoo_code
  = "\\#" tail:cazoo_code? { return "#" + tail; }
  / "\\\\" tail:cazoo_code? { return "\\\\" + tail; }
  / rank:hash_rank tail:cazoo_code? { return rank + tail; }
  / "#$" v:symbol tail:cazoo_code? { return "\" + " + v + " + \"" + tail; }
  / "#[" expr:balanced_code "#]" tail:cazoo_code? { return "\" + " + expr + " + \"" + tail; }
  / "#{" code:statements "#}" tail:cazoo_code? { return "\" + " + makeDummy(code) + " + \"" + tail; }
  / "#EVAL" expr:balanced_code "#TEXT" tail:cazoo_code? { return "\" + " + expr + " + \"" + tail; }
  / '"' tail:cazoo_code? { return '\\"' + tail; }
  / "\n" tail:cazoo_code? { return '\\n' + tail; }
  / "(" inside:cazoo_code ")" tail:cazoo_code? { return "(" + inside + ")" + tail; }
  / "{" inside:cazoo_code "}" tail:cazoo_code? { return "{" + inside + "}" + tail; }
  / "[" inside:cazoo_code "]" tail:cazoo_code? { return "[" + inside + "]" + tail; }
  / head:cazoo_code_chars tail:cazoo_code? { return head + tail; }
  / h:hash_run tail:cazoo_code? { return h + tail; }

cazoo_code_chars
  = chars:[^#(){}\[\]\\\"\n]+ { return chars.join(""); }

cazoo_intro_text
  = head:quoted_text? "#TITLE" spc+ t:nonempty_quoted_text "#ENDTITLE" tail:quoted_text?
     { return head + " + " + makeDummy("document.title = " + t + ";") + " + " + tail; }
  / quoted_text
