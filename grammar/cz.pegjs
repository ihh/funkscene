{
}

start
 = spc* z:body { return z; }

body
 = s:statement spc* z:body { s(z); return z; }
 / s:statement
  { var z = new Cazoo.Zoo(); s(z); return z; }

statement
 = particle_decl
 / rule
 / param_decl
 / tool_decl
 / goal_decl
 / size_decl
 / init_block

spc
  = [ \t\n\r]

particle_decl
 = "type" spc+ n:symbol spc* "{" spc* p:particle_property_list spc* "}" spc* ";" spc*
 { return function(z){z.defineType(n,p);} }

symbol
 = h:[A-Za-z_] t:[0-9A-Za-z_]* { return h + t.join(""); }

particle_property_list
 = h:particle_property spc* "," spc* t:particle_property_list { return Cazoo.extend(t,h); }
 / particle_property

particle_property
 = p:icon_property          { return { icon: p }; }
 / p:neighborhood_property  { return { neighborhood: p }; }
 / p:isometric_property     { return { isometric: p }; }
 / p:rotates_property       { return { rotates: p }; }
 / p:sync_property          { return { sync: p }; }

icon_property
 = "icon" spc* ":" spc* p:image_path { return p; }

image_path
 = h:[A-Za-z0-9] t:[A-Za-z0-9/\-_]* { return h + t.join(""); }

neighborhood_property
 = "moore"   { return Cazoo.mooreHood; }
 / "neumann" { return Cazoo.neumannHood; }
 / "bishop"  { return Cazoo.bishopHood; }

isometric_property
 = "isometric" {return 1;}
 / "directed"  {return 0;}

rotates_property
 = "rotates" {return 1;}
 / "upright" {return 0;}

sync_property
 = "sync"  {return 1;}
 / "async" {return 0;}

rule
 = a:lhs_source spc+ b:lhs_target spc* "->" spc* c:rhs_source spc+ d:rhs_target spc* r:optional_rate_clause spc* ";"
 { return function(z) {
     z.initRules (a[0], b[0]);
     z.rule[a[0]][b[0]].push ([a,b,c,d,r]); }; }

lhs_source
 = symbol dir?

lhs_target
 = symbol_or_wild dir?

rhs_source
 = symbol_or_lhs_macro dir?

rhs_target
 = symbol_or_lhs_macro dir?

symbol_or_null = symbol / "_"

symbol_or_wild = symbol_or_null / "*"

symbol_or_lhs_macro = symbol_or_null / lhs_macro

lhs_macro = "$s" / "$t"

dir
 = "." d:compass_dir  {return d;}
 / "." d:relative_dir {return d;}
 / "." d:"*"          {return d;}

compass_dir = "nw" / "ne" / "se" / "sw" / "n" / "e" / "s" / "w"

relative_dir = "fl" / "fr" / "bl" / "br" / "f" / "b" / "l" / "r"

optional_rate_clause
 = ":" spc* r:sum_expr  { return r[0]; }
 /                      { return 1; }

sum_expr
  = l:product_expr spc* "+" spc* r:sum_expr      { return [function(z){return l[0](z) + r[0](z);}, Cazoo.extend(l[1],r[1])]; }
  / product_expr

product_expr
  = l:primary_expr spc* "*" spc* r:product_expr  { return [function(z){return l[0](z) * r[0](z);}, Cazoo.extend(l[1],r[1])]; }
  / l:primary_expr spc* "/" spc* r:product_expr  { return [function(z){return l[0](z) / r[0](z);}, Cazoo.extend(l[1],r[1])]; }
  / primary_expr

primary_expr
  = n:nonnegative_real  { return [function(z){return n;},{}]; }
  / x:symbol            { var h={}; h[x]=1; return [function(z){return z.param[x](z);},h]; }
  / "(" spc* e:sum_expr spc* ")"  { return e; }

rate_expr
 = nonnegative_real

nonnegative_real
 = n:[0-9]+               { return parseFloat (n.join("")); }
 / h:[0-9]* "." t:[0-9]+  { return parseFloat (h + "." + t.join("")); }

param_decl
 = l:symbol spc* "=" spc* r:sum_expr spc* ";"
 { if (r[1][l]) throw "Definition of parameter " + l + " is circular: it depends on " + l + " itself";
   return function(z){ Cazoo.defineSymbol ("Parameter", z.param, l, r[0]); }; }

tool_decl
 = "tool" spc* "{" spc* p:tool_property_list spc* "}" spc* ";" spc*
 { return function(z){z.tool.unshift(p);}; }

tool_property_list
 = p:tool_property spc* "," spc* h:tool_property_list { h[p[0]] = p[1]; return h; }
 / p:tool_property          { var h = new Cazoo.Tool(); h[p[0]] = p[1]; return h; }

tool_property
 = "type" v:optionally_directed_symbol_value  { return ["state", v]; }  // hack to avoid using "type" as a member field
 / "rate" numeric_value
 / "radius" numeric_value
 / "reserve" numeric_value
 / "recharge" numeric_value
 / "overwrite" symbol_or_wild_value

numeric_value
 = spc* ":" spc* n:positive_integer  { return n; }

symbol_value
 = spc* ":" spc* s:symbol            { return s; }

symbol_or_wild_value
 = spc* ":" spc* s:symbol_or_wild    { return s; }

optionally_directed_symbol_value
 = spc* ":" spc* s:optionally_directed_symbol  { return s; }

positive_integer
 = h:[1-9] t:[0-9]* { t.unshift(h); return parseInt (t.join(""), 10); }

nonnegative_integer
 = "0" { return 0; }
 / positive_integer

init_block
 = "init" spc* "{" spc* l:init_list spc* "}" spc* ";" spc*
 { return function(z){z.init=z.init.concat(l);}; }

init_list
 = i:init spc* "," spc* l:init_list  { return l.push(i); }
 / i:init { return [i]; }

init
 = "[" spc* x:nonnegative_integer spc* "," spc* y:nonnegative_integer spc* "," spc* s:optionally_directed_symbol spc* "]"
 { return [x,y,s]; } 

optionally_directed_symbol = symbol dir?

goal_decl
 = "timeout" spc+ t:positive_integer g:symbol_value spc* ";" spc*
 { return function(z){z.goal.push(["testTimeoutGoal",t,g]);}; }
 / "extinct" spc+ s:symbol g:symbol_value spc* ";" spc*
 { return function(z){z.goal.push(["testExtinctionGoal",s,g]);}; }

size_decl
 = "size" spc* "[" spc* x:positive_integer spc* "," spc* y:positive_integer spc* "]" spc* ";" spc*
 { return function(z){z.size=[x,y];}; }
