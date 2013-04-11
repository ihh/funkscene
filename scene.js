var Start;

function viewScene (f) {
    var sceneDiv = document.getElementById("scene");
    var menuDiv = document.getElementById("menu");
    menuDiv.innerHTML = "";

    var text_options = f();
    var text = text_options[0];
    var options = text_options[1];

    sceneDiv.innerHTML = text;

    for (var i = 0; i < options.length; ++i) {
	var text = options[i][0];
	var sceneFunction = options[i][1];
	/* TODO: add option to menu */
    }
}

var continueButton = document.getElementById("continue");
continueButton.onclick = function() { viewScene(Start) };

