
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
