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

  function gotoIfDefined(x) {
      return "(typeof(" + x + ") === 'undefined' ? [] : [\"\", " + x + "])";
  }

  function gosubWithContinuation(subroutine,continuation) {
      return "(function(){funkscene.sceneDeque.push(" + continuation + ");return(" + subroutine + ")();})";
  }

  var oneTimeCount = 0;
  var oneTimeEventPrefix = "once";
  var cycleCount = 0;
  var cyclePrefix = "cycle";
}

start
  = body

body
  = page:named_scene rest:body? { return page + rest; }
  / scene:scene rest:body? { return scene + rest; }
  / c:qualified_choose_expr rest:body? { return c + rest; }
  / code:code rest:body? { return code + rest; }

named_scene
  = "#PAGE" spc name:symbol spc scene:scene
   { return name + " = " + scene + ";\n"; }

scene
 = "#SCENE" single_spc s:scene_body endscene  { return s; }
 / "#("     single_spc s:scene_body "#)"      { return s; }

scene_body
 = incl:include* scene_desc:nonempty_quoted_text choices:conjunctive_choice_list cont:explicit_or_implicit_continuation
  { return sceneFunction (cont, incl, scene_desc, choices); }
 / incl:include* scene_desc:nonempty_quoted_text choices:choice_list
  { return sceneFunction (undefined, incl, scene_desc, choices); }

include
 = scene_desc:quoted_text? "#INCLUDE" spc included:symbol_or_scene { return [scene_desc,included]; }

conjunctive_choice_list
 = "#INPUT" single_spc prompt:quoted_text "#TO" single_spc var_name:symbol spc target:goto_clause_or_continuation
    { return ["[" + prompt + ", " + target + ", \"" + var_name + "\"]"]; }
 / qualified_choose_expr+

choice_list
 = conjunctive_choice_list
 / target:goto_clause { return ["[\"\", " + target + "]"]; }
 / "#OVER" spc { return []; }
 / { return [gotoIfDefined("defaultContinuation")]; }

explicit_or_implicit_continuation
 = basic_goto_clause
 / scene_body

basic_goto_clause
 = "#GOTO" spc target:symbol_or_scene spc  { return target; }

goto_clause
 = basic_goto_clause
 / "#GOSUB" spc gosub:symbol_or_scene spc target:goto_clause_or_continuation
   { return gosubWithContinuation(gosub,target); }
 / "#GOSUB" spc gosub:symbol_or_scene spc
   { return gosubWithContinuation(gosub,"defaultContinuation"); }
 / "#CONTINUE" spc
   { return "funkscene.continuationScene()"; }
 / "#BACK" spc
   { return "funkscene.previousScene"; }

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
  { var v = "funkscene.namedEventCount[\"" + tag + "\"]";
    c[1] = "(function(){if(typeof " + v + " === 'undefined'){" + v + "=0}" + v + "++;return (" + c[1] + ")();})";
    return "(" + v + " > 0) ? [] : " +
     (((typeof cond === 'undefined') || cond.length == 0) ? ("[" + c + "]") : ("((" + cond + ") ? [" + c + "] : [])")); }

onetime_tag_expr
 = "#AS" spc tag:symbol spc { return tag; }
 / "#ONCE" spc { return oneTimeEventPrefix + (++oneTimeCount); }

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

scene_deque
  = "#STACK" spc s:symbol_or_scene spc { return "funkscene.sceneDeque.push(" + s + ");"; }
  / "#QUEUE" spc s:symbol_or_scene spc { return "funkscene.sceneDeque.unshift(" + s + ");"; }
  / "#FLUSH" spc                       { return "funkscene.sceneDeque = [];"; }

wrapped_scene_deque
  = s:scene_deque  { return "(function(){" + s + ";return\"\";})()"; }

spc
  = single_spc+

single_spc
  = [ \t\n\r]

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

code
  = "##" tail:code? { return "#" + tail; }
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
  / "#{" code:code "#}" tail:text? { return "\" + (function(){return\"\"})((function(){" + code + "})()) + \"" + tail; }
  / "#[" expr:code "#]" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#EVAL" spc expr:code "#TEXT" single_spc tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / c:cycle tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / s:wrapped_scene_deque tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

hash_rank
 = "#!" / "#0" / "#1" / "#2" / "#3" / "#4" / "#5" / "#6" / "#7" / "#8" / "#9"

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
