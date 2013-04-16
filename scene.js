var sceneDiv = document.getElementById("scene");
var menuDiv = document.getElementById("menu");
var continueButton = document.getElementById("continue");
var choiceFuncs, choiceHistory;

if (typeof start === 'undefined') {
    start = function() {
	return ["You are in a vortex.",  // no newline after return
 		[["Escape", function(){return ["You can't.",[]]}],
 		 ["Fall in", function(){return ["A fitting end.",[]]}]]];
    };
}

function getSelectedSceneFunction() {
    for (var i = 0; i < menuDiv.length; i++) {
        var inputDiv = menuDiv[i];
        if (inputDiv.checked) {
	    choiceHistory.push (i);
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

    var numChecked = 0;
    if (options.length > 0) {
	for (var i = 0; i < options.length; ++i) {
	    if (options[i] instanceof Array
		&& (options[i].length == 1
		    || options[i].length == 2)) {
		var text = options[i][0];
		var sceneFunction = options[i].length == 2 ? options[i][1] : undefined;
		var textDiv = document.createTextNode (text);
		var inputDiv = document.createElement("input");
		inputDiv.setAttribute ("type", "radio");
		inputDiv.setAttribute ("name", "opt");
		var labelDiv = document.createElement("label");
		if (i == 0) {
		    labelDiv.setAttribute ("class", options.length > 1 ? "firstOption" : "onlyOption");
		} else if (i == options.length - 1) {
		    labelDiv.setAttribute ("class", "lastOption");
		}
		if (numChecked == 0) {
		    inputDiv.setAttribute ("checked", 1);
		}
		if (typeof sceneFunction === 'undefined') {
		    inputDiv.setAttribute ("disabled", 1);
		    labelDiv.setAttribute ("disabled", 1);
		}
		if (text === '') {
		    labelDiv.setAttribute ("style", "display: none");
		}
		++numChecked;
		labelDiv.appendChild (inputDiv);
		labelDiv.appendChild (textDiv);
		menuDiv.appendChild (labelDiv);
		choiceFuncs.push (sceneFunction);
	    }
	}
	continueButton.removeAttribute ("style");  // make sure button is visible
    }

    if (numChecked > 0) {
	// activate/initialize the continue button
	continueButton.onclick = function() { viewScene(getSelectedSceneFunction()) };
    } else {
	// no choices, so hide button
	continueButton.setAttribute ("style", "display: none");
    }
}

function loadSceneFile (url) {
    var xhr = new XMLHttpRequest();
    xhr.open ("GET", url, false);
    xhr.send();
    var raw = xhr.responseText;
//    console.log (raw);
    var processed = funkscene_parser.parse (raw);
//    console.log (processed);
    eval (processed);
}

function initialize() {
    viewScene (start);
    choiceHistory = new Array;
}

// restore() assumes exact reproducibility (i.e. do NOT use Math.Rand!)
function restore (history) {
    // already done: viewScene(start)
    if (history.length > 0) {
	var f = choiceFuncs[history[0]];
	for (var i = 1; i < history.length; ++i) {
	    var text_options = f();
	    f = text_options[1][history[i]][1];
	}
	viewScene (f);
    }
    choiceHistory = history;
}
