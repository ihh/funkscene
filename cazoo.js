(function (caz) {
    var boardDiv = document.getElementById("board");
    var toolbarDiv = document.getElementById("toolbar");

    var xSize = 128, ySize = 128;
    var tools = ["flaming-trident", "shark-jaws", "galleon"];
    var toolDivs = [];
    var currentTool = 0;

    var clickedOn = function(x,y) { console.log("Clicked on ("+x+","+y+")"); }

    var mouseDown = 0;
    var onMouseDown = function() { ++mouseDown; }
    var onMouseUp = function() { mouseDown = 0; }

    caz.initialize = function() {
	for (var x = 0; x < xSize; ++x) {
	    for (var y = 0; y < ySize; ++y) {
		(function (x, y) {
		    var cellDiv = document.createElement("DIV");
		    cellDiv.setAttribute ("class", "cell");
		    cellDiv.setAttribute ("id", "x" + x + "y" + y);
		    cellDiv.setAttribute ("style", "padding:" + (50 / xSize) + "%");
		    var clickCell = function() { return clickedOn (x, y); };
		    cellDiv.onclick = clickCell;
		    cellDiv.onmouseover = function() { if (mouseDown) clickCell(); };
		    cellDiv.onmousedown = onMouseDown;
		    cellDiv.onmouseup = onMouseUp;
		    boardDiv.appendChild (cellDiv);
		}) (x, y);
	    }
	}

	for (var i = 0; i < tools.length; ++i) {
	    var toolDiv = document.createElement("DIV");
	    var selectTool = (function (currentToolIndex, toolDiv) {
		return function() {
		    console.log ("Selected tool " + currentToolIndex);
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
	    toolImg.src = "img/icon/" + tools[i] + ".svg";
	    toolImg.setAttribute ("class", "toolIcon");
	    toolDiv.appendChild (toolImg);
	    toolbarDiv.appendChild (toolDiv);
	    toolDivs.push (toolDiv);
	}
    };

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    caz.loadZooFile = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	var processed;
//	try {
	    processed = cazoo.parser.parse (raw);
//	} catch (e) {
//	    console.log (buildErrorMessage(e));
//	}
	return processed;
    }

})(cazoo = {});

