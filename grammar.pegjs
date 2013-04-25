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

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

scene
  = "#SCENE" spc scene_desc:quoted_text choices:choice_list appends:append* endscene
 { return sceneFunction (scene_desc, choices, appends); }
  / "#(" scene_desc:quoted_text choices:choice_list appends:append* "#)"
 { return sceneFunction (scene_desc, choices, appends); }

append
 = "#APPEND" spc appendix:symbol_or_scene spc { return appendix; }

choice_list
 = "#INPUT" single_spc prompt:text? "#TO" single_spc var_name:symbol spc target:goto_clause
    { return ["[\"" + prompt + "\", " + target + ", \"" + var_name + "\"]"]; }
 / target:goto_clause { return ["[\"\", " + target + "]"]; }
 / qualified_choose_expr*

goto_clause
 = "#GOTO" spc target:symbol_or_scene spc { return target; }
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
 / "#ONCE" spc { return "once" + (++oneTimeCount); }

if_expr
 = "#IF" spc expr:code { return expr; }

endscene
  = "#ENDSCENE"
  / "#END"

spc
  = single_spc+

single_spc
  = [ \t\n\r]

quoted_text
  = text:text { return '"' + text + '"'; }

code
  = "##" tail:code? { return "#" + tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

text
  = "##" tail:text? { return "#" + tail; }
  / "#$" v:symbol tail:text? { return "\" + " + v + " + \"" + tail; }
  / "#{" code:code "#}" tail:text? { return "\" + (function(){return\"\"})((function(){" + code + "})()) + \"" + tail; }
  / "#[" expr:code "#]" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#EVAL" spc expr:code "#TEXT" single_spc tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
