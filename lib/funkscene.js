(function (fs) {
    // DOM hooks
    var sceneDiv = document.getElementById("scene");
    var menuDiv = document.getElementById("menu");
    var buttonsDiv = document.getElementById("buttons");
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
    var sigmaParentDiv = document.getElementById("debugger");
    var sigmaDiv = document.getElementById("debuggerMap");
    var debugInfoDiv = document.getElementById("debuggerInfo");
    var debugLooseEndsDiv = document.getElementById("debuggerLooseEnds");

    // Debugging info
    var debuggerDisabled = 0;  // used to temporarily disable debugger while evaluating status page
    fs.startDebugger = function() { if (!fs.debugging()) fs.debug = {}; };
    fs.disableDebugger = function() { ++debuggerDisabled; };
    fs.enableDebugger = function() { --debuggerDisabled; };
    fs.debugging = function() { return typeof(fs.debug) != "undefined" && debuggerDisabled == 0; };

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

    // distinguished global page variables are 'statusPage', 'codaPage' and 'start'
    var getStartPage = function() { return start; }
    var makeStatusPage = function() {
	fs.disableDebugger();
	var content = statusPage()[0];
	fs.enableDebugger();
	return content;
    };

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

    fs.isSpecialNode = function(id) {
	return id == "statusPage" || id == "codaPage";
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

    function bugHtml(str) {
	return "<b><font color=\"red\">BUG</font></b> : " + str;
    };

    // viewScene
    //  f: the current scene function
    //  fastForward: flag indicating whether we are in replay mode, with more scenes coming
    // Return type signifies status of minigame on this page:
    //  Game object => minigame initialized and running
    //  Function => minigame was not initialized, initializer returned
    //  undefined => no minigame on this page
    function viewScene(f,fastForward) {
	menuDiv.innerHTML = "";
	sceneDiv.innerHTML = bugHtml("Check Debugger Map or Console");
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

	var textboxHack;
	// loop through options
	for (var i = 0, j = 0; j < validOptions.length; ++j) {

	    while (i < validOptions[j]) {
		if (!fastForward) {
		    var emptyDiv = document.createElement("DIV");
		    menuDiv.appendChild (emptyDiv);
		}
		++i;
	    }

	    var choiceText = options[i][0];
	    if (typeof choiceText === 'undefined') { choiceText = 'Enter text:  '; }
	    var sceneFunction = options[i].length > 1 ? options[i][1] : undefined;

	    choiceTexts.push (choiceText);
	    choiceFuncs.push (sceneFunction);

	    if (!fastForward) {
		// decorate the DOM
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
	    }
	}

	// hook up the continue button
	if (!fastForward)
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
		fs.disableDebugger();
		var codaText = codaPage()[0];
		fs.enableDebugger();
		recordSceneText (codaText);
		codaDiv.innerHTML = fs.sceneTextToHtml (codaText);
		codaParent.setAttribute ("style", "display: block");
		restartButton.onclick = function() { location.reload(); };
		window.onbeforeunload = undefined;
	    }

	// a return value of undefined signifies no minigame on this page
	return undefined;
    };

    function buildErrorMessage(e) {
	return e.line !== undefined && e.column !== undefined
	    ? "Line " + e.line + ", column " + e.column + ": " + e.message
	    : e.message;
    }

    var graphXmlString;
    fs.lastLoadedFile = "";
    fs.loadSceneFile = function (url) {
	fs.lastLoadedFile = url;
	console.log ("Loading scenes from \"" + url + "\"");
	var xhr = new XMLHttpRequest();
	xhr.open ("GET", url, false);
	xhr.send();
	var raw = xhr.responseText;
	var processed;
	try {
	    console.log ("Compiling scenes to JavaScript");
	    processed = FunkScene.parser.parse (raw);
	} catch (e) {
	    console.log (buildErrorMessage(e));
	}
	try {
	    console.log ("Evaluating compiled JavaScript");
	    eval (processed);
	} catch (e) {
	    console.log (processed);
	    console.log (e.message);
	}

	if (fs.debugging()) {
	    try {
		console.log ("Generating map XML");
		graphXmlString = FunkScene.graphGenerator.parse (raw);
	    } catch (e) {
		console.log (buildErrorMessage(e));
	    }
	}

	console.log ("OK, done compiling \"" + url + "\"");
    }

    function xmlDocFromString (str) {
	var xmlDoc;
	if (window.DOMParser) {
	    var parser = new DOMParser();
	    xmlDoc = parser.parseFromString (str,"text/xml");
	} else {
	    // Internet Explorer
	    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
	    xmlDoc.async = false;
	    xmlDoc.loadXML (str); 
	}
	return xmlDoc;
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
	hideElement (buttonsDiv);

	hideElement (storyParentDiv);
	hideElement (historyParentDiv);
	hideElement (statsParentDiv);

	var zoo = Cazoo.newZooFromString (cazooCode);

	minigameTextDiv.innerHTML = fs.sceneTextToHtml (introText);
	showElement (minigameDiv);

	function callbackWrapper(callbackArg) {
	    fs.choiceHistory.push (callbackArg);
	    hideElement (minigameDiv);
	    showElement (buttonsDiv);
	    showElement (storyParentDiv);
	    // yield control back to FunkScene
	    return callbackFunc (eval (callbackArg));
	}

	return zoo.initialize (minigameBoardDiv, minigameToolbarDiv, callbackWrapper);
    };


    var dfsLayoutThreshold = 10;  // controls the transition from depth-first search to breadth-first search in map layout
    var sigInst;
    var bfsRank = {}, bfsCount = 0;

    function initializeMap() {

	var graphXmlDoc = xmlDocFromString (graphXmlString);

	if (sigInst)
	    while (sigmaDiv.hasChildNodes())
		sigmaDiv.removeChild (sigmaDiv.lastChild);

	// Instantiate sigma.js and customize rendering
	sigInst = sigma.init(sigmaDiv).drawingProperties({
	    defaultLabelColor: '#000',
	    defaultLabelSize: 14,
	    defaultLabelBGColor: '#000',
	    defaultLabelHoverColor: '#048',
	    labelThreshold: 6,
	    defaultEdgeType: 'curve',
	    defaultEdgeColor: '#000',
	    defaultNodeColor: '#222'
	}).graphProperties({
	    minNodeSize: 0.1,
	    maxNodeSize: 5,
	    minEdgeSize: 2,
	    maxEdgeSize: 2
	}).mouseProperties({
	    maxRatio: 32
	});

	// Parse the GEXF encoded graph
	sigInst.parseGexfXmlDoc(graphXmlDoc);

	// hook up some functions
	function mouseOverNode(event) {
	    var node;
	    sigInst.iterNodes(function(n){
		node = n;
	    },[event.content[0]]);

	    fs.showNodeInfo (node);
	}
	    
	function mouseOffNode(event) {
	    debugInfoDiv.innerHTML = fs.debug.looseEndHtml;
	}
	
	sigInst.bind('overnodes',mouseOverNode);
	//	sigInst.bind('outnodes',mouseOffNode);

	// Turn on the fish eye
	sigInst.activateFishEye();

	// show loose end text
	debugLooseEndsDiv.innerHTML = fs.debug.looseEndHtml;

	// circular layout function
	sigma.publicPrototype.circularLayout = function(sortFunc) {
	    var R = 100,
	    i = 0,
	    L = this.getNodesCount();
	    
	    var ids = [];
	    this.iterNodes (function(n){ids.push(n.id);});
	    ids = ids.sort(sortFunc);
	    this.iterNodes(function(n){
		n.x = -Math.cos(2*Math.PI*i/L)*R;
		n.y = -Math.sin(2*Math.PI*(i++)/L)*R;
	    }, ids);
	    
	    return this.position(0,0,1).draw();
	};

	// do a modified breadth-first sort of the nodes
	// the modification is to switch to depth-first for gotos (i.e. edges from nodes with outdegree one)
	// or while the queue size is below some threshold
	var outgoing = {}, incoming = {}, nOut = {}, unmarked = {};
	fs.debug.outgoing = outgoing;
	fs.debug.incoming = incoming;

	sigInst.iterNodes (function(node) {
	    outgoing[node.id] = {};
	    incoming[node.id] = {};
	    nOut[node.id] = 0;
	    unmarked[node.id] = 1;});

	sigInst.iterEdges (function(edge) {
	    outgoing[edge.source][edge.target] = edge;
	    incoming[edge.target][edge.source] = edge;
	    nOut[edge.source]++;});

	var queue = [];
	function visit(id) {
	    if (unmarked[id]) {
		queue.push(id);
		bfsRank[id] = bfsCount++;
		delete unmarked[id];
		// the modified DFS step:
		if (nOut[id] == 1 || queue.length < dfsLayoutThreshold)
		    visitChildren(id);
	    }
	};
	function visitChildren(source) {
	    for (var target in outgoing[source])
		visit (target);
	};
	var starts = ["start"];
	while (starts.length) {
	    visit (starts.shift());
	    while (queue.length)
		visitChildren (queue.shift());
	    starts = Object.keys (unmarked);
	}
    }

    // called by scene function
    var firstNodeColor = "#604080", firstNodeScaleFactor = 2;
    fs.locateDebugger = function(firstNodeId) {

	if (fs.debugging()) {

	    initializeMap();  // it's inefficient to call this every time, but seems to be only way to reset node colors/sizes?
	    debugLooseEndsDiv.innerHTML = fs.debug.looseEndHtml + "<br>Current node: <i><font color=\"" + firstNodeColor + "\">" + firstNodeId + "</font></i>";

	    if (typeof firstNodeId == 'undefined')
		firstNodeId = "start";

	    // find the current node, restyle it
	    var firstNode;
	    sigInst.iterNodes(function(n){
		firstNode = n;
		firstNode.color = firstNodeColor;
		firstNode.size *= firstNodeScaleFactor;
	    }, [firstNodeId]);

	    // circular layout using BFS ranking
	    sigInst.circularLayout(function(a,b){
		var aRank = (bfsRank[a] + bfsCount - bfsRank[firstNodeId]) % bfsCount;
		var bRank = (bfsRank[b] + bfsCount - bfsRank[firstNodeId]) % bfsCount;
		return aRank - bRank;
	    });

	    // show info
	    fs.showNodeInfo (firstNode);
	}
    }

    function attributesToList(attr) {
	return '<ul>' +
	    attr.map(function(o){
		return '<li><b>' + o.attr + '</b> : ' + o.val + '</li>';
	    }).join('') +
	    '</ul>';
    }

    fs.showNodeInfo = function(node) {
	var attr = node['attr']['attributes'].slice(0);
	var label = node.id in fs.debug.nodeName ? fs.debug.nodeName[node.id] : undefined;
	if (typeof(label) != 'undefined' && label != node.id)
	    attr.unshift ({ attr: "Label", val: label });
	attr.unshift ({ attr: "ID", val: node.id });

	var incoming = fs.debug.incoming[node.id];
	var outgoing = fs.debug.outgoing[node.id];

	for (var inc in incoming) {
	    var attr_val = { val: incoming[inc].label };
	    attr_val.attr = "From " + inc;
	    attr.push (attr_val);
	}

	for (var out in outgoing) {
	    var attr_val = { val: outgoing[out].label };
	    attr_val.attr = "To " + out;
	    attr.push (attr_val);
	}

	debugInfoDiv.innerHTML = "<h2>Node Info</h2>" + attributesToList(attr);
    }
	

})(FunkScene = {});
