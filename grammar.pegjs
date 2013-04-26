{
  function sceneFunction(scene_desc,choices,appends) {
      if (appends.length == 0) {
          if (typeof choices === 'string') {
              return "(function() {\n\treturn [" + scene_desc + ", " + choices + "]; })";
          } else {
              return "(function() {\n\treturn [" + scene_desc + ",\n\t[" + choices.join(",\n\t") + "]]; })";
          }
      } else {
	  var func =  "(function() {\n\tvar _text = " + scene_desc + ";\n\tvar _opts = [" + choices.join(",\n\t") + "];\n\tvar _appendix_text_opts;\n\t";
	  for (var i = 0; i < appends.length; ++i) {
	      func += "_appendix_text_opts = " + appends[i] + "();\n\t_text += _appendix_text_opts[0];\n\t_opts = _opts.concat (_appendix_text_opts[1]);\n\t";
	  }
	  func += "return [_text, _opts]; })";
      }
      return func;
  }
  var oneTimeCount = 0;
  var oneTimeEventPrefix = "once";
  var cycleCount = 0;
  var cyclePrefix = "cycle";
  var defaultContinuationStack = [];
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
  / "#(" single_spc s:scene_body "#)"         { return s; }

scene_body
 = scene_desc:quoted_text appends:append* choices:choice_list
 { return sceneFunction (scene_desc, choices, appends); }

append
 = "#APPEND" spc appendix:symbol_or_scene spc { return appendix; }

choice_list
 = "#INPUT" single_spc prompt:quoted_text? "#TO" single_spc var_name:symbol spc target:goto_clause
    { return ["[" + prompt + ", " + target + ", \"" + var_name + "\"]"]; }
 / target:goto_clause { return ["[\"\", " + target + "]"]; }
 / qualified_choose_expr+
 / "#OVER" spc { return []; }
 / { if (defaultContinuation.length == 0) { console.log ("Warning: empty choice list without implicit continuation"); return []; }
     return ["[\"\", " + defaultContinuation[defaultContinuation.length-1] + "]"]; }

goto_clause
 = "#GOTO" spc target:symbol_or_scene spc { return target; }
 / "#GOSUB" spc gosub:symbol_or_scene spc target:goto_clause
   { return "(function(){funkscene.sceneDeque.push(" + target + ");return(" + gosub + ")();})"; }
 / "#CONTINUE" spc { return "funkscene.continuationScene()"; }
 / "#BACK" spc { return "funkscene.previousScene"; }

symbol_or_scene
  = "#CURRENT" { return "funkscene.currentScene"; }
  / "#PREVIOUS" { return "funkscene.previousScene"; }
  / '(' expr:code ')' { return expr; }
  / symbol
  / scene

choice
 = "#CHOOSE" spc choice_desc:quoted_text "#FOR" spc target:symbol_or_scene spc
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

quoted_text
  = text:text? { return '"' + text + '"'; }

text
  = "##" tail:text? { return "#" + tail; }
  / "#$" v:symbol tail:text? { return "\" + " + v + " + \"" + tail; }
  / "#{" code:code "#}" tail:text? { return "\" + (function(){return\"\"})((function(){" + code + "})()) + \"" + tail; }
  / "#[" expr:code "#]" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#EVAL" spc expr:code "#TEXT" single_spc tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / c:cycle tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / s:wrapped_scene_deque tail:text? { return "\" + (" + c + ") + \"" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
