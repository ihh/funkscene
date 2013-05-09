{
    // Warning: duplicated code (also found in fs.pegjs)
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

    var nodeName = {};  // indexed by node ID
    var nodeId = {};  // indexed by node name
    var sceneText = {};  // indexed by node ID
    var edges = [];
    var canGoBack = {};

    if (FunkScene.debugging())
	FunkScene.debug.nodeName = nodeName;

    var continuationIndex = {};
    function defaultContinuation() { return currentScene() + "+"; }

    function addEdge(node1,node2,props) {
	if (typeof(node1) != 'undefined' && typeof(node2) != 'undefined')
	    edges.push ([node1,node2,props]);
    }

    function sceneFunction(continuation,includes,scene_desc,choices) {
	var source = currentScene();
	var defCon = defaultContinuation();  // DefCon!
	if (typeof continuation != 'undefined') {
	    continuationIndex[defCon] = continuation;
	}
	var include_spacer = "";
	if (typeof(includes) != 'undefined') {
            for (var i = 0; i < includes.length; ++i) {
		var text = includes[i][0], incl = includes[i][1];
		addEdge (source, incl, {choiceType:"include",label:"#INCLUDE"});
		include_spacer += text;
	    }
	}
	sceneText[source] = include_spacer + scene_desc;
	for (var i = 0; i < choices.length; ++i) {
	    var choice = choices[i][0];
	    var target = choices[i][1];
	    var props = { choiceType: choices.length>1 ? "choice" : "goto" };
	    if (choice && choice.length)
		props.label = choice;
	    if (typeof target == 'undefined')
		target = defCon;
	    addEdge (source, target, props);
	}
	return currentScene();
    }

    function makeMinigameSceneFunction(intro,cazoo) {
	// FIXME: should parse cazoo to extract target scenes
	return currentScene();
    }

    function makeGoto (target) {
	return ["#GOTO", target];
    }

    function gotoIfDefined(x) {
	return makeGoto(x);
    }

    function continueIfDefined() {
	return gotoIfDefined (defaultContinuation());
    }

    function gosubWithContinuation(subroutine,continuation) {
	addEdge (currentScene(), continuation, {choiceType:"continue"});
	return subroutine;
    }

    function gosubWithDefaultContinuation(subroutine) {
	return gosubWithContinuation(subroutine,defaultContinuation());
    }

    function makeAssignment(name,scene) {
	nodeName[scene] = name;
	nodeId[name] = scene;
	return scene;
    }

    function makeInput(prompt,target,var_name) {
	return [[prompt,target]];
    }

    function makeInlineConditional(cond,true_val,false_val) {
	return "`(" + cond + " ?` " + true_val + " `:`" + false_val + "`)";
    }

    function makeConditional(cond,true_val,false_val) {
	return makeInlineConditional(cond,true_val,false_val);
    }

    function isContinuationNode(id) {
	return id.length > 0 && id.charAt(id.length-1) == "+";
    }

    function makeGEXF() {
	var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	xml += "<gexf>\n";
	xml += "<graph type=\"static\" defaultedgetype=\"directed\">\n";
	xml += "<attributes>\n";
	xml += "<attribute id=\"File\" type=\"string\"/>\n";
	xml += "<attribute id=\"Line\" type=\"integer\"/>\n";
	xml += "<attribute id=\"Column\" type=\"integer\"/>\n";
	xml += "<attribute id=\"Text\" type=\"string\"/>\n";
	xml += "<attribute id=\"Bug\" type=\"string\"/>\n";
	xml += "</attributes>\n";

	// nodes
	xml += "<nodes>\n";
	// first the nodes with definitions
	var definedNode = {};
	var x = 0, y = 0;
	for (var i = 0; i < nodes.length; ++i) {
	    var id = nodes[i];
	    var label = id in nodeName ? nodeName[id] : (nodeName[id] = id);
	    // check if id ends in a "+" (default continuation); if so, and it's not defined, skip it
	    if (!isContinuationNode(id) && !FunkScene.isSpecialNode(label)) {
		xml += "<node id=\"" + id + "\" label=\"" + label + "\">\n";
		xml += "<attvalues>\n";
		xml += "<attvalue for=\"File\" value=\"" + FunkScene.lastLoadedFile + "\"/>";
		xml += "<attvalue for=\"Line\" value=\"" + sceneLine[id] + "\"/>";
		xml += "<attvalue for=\"Column\" value=\"" + sceneColumn[id] + "\"/>";
		xml += "<attvalue for=\"Text\" value=\"" + sceneText[id] + "\"/>";
		xml += "</attvalues>\n";
		if (label == "start") {
		    xml += "<color r=\"0\" g=\"128\" b=\"0\"/>\n";
		} else if (id != label) {
		    xml += "<color r=\"0\" g=\"0\" b=\"128\"/>\n";
		} else {
		    xml += "<color r=\"0\" g=\"0\" b=\"0\"/>\n";
		}
		xml += "<size value=\"2\"/>\n";
		xml += "<x value=\"" + ++x + "\"/>\n";
		xml += "<y value=\"" + ++y + "\"/>\n";
		xml += "</node>\n";
		definedNode[id] = 1;
		definedNode[label] = 1;
	    }
	}

	// now the "loose end" nodes, that are referred to but never defined
	var looseEndNode = {};
	for (var i = 0; i < edges.length; ++i) {
	    var id = edges[i][1];
	    if (!((id in definedNode) || (id in looseEndNode) || isContinuationNode(id))) {
		xml += "<node id=\"" + id + "\" label=\"" + id + "\">\n";
		xml += "<attvalues>\n";
		xml += "<attvalue for=\"Bug\" value=\"Loose End\"/>";
		xml += "</attvalues>\n";
		xml += "<color r=\"255\" g=\"0\" b=\"0\"/>\n";
		xml += "<size value=\"4\"/>\n";
		xml += "<x value=\"" + ++x + "\"/>\n";
		xml += "<y value=\"" + ++y + "\"/>\n";
		xml += "</node>\n";
		looseEndNode[id] = 1;
	    }
	}
	xml += "</nodes>\n";

	// record loose ends
	if (FunkScene.debugging()) {
	    FunkScene.debug.looseEnds = Object.keys (looseEndNode);
	    FunkScene.debug.looseEndHtml = "Loose ends: " + FunkScene.debug.looseEnds.length + "<p>\n"
		+ "<i><font color=\"red\">" + FunkScene.debug.looseEnds.join(", ") + "</font></i>";
	}

	// edges
	xml += "<edges>\n";
	var edgeId = 0;
	function addEdge (source, target, props) {
	    if (source in nodeId) source = nodeId[source];
	    if (target in nodeId) target = nodeId[target];
	    if (!isContinuationNode(source) && !isContinuationNode(target)) {
		xml += "<edge id=\"" + edgeId++ + "\" source=\"" + source + "\" target=\"" + target + "\"";
		if ("choiceType" in props) xml += " choicetype=\"" + props.choiceType + "\"";
		if ("label" in props) xml += " label=\"" + props.label + "\"";
		xml += "/>\n";
	    }
	};

	for (var i = 0; i < edges.length; ++i) {
	    var source = edges[i][0];
	    var target = edges[i][1];
	    var props = edges[i][2];
	    addEdge (source, target, props);
	    if (target in canGoBack)
		addEdge (target, source, {choiceType:"back", label:"#BACK"});
	}
	xml += "</edges>\n";
	xml += "</graph>\n";
	xml += "</gexf>\n";
//	console.log(xml);
	return xml;
    };
}

