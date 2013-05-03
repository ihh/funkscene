(function (caz) {
    var boardDiv = document.getElementById("board");
    var toolbarDiv = document.getElementById("toolbar");

    var xSize = 32, ySize = 32;
    var tools = ["flaming-trident", "shark-jaws", "galleon"];

    caz.initialize = function() {
	for (var x = 0; x < xSize; ++x) {
	    for (var y = 0; y < ySize; ++y) {
		var cellDiv = document.createElement("DIV");
		cellDiv.setAttribute ("class", "cell");
		cellDiv.setAttribute ("id", "x" + x + "y" + y);
		cellDiv.setAttribute ("style", "padding:" + (50 / xSize) + "%");
		boardDiv.appendChild (cellDiv);
	    }
	}

	for (var i = 0; i < tools.length; ++i) {
	    var toolDiv = document.createElement("DIV");
	    toolDiv.setAttribute ("class", "tool");
	    var toolImg = document.createElement("IMG");
	    toolImg.src = "img/icon/" + tools[i] + ".svg";
	    toolImg.setAttribute ("class", "toolIcon");
	    toolDiv.appendChild (toolImg);
	    toolbarDiv.appendChild (toolDiv);
	}
	
    };

})(cazoo = {});

