FunkScene
=========

FunkScene is a dialect of JavaScript intended to encourage functional
programming in the creation of choice-based interactive fiction (IF).

Most JavaScript programs are valid FunkScene programs. In addition,
FunkScene provides a few macros to construct the staples of
choice-based IF: passages of text _("scenes")_ with choices that lead
to other scenes.

Scene functions
---------------

The fundamental concept in the FunkScene JavaScript API is the _"scene function"._
A scene function returns a piece of _scene text_ (a second-person present-tense statement by the narrator
to the player, describing the scene: "You are in the room") along with a list of _choices_, each of which
consists of a _choice text_ (a first-person statement by the player to the narrator: "I pick up the axe.")
and another _scene function_ (the next thing that's going to happen if the player takes that choice).

FunkScene language
------------------

FunkScene is JavaScript, plus a few keywords for constructing scene
functions, and a small amount of boilerplate code for hooking up scene
text and choice list to the DOM.

The following FunkScene describes a tiny story composed of three
vanilla scene functions, with one choice-point:

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR wise_choice
	#ENDSCENE

	#PAGE electrified
	#SCENE Several amps flow through your body.
	Think that doesn't sound like a lot? No, you don't think that, because you're dead.
	#ENDSCENE

	#PAGE wise_choice
	#SCENE A wise choice, my friend.
	#ENDSCENE

That doesn't look much like JavaScript, because it isn't: this program
uses only the constructs added by FunkScene (all FunkScene keywords
begin with a `#`; if you need to use an actual hash symbol in your
JavaScript or your text, escape it as a double hash `##`).

JavaScript object code
----------------------

FunkScene is compiled internally to JavaScript. The Temple of Belsidore
compiles to the following:

	start = function() {
	    return ["You stand before the gates of the Temple of Belsidore. A sign reads \"BEWARE!\"",
	            [["I smash the gates!", electrified],
	             ["I walk away", wise_choice]]];
	};

	electrified = function() {
	    return ["Several amps flow through your body. Think that doesn't sound like a lot? No, you don't think that, because you're dead.",
		     []];
	};

	wise_choice = function() {
	    return ["A wise choice, my friend.",
	     []];
	};

Note that the quotation marks around `"BEWARE!"` do not need to be escaped in the
FunkScene macro; they are automatically escaped in the compiled
JavaScript.

JavaScript API
--------------

A scene function is a JavaScript function, taking no arguments,
which (when called) must return an array containing two objects:

1. a text string (the _"scene text"_ ),
2. an array of choices (the _"choice list"_ ).

Each choice in the choice list is itself an array containing two
objects:

1. a text string (the _"choice text"_ ),
2. a scene function (the _"choice target"_ ).

The JavaScript API has special interpretations for certain edge cases
(the FunkScene macros `#GOTO` and `#IF` make use of some of these):

* An empty choice list signifies that the game is over.
* If the choice text is an empty string, the choice will be
  hidden. (This is used to implement the `#GOTO` case where no choice
  list is to be shown, but the game should still continue, so there
  still needs to be a default choice.)
* If a choice target is undefined, the choice text will be shown but
  grayed-out and the choice disabled. (Used to implement hints about
  choices that could be unlocked, i.e. failed `#IF` tests.)

Several other helper functions are defined in `scene.js`.
The `choiceHistory` array holds the history of choices (with each choice
represented as an integer index into the choice list). The `restore()`
function can be used to replay a history.


Playing the game
----------------

To play the Temple of Belsidore "game", you will need to save it with a filename like
`mygame.scene` and then edit the supplied `index.html` file as follows:

	<script type="text/javascript">
	  loadSceneFile ("mygame.scene");
	  initialize();
	</script>

The `index.html` file will also include a couple other scripts

	<script type="text/javascript" src="grammar.js"></script>
	<script type="text/javascript" src="scene.js"></script>

and should contain some minimal DOM structure

	<div id="scene"> </div> ...
	<form action="#" class="menu" id="menu"> </form> ...
	<button type="button" class="continue" id="continue">
	 Continue
	</button>

You'll then need to open `index.html` over a web connection (i.e. an
`http` URL, not a `file` URL, because the `loadSceneFile` function
needs to do an `XMLHttpRequest`). So you'll need to put the
`funkscene` directory somewhere web-servable, or create a symlink.


General format of a scene declaration
-------------------------------------

The general format of the FunkScene `#PAGE...#SCENE...#ENDSCENE` macro,
which constructs a scenefunction and assigns it to a JavaScript `var` (the _"page variable"_ ),
is as follows (NB newlines are not significant, they are treated
exactly the same as any other whitespace):

	#PAGE <name of page variable>
	#SCENE <...scene text...>
	#CHOOSE <...choice text...> #FOR <name of target page variable>
	#CHOOSE <...more choice text...> #FOR <another page variable name>
	 <more #CHOOSE...#FOR... blocks here, if you want them>
	 <...>
	#ENDSCENE

You can use `#(...#)` in place of `#SCENE...#ENDSCENE`, if cryptic
uber-efficiency via punctuation is your thing. (Actually, this has an
added benefit that you can use many text editors'
parenthesis-balancing feature to check that your brackets match.)


Anonymous scene functions
-------------------------

