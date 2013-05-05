(function (fs) {
    // DOM hooks
    var sceneDiv = document.getElementById("scene");
    var menuDiv = document.getElementById("menu");
    var historyDiv = document.getElementById("history");
    var statsDiv = document.getElementById("stats");
    var codaDiv = document.getElementById("coda");
    var codaParentDiv = document.getElementById("codaParent");
    var continueButton = document.getElementById("continue");
    var restartButton = document.getElementById("restart");
    var storyParentDiv = document.getElementById("storyParent");
    var statsParentDiv = document.getElementById("statsParent");
    var historyParentDiv = document.getElementById("historyParent");
    var statsButton = document.getElementById("showStats");
    var historyButton = document.getElementById("showHistory");
    var storyButton = document.getElementById("showStory");
    var minigameDiv = document.getElementById("minigame");
    var minigameTextDiv = document.getElementById("minigameText");
    var minigameBoardDiv = document.getElementById("minigameBoard");
    var minigameToolbarDiv = document.getElementById("minigameTools");

    // Uncomment to guard against accidental navigation away from page:
    //    window.onbeforeunload = function() { return "Your position will be lost."; };

    // utility to test if object is a function
    fs.isFunction = function(object) {
	var getType = {};
	return object && getType.toString.call(object) === '[object Function]';
    }

    // our stuff
    var choiceFuncs = undefined;
    var choiceTexts = undefined;
    fs.choiceHistory = undefined;

    fs.currentScene = undefined;
    fs.previousScene = undefined;

    fs.namedEventCount = {};

    fs.sceneDeque = [];
    fs.continuationScene = function() { return fs.sceneDeque.pop(); };

    var converter = new Markdown.Converter();
    fs.sceneTextToHtml = converter.makeHtml;
    fs.sceneTextToHistoryHtml = function(t) { return converter.makeHtml(t) + "<br>"; };
    fs.choiceTextToHistoryHtml = function(t) { return "<i>" + t + "</i><br>"; };

    var defaultContinueText = continueButton.innerHTML;
    fs.setContinueText = function(t) {
	continueButton.innerHTML = t;
    };
    var resetContinueText = function() {
	continueButton.innerHTML = defaultContinueText;
    };

    // distinguished scenes are 'statusPage' and 'start'
    var getStartPage = function() { return start; }
    var makeStatusPage = function() { return statusPage()[0]; };

    if (typeof start === 'undefined') {
	start = function() {
	    return ["You are in a Vortex of Error.",
 		    [["Escape", function(){return ["You can't. There's a bug. (Checked the console log?)",[]]}],
 		     ["Fall in", function(){return ["A fitting end. Now go debug! (Take a look at the console?)",[]]}]]];
	};
    }

    if (typeof statusPage === 'undefined') {
	statusPage = function() {
	    return ["Your situation is perfectly normal.",
 		    []];
	};
    }

    if (typeof codaPage === 'undefined') {
	codaPage = function() {
	    return ["# THE END",
 		    []];
	};
    }

    function hideElement(e) { e.setAttribute ("style", "display: none"); };
    function showElement(e) { e.setAttribute ("style", "display: inline"); };

    statsButton.onclick = function() {
	hideElement (statsButton);
	showElement (historyButton);
	showElement (storyButton);
	hideElement (storyParentDiv);
	hideElement (historyParentDiv);
	showElement (statsParentDiv);
    };

    historyButton.onclick = function() {
	hideElement (historyButton);
	showElement (statsButton);
	showElement (storyButton);
	hideElement (storyParentDiv);
	hideElement (statsParentDiv);
	showElement (historyParentDiv);
    };

    storyButton.onclick = function() {
	hideElement (storyButton);
	showElement (statsButton);
	showElement (historyButton);
	hideElement (statsParentDiv);
	hideElement (historyParentDiv);
	showElement (storyParentDiv);
    };

    function getSelectedSceneFunction() {
	for (var i = 0; i < menuDiv.length; i++) {
            var inputDiv = menuDiv[i];
            if (inputDiv.checked) {
		fs.choiceHistory.push (i);
		return [choiceTexts[i], choiceFuncs[i]];
            }
	}
	return undefined;
    };

    function recordChoiceText(c) {
	if (typeof(c) != 'undefined' && c != '') {
	    historyDiv.innerHTML += fs.choiceTextToHistoryHtml(c);
	}
    };

    function recordSceneText(s) {
	historyDiv.innerHTML += fs.sceneTextToHistoryHtml(s);
    };

    // viewScene
    //  f: scene function to view
    //  fastForward: flag indicating whether to actually render
    // Return type signifies status of minigame on this page:
    //  Game object => minigame initialized and running
    //  Function => minigame was not initialized, initializer returned
    //  undefined => no minigame on this page
    function viewScene(f,fastForward) {
	menuDiv.innerHTML = "";
	sceneDiv.innerHTML = "";
	choiceFuncs = [];
	choiceTexts = [];

	resetContinueText();

	fs.previousScene = fs.currentScene;
	fs.currentScene = f;

	// call the scene function
	var result = f();
	if (fs.isFunction(result)) {
	    // Yield control to minigame initializer, with this function as a callback.
	    // The minigame initializer will eventually return a Game object.
	    // However, if we're running in fast-forward mode, don't bother with the minigame;
	    // just return the minigame initializer function to the caller, signifying the game did not start.
	    return fastForward ? result : result(viewScene);
	}

	// normal scene
	var sceneText = result[0];
	var options = result[1];

	var sceneHtml = fs.sceneTextToHtml (sceneText);
	sceneDiv.innerHTML = sceneHtml;
	recordSceneText (sceneText);

	statsDiv.innerHTML = makeStatusPage();

	var validOptions = new Array();
	for (var i = 0; i < options.length; ++i) {
	    if (options[i] instanceof Array
		&& (options[i].length == 1
		    || options[i].length == 2
		    || options[i].length == 3)) {
		validOptions.push (i);
	    }
	}

	var i = 0;
	var textboxHack;
	for (var j = 0; j < validOptions.length; ++j) {
	    while (i < validOptions[j]) {
		var emptyDiv = document.createElement("DIV");
		menuDiv.appendChild (emptyDiv);
		++i;
	    }
	    var choiceText = options[i][0];
	    if (typeof choiceText === 'undefined') { choiceText = 'Enter text:  '; }
	    var sceneFunction = options[i].length > 1 ? options[i][1] : undefined;
	    var inputVarName = options[i].length > 2 ? options[i][2] : undefined;
	    var textDiv = document.createTextNode (choiceText);
	    var inputDiv = document.createElement("input");
	    var labelDiv = document.createElement("label");
	    var textboxDiv;
	    if (options[i].length == 3) {
		inputDiv.setAttribute ("type", "text");
		inputDiv.setAttribute ("autofocus", "autofocus");
		inputDiv.onkeypress = function (e) {
		    if (e.keyCode == 13)
			continueButton.click();
		};
		if (eval("typeof " + inputVarName) != 'undefined') {
		    inputDiv.value = eval (inputVarName);
		}
		textboxDiv = inputDiv;
		labelDiv.appendChild (textDiv);
		labelDiv.appendChild (inputDiv);
		textboxHack = function() {
		    var ____val = textboxDiv.value;
		    eval (inputVarName + " = ____val;");  // code smell, should ensure inputVarName != "____val" I guess
		    var choiceIndex = fs.choiceHistory.pop();
		    fs.choiceHistory.push ([choiceIndex, inputVarName, ____val]);
		    return ____val;
		};
	    } else {
		inputDiv.setAttribute ("type", "radio");
		textboxDiv = undefined;
		if (choiceText === '') {
		    hideElement (labelDiv);
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
	    choiceFuncs.push (sceneFunction);
	    choiceTexts.push (choiceText);
	}

	if (typeof textboxHack != 'undefined') {
	    // activate/initialize the continue button, calling textboxHack to set the associated variable
	    continueButton.removeAttribute ("style");  // make sure button is visible
	    continueButton.onclick = function() {
		var text_func = getSelectedSceneFunction();
		var input_val = textboxHack();
		recordChoiceText(input_val);
		viewScene(text_func[1]); };
	} else if (validOptions.length > 0) {
	    // activate/initialize the continue button
	    continueButton.removeAttribute ("style");  // make sure button is visible
	    continueButton.onclick = function() {
		var text_func = getSelectedSceneFunction();
		recordChoiceText(text_func[0]);
		viewScene(text_func[1]); };
	} else {
	    // no choices, so hide button and show coda
	    continueButton.setAttribute ("style", "display: none");
	    var codaText = codaPage()[0];
	    recordSceneText (codaText);
	    codaDiv.innerHTML = fs.sceneTextToHtml (codaText);
	    codaParent.setAttribute ("style", "display: block");
	    restartButton.onclick = function() { location.reload(); };
	    window.onbeforeunload = undefined;
	}

	return undefined;  // a return value of undefined signifies no minigame on this page
    };

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    fs.loadSceneFile = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	var processed;
	try {
	    processed = FunkScene.parser.parse (raw);
	} catch (e) {
	    console.log (buildErrorMessage(e));
	}
	try {
	    eval (processed);
	} catch (e) {
	    console.log (processed);
	    console.log (e.message);
	}
    }

    fs.joinScenes = function (scenes) {
	var text = "";
	var choices = [];
	for (var i = 0; i < scenes.length; ++i) {
	    var f = scenes[i];
	    var result = f();
	    if (!fs.isFunction(result)) {  // ignore minigames here
		text = text + result[0];
		choices = choices.concat (result[1]);
	    }
	}
	return [text, choices];
    };

    fs.initialize = function() {
	viewScene (getStartPage());
	fs.choiceHistory = new Array;
    };

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
		    recordChoiceText (____val);
		} else {
		    choice_index = history_item;
		}
		var theChoice = choiceTexts[choice_index];
		var nextScene = choiceFuncs[choice_index];
		recordChoiceText (theChoice);
		do {
		    var minigame = viewScene (nextScene, i < history.length - 1);
		    var skip = fs.isFunction (minigame);
		    if (skip) {
			var nextSceneSymbol = history[++i];
			nextScene = eval (nextSceneSymbol);
		    }
		} while (skip);
	    }
	}
	fs.choiceHistory = history;
    };

    fs.makeMeterBar = function (level, color) {
	if (level < 0) { level = 0; }
	else if (level > 1) { level = 1; }
	var meterBarDiv = document.createElement("DIV");
	meterBarClass = "meter";
	if (typeof color != 'undefined') { meterBarClass += " " + color; }
	meterBarDiv.setAttribute ("class", meterBarClass);
	var meterBarSegment = document.createElement("SPAN");
	meterBarSegment.setAttribute ("style", "width: " + (100*level) + "%");
	meterBarDiv.appendChild (meterBarSegment);
	return meterBarDiv.outerHTML;
    };

    fs.runMinigame = function (introText, cazooCode, callbackFunc) {
	hideElement (statsButton);
	hideElement (historyButton);
	hideElement (storyButton);

	hideElement (storyParentDiv);
	hideElement (historyParentDiv);
	hideElement (statsParentDiv);

	var zoo = Cazoo.newZooFromString (cazooCode);

	minigameTextDiv.innerHTML = fs.sceneTextToHtml (introText);
	showElement (minigameDiv);

	function callbackWrapper(callbackArg) {
	    hideElement (minigameDiv);
	    showElement (statsButton);
	    showElement (historyButton);
	    showElement (storyParentDiv);
	    fs.choiceHistory.push (callbackArg);
	    return callbackFunc (eval (callbackArg));
	}

	return zoo.initialize (minigameBoardDiv, minigameToolbarDiv, callbackWrapper);
    };

})(FunkScene = {});
