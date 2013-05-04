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

    caz.neumannHood = [[0,-1], [1,0], [0,1], [-1,0]];
    caz.bishopHood = [[1,-1], [1,1], [-1,1], [-1,-1]];
    caz.mooreHood = caz.neumannHood.concat (caz.bishopHood);

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    caz.newFromUrl = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	var processed;
//	try {
	    processed = Cazoo.parser.parse (raw);
//	} catch (e) {
//	    console.log (buildErrorMessage(e));
//	}
	return processed;
    }

    caz.Cell = function (zoo, div) {
	this.zoo = zoo;
	this.state = zoo.empty;
	this.dir = 0;
	this.div = div;
    };

    caz.Cell.prototype.icon = function() {
	return zoo.type[this.state].icon;
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
    };

    caz.Game = function (zoo) {
	this.zoo = zoo;
	this.cell = [];
	this.currentTool = zoo.tool[0];
    };

    caz.Game.prototype.getCell = function(x,y) {
	if (x < 0 || x >= this.zoo.size[0] || y < 0 || y >= this.zoo.size[1]) {
	    return this.dummyCell;
	}
	return this.cell[x][y];
    };

    caz.Game.prototype.getState = function(x,y) {
	if (x < 0 || x >= this.zoo.size[0] || y < 0 || y >= this.zoo.size[1]) {
	    return this.zoo.empty;
	}
	return this.cell[x][y];
    };

    caz.Game.prototype.setState = function(x,y,state,dir) {
	this.getCell(x,y).setState (state, dir);
    };

    caz.Zoo = function() {
	this.type = {};
	this.rule = {};
	this.param = {};
	this.tool = [];
	this.goal = [];
	this.size = [0,0];
	this.init = [];

	this.iconPrefix = "img/icon/";
	this.iconSuffix = ".svg";
    };
    caz.Zoo.prototype.empty = "_";

    caz.Zoo.prototype.makeIconPath = function(icon) {
	return this.iconPrefix + icon + this.iconSuffix;
    };

    caz.Zoo.prototype.makeIconHtml = function(type,dir) {
	var typeInfo = this.type[type];
	var style = "";
	if (!typeInfo.isometric) {
	    var angle = (45*dir) + "deg";
	    style = " style=\" -webkit-transform: rotate(" + angle + "); -moz-transform: rotate(" + angle + ")\"";
	}
	return "<img src=\"" + this.makeIconPath(typeInfo.icon) + "\"" + style + "/>";
    };

    caz.Zoo.prototype.initialize = function() {
	var game = new caz.Game (this);
	this.game = game;

	game.dummyCell = new caz.Cell (this, undefined);  // for off-board access
	game.dummyCell.setState = function() { };

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
		    row.push (new caz.Cell (zoo, cellDiv));
		}) (x, y, this);
	    }
	}

	// do inits
	for (var i = 0; i < zoo.init.length; ++i) {
	    var xystate = zoo.init[i];
	    var x = xystate[0], y = xystate[1], state = xystate[2][0], dir = xystate[2][1];
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
	    var toolType = this.tool[i].type;
	    if (typeof toolIcon == 'undefined') {
		toolIcon = this.type[toolType].icon;
	    }
	    toolImg.src = this.makeIconPath (toolIcon);
	    toolImg.setAttribute ("class", "toolIcon");
	    toolDiv.appendChild (toolImg);
	    toolbarDiv.appendChild (toolDiv);
	    toolDivs.push (toolDiv);
	}
    };

})(Cazoo = {});

