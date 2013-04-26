{
  function sceneFunction(continuation,includes,scene_desc,choices) {
      var f = "(function() {\n";
      if (typeof(continuation) != 'undefined') {
          f += "var defaultContinuation = function(){defaultContinuation=undefined;return(" + continuation + ")();};\n";
      }
      f += "var __t=\"\",__c=[],__tc;\n";
      if (typeof(includes) != 'undefined') {
          for (var i = 0; i < includes.length; ++i) {
	      var text = includes[i][0], incl = includes[i][1];
	      if (typeof(text) != 'undefined') { f += "__t+=" + text + ";\n"; }
	      if (typeof(incl) != 'undefined') { f += "__tc=(" + incl + ")();\n__t+=__tc[0];\n__c=__c.concat(__tc[1]);\n"; }
	  }
      }
      f += "__t+=" + scene_desc + ";\n";
      f += "__c=__c.concat(" + renderList(choices) + ");\n";
      f += "return [__t,__c];})";

      return f;
  }

  function renderList(x) {
      if (typeof x === 'string') {
          return x;
      } else {
          return "[" + x.join(",") + "]";
      }
  }

  function joinScenes(scenes) {
      return "(function(){return funkscene.joinScenes([" + scenes.join(",") + "]);})";	
  }

  function makeGoto (target) {
      return "[\"\", " + target + "]";
  }

  function gotoIfDefined(x) {
      return "(typeof(" + x + ") === 'undefined' ? [] : [\"\", " + x + "])";
  }

  function gosubWithContinuation(subroutine,continuation) {
      return "(function(){funkscene.sceneDeque.push(" + continuation + ");return(" + subroutine + ")();})";
  }

  function makeAssignment(name,scene) {
      return name + " = " + scene + ";\n";
  }

  function makeInput(prompt,target,var_name) {
      return ["[" + prompt + ", " + target + ", \"" + var_name + "\"]"];
  }

  function makeDummy(s) {
      return "(function(){" + s + ";return\"\";})()";
  }

  function evalOrNull(code) {
      return "(function(x){return typeof(x) === 'undefined' ? \"\" : x;})((function(){" + code + "})())";
  }

  function eventCounter(tag) {
      return "funkscene.namedEventCount[\"" + tag + "\"]";
  }

  function valueOrZero(v) {
      return "(typeof (" + v + ") === 'undefined' ? 0 : " + v + ")";
  }

  function incEventCount(tag) {
      var v = eventCounter(tag);
      return "(" + v + " = " + valueOrZero(v) + " + 1)";
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
  / scene:scene rest:body? { return scene + rest; }
  / c:qualified_choose_expr rest:body? { return c + rest; }
  / s:status_page rest:body? { return s + rest; }
  / code:code rest:body? { return code + rest; }

named_scene_assignment
  = "#PAGE" spc name:symbol spc scene:named_scene
   { return makeAssignment (name, scene); }

named_scene
 = "#SCENE" single_spc s:named_scene_body endscene  { return s; }
 / "#("     single_spc s:named_scene_body "#)"      { return s; }

inline_named_scene_assignment
 = "#PAGE" spc name:symbol spc scene:named_scene_body
   { return [name, makeAssignment (name, scene)]; }

named_scene_body
 = incl:include* scene_desc:quoted_text choices:conjunctive_choice_list cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, choices) + ";\n" + cont[1]; }
 / incl:include* scene_desc:quoted_text gosubs:gosub_chain cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, gosubs) + ";\n" + cont[1]; }
 / incl:include* scene_desc:quoted_text cont:inline_named_scene_assignment
  { return sceneFunction (cont[0], incl, scene_desc, [makeGoto("defaultContinuation")]) + ";\n" + cont[1]; }
 / scene_body

gosub_chain
 = subr:gosub_clause chain:gosub_chain  { return gosubWithContinuation(subr,chain); }
 / subr:gosub_clause                    { return gosubWithContinuation(subr,"defaultContinuation"); }

