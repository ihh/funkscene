var sceneDiv = document.getElementById("scene");
var menuDiv = document.getElementById("menu");
var continueButton = document.getElementById("continue");
var choiceFuncs;

if (typeof start === 'undefined') {
    start = function() {
	return ["You are in a vortex.",  // no newline after return
 		[["Escape", function(){return ["You can't.",[]]}],
 		 ["Fall in", function(){return ["A fitting end.",[]]}]]];
    };
}
viewScene (start);

function getSelectedSceneFunction() {
    for (var i = 0; i < menuDiv.length; i++) {
        var inputDiv = menuDiv[i];
        if (inputDiv.checked) {
            return choiceFuncs[i];
        }
    }
    return undefined;
}

function viewScene (f) {
    menuDiv.innerHTML = "";
    choiceFuncs = new Array;

    var text_options = f();
    var text = text_options[0];
    var options = text_options[1];

    sceneDiv.innerHTML = text;

    if (options.length == 0) {
	continueButton.setAttribute ("style", "display: none");  // hide button at end
    } else {
	for (var i = 0; i < options.length; ++i) {
	    var text = options[i][0];
	    var sceneFunction = options[i][1];
	    var textDiv = document.createTextNode (text);
	    var inputDiv = document.createElement("input");
	    inputDiv.setAttribute ("type", "radio");
	    inputDiv.setAttribute ("name", "opt");
	    var labelDiv = document.createElement("label");
	    if (i == 0) {
		labelDiv.setAttribute ("class", options.length > 1 ? "firstOption" : "onlyOption");
		inputDiv.setAttribute ("checked", 1);
	    } else if (i == options.length - 1) {
		labelDiv.setAttribute ("class", "lastOption");
	    }
	    labelDiv.appendChild (inputDiv);
	    labelDiv.appendChild (textDiv);
	    menuDiv.appendChild (labelDiv);
	    choiceFuncs.push (sceneFunction);
	}
	continueButton.removeAttribute ("style");  // make sure button is visible
    }

    // activate/initialize the continue button
    continueButton.onclick = function() { viewScene(getSelectedSceneFunction()) };
}
