{ function sceneFunction(scene_desc,choices)		
  { return "function() {\n\treturn [" + scene_desc + ",\n\t[" + choices.join(",\n\t") + "]]; }\n"; } }

start
  = body

body
  = page:named_scene rest:body { return page + rest; }
  / scene:scene rest:body { return scene + rest; }
  / head:code rest:body { return head + rest; }
  / code

named_scene
  = "#PAGE" spc name:symbol spc scene:scene
 { return name + " = " + scene + ";\n"; }

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

scene
  = "#SCENE" spc scene_desc:quoted_text choices:choice* endscene
 { return sceneFunction (scene_desc, choices); }
  / "#{" spc scene_desc:quoted_text choices:choice* "#}"
 { return sceneFunction (scene_desc, choices); }

symbol_or_scene
  = symbol
  / scene

choice
 = "#CHOOSE" choice_desc:quoted_text "#FOR" spc target:symbol_or_scene spc
 { return "[" + choice_desc + "," + target + "]"; }
 / "#SECRETLY" spc "#IF" spc expr:code "#CHOOSE" choice_desc:quoted_text "#FOR" spc target:symbol_or_scene spc
 { return "((" + expr + ") ? [" + choice_desc + "," + target + "] : [])"; }
 /  "#IF" spc expr:code "#CHOOSE" choice_desc:quoted_text "#FOR" spc target:symbol_or_scene spc
 { return "((" + expr + ") ? [" + choice_desc + "," + target + "] : [" + choice_desc + "])"; }

endscene
  = "#ENDSCENE"
  / "#END"

spc
  = [ \t\n\r]+

quoted_text
  = text:text { return '"' + text + '"'; }

code
  = "##" tail:code? { return "#" + tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

text
  = "##" tail:text? { return "#" + tail; }
  / "#{" expr:code "#}" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#CODE" expr:code "#TEXT" tail:text? { return "\" + (" + expr + ") + \"" + tail; }
  / "#(" statement:code "#)" tail:text? { statement; return tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
