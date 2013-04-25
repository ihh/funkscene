(function (fs) {
    var sceneDiv = document.getElementById("scene");
    var menuDiv = document.getElementById("menu");
    var textboxDiv;
    var continueButton = document.getElementById("continue");

    fs.choiceFuncs = undefined;
    fs.choiceHistory = undefined;
    fs.currentScene = undefined;
    fs.previousScene = undefined;

    fs.namedEventCount = {};
    fs.sceneDeque = [];

    if (typeof start === 'undefined') {
	start = function() {
	    return ["You are in a vortex.",  // no newline after return
 		    [["Escape", function(){return ["You can't.",[]]}],
 		     ["Fall in", function(){return ["A fitting end.",[]]}]]];
	};
    }

    fs.getSelectedSceneFunction = function() {
	for (var i = 0; i < menuDiv.length; i++) {
            var inputDiv = menuDiv[i];
            if (inputDiv.checked) {
		fs.choiceHistory.push (i);
		return fs.choiceFuncs[i];
            }
	}
	return undefined;
    }

    fs.viewScene = function (f) {
	menuDiv.innerHTML = "";
	fs.choiceFuncs = new Array;

	fs.previousScene = fs.currentScene;
	fs.currentScene = f;
	var text_options = f();
	var text = text_options[0];
	var options = text_options[1];

	sceneDiv.innerHTML = text;

	var validOptions = new Array();
	for (var i = 0; i < options.length; ++i) {
	    if (options[i] instanceof Array
		&& (options[i].length == 1
		    || options[i].length == 2
		    || options[i].length == 3)) {
		validOptions.push (i);
	    }
	}

	if (validOptions.length == 0 && fs.sceneDeque.length > 0) {
	    options.push (["", fs.sceneDeque.pop()]);
	    validOptions.push (options.length - 1);
	}

	var i = 0;
	var textboxHack;
	for (var j = 0; j < validOptions.length; ++j) {
	    while (i < validOptions[j]) {
		var emptyDiv = document.createElement("DIV");
		menuDiv.appendChild (emptyDiv);
		++i;
	    }
	    var text = options[i][0];
	    if (typeof text === 'undefined') { text = 'Enter text:  '; }
	    var sceneFunction = options[i].length > 1 ? options[i][1] : undefined;
	    var inputVarName = options[i].length > 2 ? options[i][2] : undefined;
	    //	    console.log ("j="+j+" i="+i+" text=\""+text+"\" sceneFunction="+sceneFunction+" inputVarName="+inputVarName);
	    var textDiv = document.createTextNode (text);
	    var inputDiv = document.createElement("input");
	    var labelDiv = document.createElement("label");
	    if (options[i].length == 3) {
		inputDiv.setAttribute ("type", "text");
		inputDiv.onkeypress = function (e) {
		    if (e.keyCode == 13)
			continueButton.click();
		};
		textboxDiv = inputDiv;
		labelDiv.appendChild (textDiv);
		labelDiv.appendChild (inputDiv);
		textboxHack = function() {
		    var ____val = textboxDiv.value;
		    eval (inputVarName + " = ____val;");  // code smell, should ensure inputVarName != "____val" I guess
		    var choiceIndex = fs.choiceHistory.pop();
		    fs.choiceHistory.push ([choiceIndex, inputVarName, ____val]);
		};
	    } else {
		inputDiv.setAttribute ("type", "radio");
		textboxDiv = undefined;
		if (text === '') {
		    labelDiv.setAttribute ("style", "display: none");
		}
		labelDiv.appendChild (inputDiv);
		labelDiv.appendChild (textDiv);
	    }
	    inputDiv.setAttribute ("name", "opt");
	    if (j == 0 && validOptions.length == 1) {
		labelDiv.setAttribute ("class", "onlyOption");
	    } else if (j == 0) {
		labelDiv.setAttribute ("class", "firstOption");
	    } else if (j == validOptions.length - 1) {
		labelDiv.setAttribute ("class", "lastOption");
	    }
	    if (j == 0) {
		inputDiv.setAttribute ("checked", 1);
	    }
	    if (typeof sceneFunction === 'undefined') {
		inputDiv.setAttribute ("disabled", 1);
		labelDiv.setAttribute ("disabled", 1);
	    }
	    menuDiv.appendChild (labelDiv);
	    fs.choiceFuncs.push (sceneFunction);
	}

	if (typeof textboxHack != 'undefined') {
	    // activate/initialize the continue button, calling textboxHack to set the associated variable
	    continueButton.removeAttribute ("style");  // make sure button is visible
	    continueButton.onclick = function() { var next = fs.getSelectedSceneFunction(); textboxHack(); fs.viewScene(next); };
	} else if (validOptions.length > 0) {
	    // activate/initialize the continue button
	    continueButton.removeAttribute ("style");  // make sure button is visible
	    continueButton.onclick = function() { fs.viewScene (fs.getSelectedSceneFunction()) };
	} else {
	    // no choices, so hide button
	    continueButton.setAttribute ("style", "display: none");
	}
    }

    fs.loadSceneFile = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	//    console.log (raw);
	var processed = funkscene.parser.parse (raw);
	//    console.log (processed);
	eval (processed);
    }

    fs.initialize = function() {
	fs.viewScene (start);
	fs.choiceHistory = new Array;
    }

    // restore() assumes exact reproducibility (i.e. do NOT use Math.Rand!)
    fs.restore = function (history) {
	// already done: viewScene(start)
	if (history.length > 0) {
	    var i = 0;
	    for (; i < history.length; ++i) {
		var history_item = history[i];
		var choice_index;
		if (history_item.length == 3) {
		    choice_index = history_item[0];
		    var inputVarName = history_item[1];
		    var ____val = history_item[2];
		    eval (inputVarName + " = ____val");  // code smell, should ensure inputVarName != "____val" I guess
		} else {
		    choice_index = history_item;
		}
		var nextScene = fs.choiceFuncs[choice_index];
		fs.viewScene (nextScene);
	    }
	}
	fs.choiceHistory = history;
    }

})(funkscene = {});
