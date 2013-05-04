(function (caz) {
    var boardDiv = document.getElementById("board");
    var toolbarDiv = document.getElementById("toolbar");

    var toolDivs = [];
    var currentTool = 0;

    var clickedOn = function(x,y) { console.log("Clicked on ("+x+","+y+")"); }

    var mouseDown = 0;
    var onMouseDown = function() { ++mouseDown; }
    var onMouseUp = function() { mouseDown = 0; }

    caz.compassToInt = { n:0, ne:1, e:2, se:3, s:4, sw:5, w:6, nw:7 };
    caz.relativeToInt = { f:0, fr:1, r:2, br:3, b:4, bl:5, l:6, fl:7 };

    caz.dirOffset = [[0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1]];

    caz.neumannHood = [0, 2, 4, 6];
    caz.bishopHood = [1, 3, 5, 7];
    caz.mooreHood = [0, 1, 2, 3, 4, 5, 6, 7];

    caz.evalDirExprIntVal = function (fwdDir, dirExpr) {
	if (dirExpr == "*" || dirExpr == "")
	    return undefined;
	return (fwdDir + caz.relativeToInt[dirExpr]) % 8;
    }

    caz.matchDirExpr = function (fwdDir, dirExpr, dirToMatch) {
	if (dirExpr == "*" || dirExpr == "")
	    return true;
	if (dirExpr in caz.compassToInt && dirToMatch == dirExpr)
	    return true;
	return caz.evalDirExprIntVal(fwdDir,dirExpr) == caz.compassToInt[dirToMatch];
    };

    caz.extend = function (destination, source) {  // source overwrites destination
	if (typeof(source) != "undefined") {
	    for (var property in source) {
		if (source.hasOwnProperty(property)) {
		    destination[property] = source[property];
		}
	    }
	}
	return destination;
    };

    caz.defineSymbol = function(desc,hash,sym,def) {
	if (sym in hash) {
	    throw desc + " " + sym + " already defined";
	}
	hash[sym] = def;
    };

    caz.buildErrorMessage = function(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    };

    caz.selectRandomElement = function(arr) {
	return arr[Math.floor (Math.random() * arr.length)];
    };

    caz.randomWaitTime = function() { return -Math.log (Math.random()); }

    // Cell
    caz.Cell = function (game, div, x, y) {
	this.game = game;
	this.zoo = game.zoo;
	this.state = zoo.empty;
	this.dir = 0;
	this.div = div;
	this.x = x;
	this.y = y;
	this.timer = undefined;
    };

    caz.Cell.prototype.icon = function() {
	return zoo.particle[this.state].icon;
    };

    caz.Cell.prototype.setState = function(newState,newDir) {
	var oldState = this.state;
	var oldDir = this.dir;

	this.state = newState;
	this.dir = newDir;

	if (newState != oldState || newDir != oldDir) {
	    var html = this.zoo.makeIconHtml(newState,newDir);
	    this.div.innerHTML = this.zoo.makeIconHtml(newState,newDir);
	}

	if (this.timer) {
	    window.clearTimeout (this.timer);
	    this.timer = undefined;
	}
	var info = zoo.particle[newState];
	if (info.rate) {
	    var callback = (function(cell){return function(){cell.update();}}) (this);
	    var delayInSecs = (info.sync ? 1 : caz.randomWaitTime()) / info.rate;  // exponentially distributed wait if async
	    var delayInMillisecs = Math.floor (delayInSecs * 1000);
	    this.timer = window.setTimeout (callback, delayInMillisecs);
	}
    };

    caz.Cell.prototype.update = function() { this.game.update (this.x, this.y); }

    // Game
    caz.Game = function (zoo) {
	this.zoo = zoo;
	this.cell = [];
	this.currentTool = zoo.tool[0];
    };

    caz.Game.prototype.getCell = function(x,y) {
	if (x < 0 || x >= this.zoo.size[0] || y < 0 || y >= this.zoo.size[1]) {
	    return this.dummyCell;
	}
	return this.cell[y][x];
    };

    caz.Game.prototype.getState = function(x,y) {
	var cell = this.getCell(x,y);
	return [cell.state, cell.dir];
    };

    caz.Game.prototype.getNeighborCell = function(x,y,dir) {
	var offset = caz.dirOffset[dir];
	return this.getCell (x + offset[0], y + offset[1]);
    };

    caz.Game.prototype.getNeighborState = function(x,y,dir) {
	var offset = caz.dirOffset[dir];
	return this.getState (x + offset[0], y + offset[1]);
    };

    caz.Game.prototype.setState = function(x,y,state,dir) {
	this.getCell(x,y).setState (state, dir);
    };

    caz.Game.prototype.update = function(x,y) {
	var srcCell = this.getCell (x, y);
	var srcState = srcCell.state;
	var srcDir = srcCell.dir;
	var info = this.zoo.particle[srcState];
	var fwdDir = info.isometric ? caz.selectRandomElement(info.neighborhood) : srcDir;
	var targetCell = this.getNeighborCell (x, y, fwdDir);
	var targetState = targetCell.state;
	var targetDir = targetCell.dir;
	var ruleSelector = Math.random() * info.rate;
	var srcRules = this.zoo.rule[srcState];
	var targetRules = targetState in srcRules ? srcRules[targetState] : undefined;
	var wildRules = "*" in srcRules ? srcRules["*"] : undefined;
	function findMatchingRule (rules) {
	    if (rules)
		for (var i = 0; i < rules.length; ++i) {
		    var rule = rules[i];
		    if (caz.matchDirExpr (fwdDir, rule[0][1], srcDir)
			&& caz.matchDirExpr (fwdDir, rule[1][1], targetDir)) {
			if ((ruleSelector -= rule[4]) <= 0) {
			    return rule;
			}
		    }
		}
	    return undefined;
	};
	var rule = findMatchingRule(targetRules) || findMatchingRule(wildRules);
	if (rule) {
	    var newSrcStateExpr = rule[2][0];
	    var newSrcDirExpr = rule[2][1];
	    var newSrcState = zoo.evalStateExpr (newSrcStateExpr, newSrcDirExpr, fwdDir, srcState, srcDir, targetState, targetDir);
	    var newTargetStateExpr = rule[3][0];
	    var newTargetDirExpr = rule[3][1];
	    var newTargetState = zoo.evalStateExpr (newTargetStateExpr, newTargetDirExpr, fwdDir, srcState, srcDir, targetState, targetDir);
	    srcCell.setState (newSrcState[0], newSrcState[1]);
	    targetCell.setState (newTargetState[0], newTargetState[1]);
	}
    };


    // Zoo
    caz.Zoo = function() {
	this.particle = {};
	this.rule = {};
	this.param = {};
	this.tool = [];
	this.goal = [];
	this.size = [0,0];
	this.init = [];

	this.iconPrefix = "img/icon/";
	this.iconSuffix = ".svg";

	this.defineType (this.empty, {});
    };
    caz.Zoo.prototype.empty = "_";

    caz.Zoo.prototype.particleTypes = function() { return Object.keys (this.particle); }

    caz.Zoo.prototype.makeIconPath = function(icon) {
	return this.iconPrefix + icon + this.iconSuffix;
    };

    caz.Zoo.prototype.makeIconHtml = function(type,dir) {
	var typeInfo = this.particle[type];
	var icon = typeInfo.icon;
	if (typeof(icon) == "undefined") return "";
	var style = "";
	if (typeInfo.rotates) {
	    var angle = (45 * dir) + "deg";
	    style = " style=\" -webkit-transform: rotate(" + angle + "); -moz-transform: rotate(" + angle + ")\"";
	}
	return "<img src=\"" + this.makeIconPath(icon) + "\"" + style + "/>";
    };

    caz.Zoo.prototype.initRules = function(s,t) {
	if (typeof (this.rule[s]) == 'undefined')
	    this.rule[s] = { "*": [] };
	if (typeof(t) != 'undefined' && typeof (this.rule[s][t]) == 'undefined')
	    this.rule[s][t] = [];
    };

    caz.defaultParticleProperties = { isometric: 0,
				      rotates: 0,
				      sync: 0,
				      neighborhood: caz.mooreHood,
				      rate: 0 };
    caz.Zoo.prototype.defineType = function(name,props) {
	var defaults = caz.extend ({}, caz.defaultParticleProperties);
	caz.defineSymbol ("Particle name", this.particle, name, caz.extend (defaults, props));
	this.initRules (name);
    };

    caz.Zoo.prototype.evalDirExprIntVal = function (fwdDir, dirExpr, state, defaultDir) {
	if (!dirExpr)
	    return defaultDir;
	if (dirExpr == "*") {
	    var hood = this.particle[state].neighborhood;
	    return caz.selectRandomElement (hood);
	}
	return caz.evalDirExprIntVal (fwdDir, dirExpr);
    };

    caz.Zoo.prototype.evalStateExpr = function (stateExpr, dirExpr, fwdDir, oldSrcState, oldSrcDir, oldTargetState, oldTargetDir) {
	var state = stateExpr, defaultDir;
	if (stateExpr == "$s") {
	    state = oldSrcState;
	    defaultDir = oldSrcDir;
	} else if (stateExpr == "$t") {
	    state = oldTargetState;
	    defaultDir = oldTargetDir;
	}
	var dir = this.evalDirExprIntVal (fwdDir, dirExpr, state, defaultDir);
	return [state, dir];
    };

    caz.Zoo.prototype.initialize = function() {
	// calculate particle update rates by type
	var types = this.particleTypes();
	var maxRate = 0;
	for (var t = 0; t < types.length; ++t) {
	    var typeName = types[t];
	    var typeInfo = this.particle[typeName];

	    if (!typeName in this.rule)
		this.rule[typeName] = {};

	    var rules = this.rule[typeName];
	    var targets = Object.keys (rules);

	    // first replace all rate functions with their evaluations, for speed
	    for (var i = 0; i < targets.length; ++i) {
		var targetRules = rules[targets[i]];
		for (var j = 0; j < targetRules.length; ++j) {
		    var evaluatedRate = targetRules[j][4] (this);
		    targetRules[j][4] = evaluatedRate;
		}
	    }

	    // loop over orientation, neighborhood, target type; find max rate
	    var hood = typeInfo.neighborhood;
	    var typeRate = 0;
	    for (var srcDir = 0; srcDir < 8; ++srcDir) {
		for (var n = 0; n < hood.length; ++n) {
		    var fwdDir = hood[n];
		    var wildRules = "*" in rules ? rules["*"] : [];
		    for (var i = 0; i < targets.length; ++i) {
			var targetRules = rules[targets[i]];
			var rate = 0;
			function countRules (myRules) {
			    for (var j = 0; j < myRules.length; ++j) {
				var rule = myRules[j];
				var srcDirExpr = rule[1][1];
				if (caz.matchDirExpr (fwdDir, srcDirExpr, srcDir)) {
				    rate += rule[4];
				}
			    }
			};
			countRules (targetRules);
			if (targets[t] != "*")
			    countRules (wildRules);
			if (rate > typeRate)
			    typeRate = rate;
		    }
		}
	    }

	    // store
	    typeInfo.rate = typeRate;
	    if (typeRate > maxRate)
		maxRate = typeRate;
	}
	this.maxRate = maxRate;

	// create Game
	var game = new caz.Game (this);
	this.game = game;

	game.dummyCell = new caz.Cell (game, undefined, undefined, undefined);  // for off-board access
	game.dummyCell.setState = function() { };  // nullify default write method

	// set up board
	var xSize = this.size[0], ySize = this.size[1];
	var boardWidth = boardDiv.offsetWidth;
	var cellWidth = boardWidth / xSize;  // might want to rethink this for long thin vertical boards
	for (var y = 0; y < ySize; ++y) {
	    var row = [];
	    game.cell.push (row);
	    for (var x = 0; x < xSize; ++x) {
		(function (x, y, zoo) {
		    var cellDiv = document.createElement("DIV");
		    cellDiv.setAttribute ("class", "cell");
		    cellDiv.setAttribute ("id", "x" + x + "y" + y);
		    cellDiv.setAttribute ("style", "width: " + cellWidth + "px; height: " + cellWidth + "px;");
		    var clickCell = function() { return clickedOn (x, y); };
		    cellDiv.onclick = clickCell;
		    cellDiv.onmouseover = function() { if (mouseDown) clickCell(); };
		    cellDiv.onmousedown = onMouseDown;
		    cellDiv.onmouseup = onMouseUp;
		    boardDiv.appendChild (cellDiv);
		    row.push (new caz.Cell (game, cellDiv, x, y));
		}) (x, y, this);
	    }
	}

	// do inits
	for (var i = 0; i < zoo.init.length; ++i) {
	    var xystate = zoo.init[i];
	    var x = xystate[0], y = xystate[1], state = xystate[2][0], dirString = xystate[2][1];
	    var dir = dirString in caz.compassToInt ? caz.compassToInt[dirString] : zoo.randomDir(state);
	    game.setState (x, y, state, dir);
	}

	// set up tools
	for (var i = 0; i < this.tool.length; ++i) {
	    var toolDiv = document.createElement("DIV");
	    var selectTool = (function (currentToolIndex, toolDiv) {
		return function() {
//		    console.log ("Selected tool " + currentToolIndex);
		    game.currentTool = this.tool[currentToolIndex];
		    toolDiv.setAttribute ("class", "tool selected");
		    for (var j = 0; j < toolDivs.length; ++j) {
			if (j != currentToolIndex) {
			    toolDivs[j].setAttribute ("class", "tool unselected");
			}
		    }
		};
	    }) (i, toolDiv);
	    toolDiv.onclick = selectTool;
	    toolDiv.setAttribute ("class", i == 0 ? "tool selected" : "tool unselected");
	    toolDiv.setAttribute ("id", "tool" + i);
	    var toolImg = document.createElement("IMG");
	    var toolIcon = this.tool[i].icon;
	    var toolType = this.tool[i].particle;
	    if (typeof toolIcon == 'undefined') {
		toolIcon = this.particle[toolType].icon;
	    }
	    toolImg.src = this.makeIconPath (toolIcon);
	    toolImg.setAttribute ("class", "toolIcon");
	    toolDiv.appendChild (toolImg);
	    toolbarDiv.appendChild (toolDiv);
	    toolDivs.push (toolDiv);
	}
    };

    caz.newZooFromUrl = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	var processed;
//	try {
	    processed = Cazoo.parser.parse (raw);
//	} catch (e) {
//	    console.log (Cazoo.buildErrorMessage(e));
//	}
	return processed;
    }


})(Cazoo = {});