scene
 = "#SCENE" single_spc s:scene_body endscene  { return s; }
 / "#("     single_spc s:scene_body "#)"      { return s; }

scene_body
 = incl:include* scene_desc:quoted_text choices:conjunctive_choice_list cont:explicit_or_implicit_continuation
  { return sceneFunction (cont, incl, scene_desc, choices); }
 / incl:include* scene_desc:quoted_text choices:choice_list
  { return sceneFunction (undefined, incl, scene_desc, choices); }

include
 = scene_desc:quoted_text? "#INCLUDE" spc included:symbol_or_scene { return [scene_desc,included]; }

conjunctive_choice_list
 = "#INPUT" single_spc prompt:quoted_text "#TO" single_spc var_name:symbol spc target:goto_clause_or_continuation
    { return makeInput (prompt, target, var_name); }
 / qualified_choose_expr+

choice_list
 = conjunctive_choice_list
 / target:goto_clause { return [makeGoto (target)]; }
 / "#OVER" spc { return []; }
 / { return [gotoIfDefined ("defaultContinuation")]; }

explicit_or_implicit_continuation
 = basic_goto_clause
 / scene_body

basic_goto_clause
 = "#GOTO" spc target:symbol_or_scene spc  { return target; }

goto_clause
 = basic_goto_clause
 / gosub:gosub_clause target:goto_clause_or_continuation
   { return gosubWithContinuation(gosub,target); }
 / gosub:gosub_clause
   { return gosubWithContinuation(gosub,"defaultContinuation"); }
 / "#CONTINUE" spc
   { return "funkscene.continuationScene()"; }
 / "#BACK" spc
   { return "funkscene.previousScene"; }

gosub_clause
 = "#GOSUB" spc subr:symbol_or_scene spc { return subr; }

goto_clause_or_continuation
 = goto_clause
 / scene_body

symbol_or_scene
  = "#CURRENT" { return "funkscene.currentScene"; }
  / "#PREVIOUS" { return "funkscene.previousScene"; }
  / '(' expr:code ')' { return expr; }
  / symbol
  / scene

choice
 = "#CHOOSE" spc choice_desc:nonempty_quoted_text "#FOR" spc target:symbol_or_scene spc
 { return [choice_desc, target]; }

choose_expr
 = c:choice
  { return "[" + c + "]"; }
 / "#SECRETLY" spc "#IF" spc expr:code c:choice
  { return "((" + expr + ") ? [" + c + "] : [])"; }
 /  "#IF" spc expr:code c:choice
  { return "((" + expr + ") ? [" + c + "] : [" + c[0] + "])"; }

qualified_choose_expr
 = choose_expr
 / tag:onetime_tag_expr cond:if_expr? c:choice
  { var v = eventCounter(tag);
    c[1] = "(function(){" + incEventCount(tag) + ";return (" + c[1] + ")();})";
    return "(" + v + " > 0) ? [] : " +
     (((typeof cond === 'undefined') || cond.length == 0) ? ("[" + c + "]") : ("((" + cond + ") ? [" + c + "] : [])")); }

onetime_tag_expr
 = "#AS" spc tag:symbol spc { return tag; }
 / "#ONCE" spc { return oneTimeEventPrefix + (++oneTimeCount); }

inc_event_count
 = "#ACHIEVE" spc tag:symbol { return incEventCount (tag); }

query_event_count
 = "#ACHIEVED" spc tag:symbol { return valueOrZero (eventCounter (tag)); }

status_page
 = "#STATS" single_spc contents:quoted_text "#ENDSTATS"
   { return "funkscene.makeStatusPage = function() { return " + contents + "; };\n"; }

status_badge
 = "#SHOW" single_spc badge:nonempty_quoted_text "#IF" single_spc expr:status_condition spc
   { return "((" + expr + ") ? (" + badge + ") : \"\")"; }

meter_bars
 = bars:meter_bar+
 { return "\"<table class=\\\"meterTable\\\">\\n\" + " + bars.join(" + ") + " + \"</table>\""; }

