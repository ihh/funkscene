start = function() {
    return ["You stand before the gates of the Temple of Belsidore.",
            [["I smash the gates!", electrified],
             ["I walk away", wise_choice]]];
}

electrified = function() {
    return ["Several amps flow through your body. Think that doesn't sound like a lot? No, you don't think that, because you're dead.",
	    []];
}

wise_choice = function() {
    return ["A wise choice, my friend.",
	    []];
}