start
  = body  { return makeGEXF(); }

body
  = page:named_scene_assignment rest:body?
  / minigame:named_minigame_scene rest:body?
  / scene:scene rest:body?
  / c:qualified_choose_expr rest:body?
  / code:code rest:body?

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
  { return sceneFunction (cont[0], incl, scene_desc, choices) + cont[1]; }
 / incl:include* scene_desc:scene_text gosubs:gosub_chain cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, gosubs) + cont[1]; }
 / incl:include* scene_desc:scene_text cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, [makeGoto(defaultContinuation())]) + cont[1]; }
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
{ return [makeGoto(target), continueIfDefined()]; }  // both outcomes
 / q:qualified_choose_expr+
{ return q.concat.apply (q.shift(), q); }

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
   { return defaultContinuation(); }
 / "#BACK" spc
   { ++canGoBack[currentScene()]; return undefined; }

gosub_clause
 = "#GOSUB" spc+ subr:symbol_or_scene spc+ { return subr; }

goto_clause_or_continuation
 = goto_clause
 / scene_body

symbol_or_scene
  = "#CURRENT"   { return currentScene(); }
  / "#PREVIOUS"  { ++canGoBack[currentScene()]; return undefined; }
  / '(' expr:balanced_code ')' { return expr; }
  / symbol
  / scene

choice
 = "#CHOOSE" spc+ choice_desc:nonempty_quoted_text "#FOR" spc+ target:symbol_or_scene spc
 { return [choice_desc, target]; }

