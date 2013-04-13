start
  = body

body
  = scene:named_scene rest:body { return scene + rest; }
  / head:code rest:body { return head + rest; }
  / code

code
  = "##" tail:code { return "#" + tail; }
  / head:[^#]+ tail:code { return head + tail; }
  / [^#]+

named_scene
  = "#PAGE" spc name:symbol spc scene:scene  { return "var " + name + " = " + scene + ";\n"; }

symbol
  = first:[A-Za-z_] rest:[0-9A-Za-z_]* { return first + rest.join(""); }

scene
  = "#SCENE" spc scene_desc:quoted_text choices:choice_list? endscene
 { return "function() {\n\treturn [" + scene_desc + ",\n\t[" + choices + "]]; }\n"; }

choice_list
 = head:choice tail:choice_list { return head + ",\n\t" + tail; }
 / choice

choice
 = "#CHOOSE" choice_desc:quoted_text "#FOR" spc target:symbol spc { return "[" + choice_desc + "," + target + "]"; }

endscene
  = "#ENDSCENE"
  / "#END" spc "SCENE"
  / "#END" spc "#SCENE"
  / "#END"

spc
  = [ \t\n\r]*

quoted_text
  = text:text { return '"' + text + '"'; }

text
  = "##" tail:text { return "#" + tail; }
  / '"' tail:text { return '\"' + tail; }
  / head:[^#\"]+ tail:text { return head + tail; }
  / chars:[^#\"]+ { return chars.join(""); }
