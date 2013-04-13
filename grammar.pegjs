start
  = body

body
  = scene:named_scene rest:body { return scene + rest; }
  / head:code rest:body { return head + rest; }
  / code

named_scene
  = "#PAGE" spc name:symbol spc scene:scene
 { return name + " = " + scene + ";\n"; }

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

scene
  = "#SCENE" spc scene_desc:quoted_text choices:choice* endscene
 { return "function() {\n\treturn [" + scene_desc + ",\n\t[" + choices.join(",\n\t") + "]]; }\n"; }

choice
 = "#CHOOSE" choice_desc:quoted_text "#FOR" spc target:symbol spc
 { return "[" + choice_desc + "," + target + "]"; }

endscene
  = "#ENDSCENE"
  / "#END"

spc
  = [ \t\n\r]*

quoted_text
  = text:text { return '"' + text + '"'; }

code
  = "##" tail:code? { return "#" + tail; }
  / head:code_chars tail:code? { return head + tail; }

code_chars
  = chars:[^#]+ { return chars.join(""); }

text
  = "##" tail:text? { return "#" + tail; }
  / '"' tail:text? { return '\\"' + tail; }
  / "\n" tail:text? { return '\\n' + tail; }
  / head:text_chars tail:text? { return head + tail; }

text_chars
  = chars:[^#\"\n]+ { return chars.join(""); }