You can declare scenes in nested (inline) fashion, as well as
standalone blocks. For example:

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR
	 #SCENE Are you sure?
	 #CHOOSE Yes #FOR wise_choice
	 #CHOOSE No #FOR start
	 #ENDSCENE
	#ENDSCENE

...or...

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR
	 #( Are you sure?
	  #CHOOSE Yes #FOR wise_choice
	  #CHOOSE No #FOR start
	 #)
	#ENDSCENE


Choices that can be disabled but still visible
----------------------------------------------

The choice can be prefixed by `#IF <JavaScript expression>`, e.g.

	#IF <JavaScript expression> #CHOOSE <text> #FOR <page name>

or the anonymous version

	#IF <JavaScript expression> #CHOOSE <text> #FOR #( <scene> #)


Choices that are invisible when disabled
----------------------------------------

	#SECRETLY #IF <expression> #CHOOSE <text> #FOR <page name>
	#SECRETLY #IF <JavaScript expression> #CHOOSE <text> #FOR #( <scene> #)


Beginnings, endings, middles
----------------------------

Note that one of the scene functions is called `start`; regardless of
where it is declared in the program, this will always be the first
scene the player sees.

The other two scenes (page names `electrified` and `wise_choice`) have
zero choices available to the player, and are therefore interpreted as
game-ending scenes.

For middle passages, i.e. scenes that have only one choice, you can
either list a single choice, emphasizing that the player is taking the
only course of action available:

	#PAGE hanging_on
	#SCENE You hang onto the ledge for as long as possible,
	  but the pain is unbearable. Eventually you have no choice but to...
	#CHOOSE ...let go #FOR #( You let go, and plummet to your doom. #)
	#ENDSCENE

Or, you can use the special `#GOTO` keyword, which hides the choice list
altogether, but still forces the player to click a button to move to the next
scene:

	#PAGE drink_wine
	#SCENE The wine burns the back of your throat. Poison! You reach for
	 the door, but your legs buckle and the door-handle recedes down a
	 tunnel as you slip into unconsciousness...
	#GOTO handcuffed_to_chair
	#ENDSCENE

Note the final `#ENDSCENE` delimiter is still required after a `#GOTO`.
(You can optionally use `#END` any place you can use `#ENDSCENE`, too.)

If what you want is for one scene to flow seamlessly into another with
no detectable interruption, use `#APPEND`, like so:

	hair_status = "messy"
	
	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore.
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR wise_choice
	#APPEND messy_hair
	#ENDSCENE

	#PAGE messy_hair
	#SCENE Your hair is very #[ hair_status #].
	#CHOOSE I brush my hair #FOR #( You preen. #{ hair_status = "neat" #} #GOTO #PREVIOUS #)
	#ENDSCENE

The keyword `#PREVIOUS` yields the previous scene function, while
`#CURRENT` gives the current one. Because `#GOTO #PREVIOUS` is a common construct, this can be shortened to `#BACK`.

One-time choices
----------------

Prefix a choice with `#ONCE` to indicate that it can only be selected once (after which it will disappear)

	#PAGE start
	#SCENE You're on the train to Hell.
	#ONCE #CHOOSE I play cards. #FOR #( You play a few games of cards, or was it a few thousand? Before long you're bored. #BACK #)
	#ONCE #CHOOSE I play dice. #FOR #( You play some dice games, but quickly lose your money. #BACK #)
	#ONCE #CHOOSE Fornicate. #FOR #( CENSORED #BACK #)
	#CHOOSE Go to hell #FOR #( Welcome to Hell, sinner. #)
	#ENDSCENE

If you have a group of choices and you want them all to disappear as soon as the player selects one of them, use `#AS`
to tag them all as belonging to the same group:

	#AS penance #CHOOSE As penance, I cross myself. #FOR #( You cross yourself, in penance. #BACK #)
	#AS penance #CHOOSE As penance, I regurgitate my last meal. #FOR #( You retch, purging yourself of evil. #BACK #)

This will allow only one of the two "As penance..." choices to be taken.

Programmatically generated choice lists
---------------------------------------

As well as just generating them directly in JavaScript, you can build
scene functions using a mix of JS and FunkScene:

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOICES
	 [["I smash the gates!", electrified],
	  ["I walk away", wise_choice]]
	#ENDSCENE

or even

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOICES
	 [["I smash the gates!", electrified],
	  #CHOOSE I walk away #FOR wise_choice
	 ]
	#ENDSCENE

Note that in a `#CHOICES` block, you need to specify commas and `[...]`
array delimiters explicitly, even when using `#CHOOSE...#FOR` blocks.


Embedding and interpolating code in text
----------------------------------------

To evaluate a JavaScript expression and interpolate the result into text, use

	#EVAL <expression> #TEXT

or the shorter form

	#[ <expression> #]

If all you want is the contents of a JavaScript `var` then use

	#$<varname>

To execute JavaScript statements inside a function context with private scope,
whose return value (if any) will be interpolated into the text,
use this form:

	#{ <...statements...> #}

This...

	#{ return "Hi there" #}

...gives the same result as this...

	#[ "Hi there" #]

...although they are implemented slightly differently:
statements inside a `#{...#}` block are run inside an anonymous closure.


Text input directly to variables
--------------------------------

TBD.
