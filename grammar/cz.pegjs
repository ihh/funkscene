{
    function Zoo() {
	this.type = {};
	this.rule = {};
	this.param = {};
	this.tool = [];
	this.goal = [];
	this.size = [0,0];
	this.init = [];
    };

    function defineSymbol(desc,hash,sym,def) {
	if (sym in hash) {
	    throw desc + " " + sym + " already defined";
	}
	hash[sym] = def;
    };

    function extend(destination, source) {
	for (var property in source) {
            if (source.hasOwnProperty(property)) {
		destination[property] = source[property];
            }
	}
	return destination;
    };

    var neumannHood = [[0,-1], [1,0], [0,1], [-1,0]];
    var bishopHood = [[1,-1], [1,1], [-1,1], [-1,-1]];
    var mooreHood = mooreHood.concat (bishopHood);

}

start
 = spc* z:body { return z; }

body
 = s:statement spc* z:body         { s(z); return z; }
 / s:statement  { var z = new Zoo(); s(z); return z; }

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
 { return function(z){ defineSymbol("Particle name",z.type,n,p); }; }

symbol
 = h:[A-Za-z_] t:[0-9A-Za-z_]* { return h + t.join(""); }

particle_property_list
 = h:particle_property spc* "," spc* t:particle_property_list { return extend(h,t); }
 / particle_property

particle_property
 = p:icon_property          { return { icon: p }; }
 / p:neighborhood_property  { return { neighborhood: p }; }
 / p:isometric_property     { return { isometric: p }; }
 / p:sync_property          { return { sync: p }; }

icon_property
 = "icon" spc* ":" spc* p:image_path { return p; }

image_path
 = h:[A-Za-z0-9] t:[A-Za-z0-9/\-_]* { return h + t.join(""); }

neighborhood_property
 = "moore"   { return mooreHood; }
 / "neumann" { return neumannHood; }
 / "bishop"  { return bishopHood; }

isometric_property
 = "isometric" {return 1;}
 / "directed"  {return 0;}

sync_property
 = "sync"  {return 1;}
 / "async" {return 0;}

rule
 = lhs_source spc+ lhs_target spc* "->" spc* rhs_source spc+ rhs_target spc* rate_clause? spc* ";"
 { return function(z){}; }

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

lhs_macro = "$" ("s" / "t")
rhs_macro = "$" ("S" / "T")

dir
 = "." compass_dir
 / "." relative_dir

compass_dir = "nw" / "ne" / "se" / "sw" / "n" / "e" / "s" / "w"

relative_dir = "fl" / "fr" / "bl" / "br" / "f" / "b" / "l" / "r"

rate_clause
 = ":" spc* sum_expr

sum_expr
  = product_expr spc* "+" spc* sum_expr
  / product_expr

product_expr
  = primary_expr spc* ("*" / "/") spc* product_expr
  / primary_expr

primary_expr
  = nonnegative_real
  / symbol
  / "(" spc* sum_expr spc* ")"

rate_expr
 = nonnegative_real

nonnegative_real
 = [0-9]+
 / [0-9]* "." [0-9]+

caption
 = "caption" string_value

string_value
 = spc* ":" spc* "[" [^\]] "]"

param_decl
 = symbol spc* "=" spc* sum_expr spc* ";"
 { return function(z){}; }

tool_decl
 = "tool" spc* "{" spc* p:tool_property_list spc* "}" spc* ";" spc*
 { return function(z){z.tool.push(p);}; }

tool_property_list
 = p:tool_property spc* "," spc* h:tool_property_list { h[p[0]] = p[1]; return h; }
 / p:tool_property                          { var h={}; h[p[0]] = p[1]; return h; }

tool_property
 = "type" symbol_value
 / "intensity" numeric_value
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

optionally_directed_symbol = s:symbol d:dir?

goal_decl
 = "timeout" spc+ positive_integer symbol_value spc* ";" spc*
 { return function(z){}; }
 / "extinct" spc+ symbol symbol_value spc* ";" spc*
 { return function(z){}; }

size_decl
 = "size" spc* "[" spc* positive_integer spc* "," spc* positive_integer spc* "]" spc* ";" spc*
 { return function(z){}; }
