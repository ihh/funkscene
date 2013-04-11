var sceneDiv = document.getElementById("scene");
var menuDiv = document.getElementById("menu");
var continueButton = document.getElementById("continue");

var Start = function() {
    return
    ["You are in a vortex.",
     [["Escape", function(){["You can't",[]]}],
      ["Fall in", function(){["A fitting end",[]]}]]];
};
continueButton.onclick = function() { viewScene(Start) };

function getSelectedSceneFunction() {
    for (var i = 0; i < menuDiv.length; i++) {
        var inputDiv = menuDiv[i][0];
        if (inputDiv.checked) {
            return inputDiv.value;
        }
    }
    return undefined;
}

function viewScene (f) {
    menuDiv.innerHTML = "";

    var text_options = f();
    var text = text_options[0];
    var options = text_options[1];

    sceneDiv.innerHTML = text;

    for (var i = 0; i < options.length; ++i) {
	var text = options[i][0];
	var sceneFunction = options[i][1];
	var textDiv = document.createTextNode (text + " <br/>");
	var inputDiv = document.createElement("input");
	inputDiv.setAttribute ("type", "radio");
	inputDiv.setAttribute ("name", "opt");
	inputDiv.setAttribute ("value", sceneFunction);
	var labelDiv = document.createElement("label");
	labelDiv.appendChild (inputDiv);
	labelDiv.appendChild (textDiv);
	if (i == 0) { labelDiv.setAttribute("class",options.length > 1 ? "firstOption" : "onlyOption"); }
	else if (i == options.length - 1) { labelDiv.setAttribute("class","lastOption"); }
	menuDiv.appendChild (labelDiv);
    }

    continueButton.onclick = function() { viewScene(getSelectedSceneFunction()) };
}