choose_expr
 = c:choice
  { return c; }
 / "#SECRETLY" spc+ expr:if_expr c:choice
  { return c; }  // FIXME: differently styled edge?
 /  expr:if_expr c:choice
  { return c; }  // FIXME: differently styled edge?

qualified_choose_expr
 = c:choose_expr spc* { return [c]; }
 / onetime_choose_cycle
 / tag:onetime_tag_expr cond:if_expr? c:choice spc*
  { return [c]; }  // FIXME: differently styled edge?
 / c:choose_cycle

onetime_tag_expr
 = "#AS" spc+ tag:symbol spc+
 / "#ONCE" spc+

onetime_choose_cycle
  = "#ONCE" spc+ c:begin_choose_cycle spc+ cycles:choose_cycle_list "#STOP" spc*
  { return cycles; }

choose_cycle
  = c:begin_choose_cycle spc+ cycles:choose_cycle_list loop_flag:end_cycle spc*
  { return cycles; }

begin_choose_cycle
  = "#ROTATE(" spc* c:symbol spc* ")"
  / "#ROTATE"

choose_cycle_list
  = head:choose_expr spc* ("#NEXT" spc*)? tail:choose_cycle_list  { return [head].concat (tail); }
  / last:choose_expr spc*  { return [last]; }

inc_event_count
 = "#ACHIEVE" spc+ tag:symbol

reset_event_count
 = "#FAIL" spc+ tag:symbol

query_event_count
 = "#ACHIEVED" spc+ tag:symbol

status_badges
 = badges:status_badge+

status_badge
 = "#SHOW" spc+ icon:icon_filename spc+ "#BADGE" spc text:nonempty_quoted_text expr:status_if_expr spc

status_if_expr
 = "#IF" spc expr:status_condition
 / "#NOW"

icon_filename
  = chars:[A-Za-z0-9\-_]+

meter_bars
 = bars:meter_bar+

meter_bar
 = "#BAR" label:quoted_text "#VALUE" spc+ expr:balanced_code max:meter_bar_max_clause? units:meter_bar_unit_clause color:meter_bar_color_clause? "#ENDBAR" spc

meter_bar_max_clause
 = "#MAX" spc+ expr:balanced_code

meter_bar_unit_clause
 = "#UNITS/" units:text
 / "#UNITS" spc+ units:text
 /

meter_bar_color_clause
 = "#COLOR" spc+ color:meter_bar_color spc+

meter_bar_color = "green" / "orange" / "red" / "purple" / "blue" / "yellow" / "pink" / "gray"

status_condition
 = expr:balanced_code "#NOW"
 / expr:balanced_code "#EVER"
 / expr:balanced_code

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
{ addEdge(currentScene(),target,{choiceType:"goto"}); return text; }
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
  { return "(" + cycles.join(" | ") + ")"; }

cycle_list
  = head:postponed_quoted_text "#NEXT" spc tail:cycle_list  { return [head].concat (tail); }
  / last:postponed_quoted_text  { return [last]; }

begin_cycle
  = "#CYCLE(" spc* c:symbol spc* ")"   { return c; }
  / "#CYCLE"  { return cyclePrefix + (++cycleCount); }

end_cycle
  = "#LOOP"
  / "#STOP"

scene_scheduling_statement
    = "#STACK" spc+ s:symbol_or_scene spc+ { addEdge(currentScene(),s,{choiceType:"stack"}); }
    / "#QUEUE" spc+ s:symbol_or_scene spc+ { addEdge(currentScene(),s,{choiceType:"queue"}); }
    / "#FLUSH" spc+

spc
  = [ \t\n\r]
  / comment

symbol
  = first:[A-Za-z_] rest:symbol_tail? { return first + rest; }

symbol_tail
 = parent:symbol_chars "." child:symbol { return parent + "." + child; }
 / symbol_chars

symbol_chars
 = chars:[0-9A-Za-z_]* { return chars.join(""); }

balanced_code
  = "##" tail:balanced_code? { return "#" + tail; }
  / c:inc_event_count tail:balanced_code? { return tail; }
  / c:reset_event_count tail:balanced_code? { return tail; }
  / c:query_event_count tail:balanced_code? { return tail; }
  / "(" inside:balanced_code ")" tail:balanced_code? { return "(" + inside + ")" + tail; }
  / "{" inside:balanced_code "}" tail:balanced_code? { return "{" + inside + "}" + tail; }
  / "[" inside:balanced_code "]" tail:balanced_code? { return "[" + inside + "]" + tail; }
  / head:balanced_code_chars tail:balanced_code? { return head + tail; }