meter_bar
 = "#BAR" label:quoted_text "#VALUE" spc expr:code "#COLOR" spc color:meter_bar_color spc "#ENDBAR" single_spc
   { return "\"<tr><td class=\\\"meterTableLabel\\\">\" + " + label + " + \"</td><td class=\\\"meterTableBar\\\">\" + funkscene.makeMeterBar(" + expr + ",\"" + color + "\") + \"</td></tr>\\n\""; }
 / "#BAR" label:quoted_text "#VALUE" spc expr:code "#ENDBAR" single_spc
   { return "\"<tr><td class=\\\"meterTableLabel\\\">\" + " + label + " + \"</td><td class=\\\"meterTableBar\\\">\" + funkscene.makeMeterBar(" + expr + ") + \"</td></tr>\\n\""; }

meter_bar_color = "green" / "orange" / "red"

status_condition
 = expr:code "#NOW"
   { return expr; }
 / expr:code "#EVER"
   { var tag = badgeEventPrefix + (++badgeCount);
     var counter = eventCounter (tag);
     return "(" + counter + " = " + valueOrZero(counter) + " || " + expr + ")"; }
 / expr:code
   { return expr; }

if_expr
 = "#IF" spc expr:code { return expr; }

endscene
  = "#ENDSCENE"
  / "#END"

cycle
  = c:begin_cycle single_spc cycles:cycle_list loop_flag:end_cycle
  { return "[" + cycles.join(",") + "][" + c + " = ((typeof(" + c + ") === 'undefined') ? 0 : (" + c + " >= " + (cycles.length - 1) + " ? " + (loop_flag ? 0 : (cycles.length - 1)) + " : " + c + " + 1))]"; }

cycle_list
  = head:postponed_quoted_text "#NEXT" single_spc tail:cycle_list  { return [head].concat (tail); }
  / last:postponed_quoted_text  { return [last]; }

begin_cycle
  = "#CYCLE(" spc? c:symbol spc? ")"   { return c; }
  / "#CYCLE"  { return cyclePrefix + (++cycleCount); }

end_cycle
  = "#LOOP" { return 1; }
  / "#STOP" { return 0; }

scene_scheduling_statement
  = "#STACK" spc s:symbol_or_scene spc { return "funkscene.sceneDeque.push(" + s + ");"; }
  / "#QUEUE" spc s:symbol_or_scene spc { return "funkscene.sceneDeque.unshift(" + s + ");"; }
  / "#FLUSH" spc                       { return "funkscene.sceneDeque = [];"; }

spc
  = single_spc+

single_spc
  = [ \t\n\r]

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

code
  = "##" tail:code? { return "#" + tail; }
  / c:inc_event_count tail:code? { return c + tail; }
  / c:query_event_count tail:code? { return c + tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

postponed_quoted_text
 = text:quoted_text { return "(function(){return" + text + ";})()"; }

nonempty_quoted_text
 = text:text { return '"' + text + '"'; }

quoted_text
 = nonempty_quoted_text
 / { return '""'; }

text
  = "##" tail:text? { return "#" + tail; }
  / rank:hash_rank tail:text? { return rank + tail; }
  / "#$" v:symbol tail:text? { return "\" + " + v + " + \"" + tail; }
  / "#{" code:code "#}" tail:text? { return "\" + " + evalOrNull(code) + " + \"" + tail; }
  / "#[" expr:code "#]" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#EVAL" spc expr:code "#TEXT" single_spc tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / c:cycle tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / s:scene_scheduling_statement tail:text? { return "\" + " + makeDummy(c) + " + \"" + tail; }
  / c:inc_event_count tail:text? { return "\" + " + makeDummy(c) + " + \"" + tail; }
  / s:status_badge tail:text? { return "\" + " + s + " + \"" + tail; }
  / s:meter_bars tail:text? { return "\" + " + s + " + \"" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

hash_rank
 = "#!" / "#0" / "#1" / "#2" / "#3" / "#4" / "#5" / "#6" / "#7" / "#8" / "#9"

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