balanced_code_chars
  = chars:[^#(){}\[\]]+ { return chars.join(""); }

code
  = "##" tail:code? { return "#" + tail; }
  / c:inc_event_count tail:code? { return tail; }
  / c:reset_event_count tail:code? { return tail; }
  / c:query_event_count tail:code? { return tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

statement
 = head:code ";" spc* { return head + ";"; }
 / head:code spc* { return head + ";"; }

statements
 = s:statement+ { return s.join(""); }

postponed_quoted_text
 = text:quoted_text

nonempty_quoted_text
 = text:text

quoted_text
 = nonempty_quoted_text

text
  = "\\#" tail:text? { return tail; }
  / "\\\\" tail:text? { return tail; }
  / comment tail:text? { return tail; }
  / rank:hash_rank tail:text? { return rank + tail; }
  / "#$" v:symbol tail:text? { return "$" + v + tail; }
  / "#[" expr:balanced_code "#]" tail:text? { return tail; }
  / "#{" code:statements "#}" tail:text? { return tail; }
  / cond:inline_if_then_else tail:text? { return tail; }
  / "#EVAL" expr:balanced_code "#TEXT" tail:text? { return tail; }
  / "#INCLUDE" spc+ s:symbol tail:text? { return tail; }
  / c:cycle tail:text? { return c + tail; }
  / s:scene_scheduling_statement tail:text? { return tail; }
  / c:inc_event_count tail:text? { return tail; }
  / c:reset_event_count tail:text? { return tail; }
  / '"' tail:text? { return "'" + tail; }
  / "\n" tail:text? { return " " + tail; }
  / head:text_chars tail:text? { return head + tail; }
  / h:hash_run tail:text? { return h + tail; }

scene_text
  = "\\#" tail:scene_text?  { return "#" + tail; }
  / "\\\\" tail:scene_text?  { return "\\\\" + tail; }
  / comment tail:scene_text?  { return tail; }
  / rank:hash_rank tail:scene_text?  { return hash_rank + tail; }
  / "#$" v:symbol tail:scene_text?  { return "`" + v + "`" + tail; }
  / "#[" expr:balanced_code "#]" tail:scene_text?   { return "`" + expr + "`" + tail; }
  / "#{" code:statements "#}" tail:scene_text?   { return tail; }
  / cond:if_then_else tail:scene_text?  { return tail; }
  / "#EVAL" expr:balanced_code "#TEXT" tail:scene_text?  { return tail; }
  / c:cycle tail:scene_text?  { return c + tail; }
  / s:scene_scheduling_statement tail:scene_text?  { return tail; }
  / c:inc_event_count tail:scene_text?  { return tail; }
  / c:reset_event_count tail:scene_text?  { return tail; }
  / s:status_badges tail:scene_text?  { return tail; }
  / m:meter_bars tail:scene_text?  { return tail; }
  / "#TITLE" spc+ t:nonempty_quoted_text "#ENDTITLE" tail:scene_text?  { return tail; }
  / "#BUTTON" spc+ b:nonempty_quoted_text "#ENDBUTTON" tail:scene_text?  { return tail; }
  / "\"" tail:scene_text? { return "'" + tail; }
  / "\n" spc* tail:scene_text?  { return "\n" + tail; }
  / head:text_chars tail:scene_text?  { return head + tail; }
  / h:hash_run tail:scene_text?  { return h + tail; }

hash_run
 = h:[#] s:encoded_spc { return h + s; }
 / h1:[#] h2:[#]+ { return h1 + h2.join(""); }

encoded_spc
 = " "
 / [\t]
 / [\n]
 / [\r]

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
 = c:cazoo_code

cazoo_code
  = "\\#" tail:cazoo_code?
  / "\\\\" tail:cazoo_code?
  / rank:hash_rank tail:cazoo_code?
  / "#$" v:symbol tail:cazoo_code?
  / "#[" expr:balanced_code "#]" tail:cazoo_code?
  / "#{" code:statements "#}" tail:cazoo_code?
  / "#EVAL" expr:balanced_code "#TEXT" tail:cazoo_code?
  / '"' tail:cazoo_code?
  / "\n" tail:cazoo_code?
  / "(" inside:cazoo_code ")" tail:cazoo_code?
  / "{" inside:cazoo_code "}" tail:cazoo_code?
  / "[" inside:cazoo_code "]" tail:cazoo_code?
  / head:cazoo_code_chars tail:cazoo_code?
  / h:hash_run tail:cazoo_code?

cazoo_code_chars
  = chars:[^#(){}\[\]\\\"\n]+

cazoo_intro_text
  = head:quoted_text? "#TITLE" spc+ t:nonempty_quoted_text "#ENDTITLE" tail:quoted_text?
  / quoted_text
