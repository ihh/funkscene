FunkScene
=========

FunkScene is a dialect of JavaScript intended to encourage functional
programming in the creation of choose-your-own (CYO) interactive fiction.

Most JavaScript programs are valid FunkScene programs. In addition,
FunkScene provides a few macros to construct the staples of CYO fiction:
passages of text _("scenes")_ with choices that lead to other scenes.

This is not a full tutorial, but a quick-start guide for experienced JavaScript programmers.

Scene functions
---------------

The fundamental concept in the FunkScene JavaScript API is the _"scene function"._
A scene function returns a piece of _scene text_
(typically a statement, made by the narrator to the player, describing their character's experience: "You are in Melchior's Dungeon.")
along with a list of _choices_, each of which consists of a _choice text_
(a first-person statement in-character by the player to the narrator: "I pick up the mottled axe.")
and another _scene function_
(the next scene that's going to be displayed if the player makes that choice).

As a stylistic aside:
A common abbreviation of the player's first person statements ("I pick up the axe")
involves dropping the "I", yielding something a bit like a command ("Pick up the axe").
Each has their merits: first-person sentences invite the player to identify with the character,
while commands are shorter and evoke the tone of RPGs and parser-based IF.
It's usually a good idea to stick consistently to one style or the other.


Aesthetics
----------

A scene is always presented as a scene text followed by a choice list.
There are currently no inline hyperlinks or dropdown menus in FunkScene.
While links encourage close examination of a text, and indeed add extra semantics, they can detract from the pace of a story and the balancing of choices.
A strict separation of scene and choices is restrictive in some ways, but it simplifies the syntax, and this helps the story flow.

The design philosophy of FunkScene is

1. a simple wiki-like syntax for building CYO stories (building on predecessor languages such as ChoiceScript and Twine)
2. an emphasis on choice lists (c.f. ChoiceScript) over hyperlinks (Twine) and drop-down menus (Schooz)
3. a functional programming style (building on an earlier prototype, Schooz)


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
uses only the constructs added by FunkScene. Incidentally, all FunkScene keywords
begin with a `#`; if you need to use an actual hash symbol in your
JavaScript or your text, escape it as a double hash `##`. Hash signs followed by numbers,
like `#1`, do not need to be escaped.

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

Playing the game
----------------

To play the Temple of Belsidore "game", you will need to save it with a filename like
`mygame.scene` and then edit the supplied `index.html` file to contain the following
(after all other `script` and `link` blocks):

	<script type="text/javascript">
	  loadSceneFile ("mygame.scene");
	  initialize();
	</script>

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

	#IF <JavaScript expression> #CHOOSE <text> #FOR <page variable name>

or the anonymous version (no page variable)

	#IF <JavaScript expression> #CHOOSE <text> #FOR #( <scene> #)


Choices that are invisible when disabled
----------------------------------------

	#SECRETLY #IF <expression> #CHOOSE <text> #FOR <page variable name>
	#SECRETLY #IF <expression> #CHOOSE <text> #FOR #( <scene> #)


Beginnings, endings, middles
----------------------------

Note that one of the scene functions is called `start`; regardless of
where it is declared in the program, this will always be the first
scene the player sees.

The other two scenes (page variables `electrified` and `wise_choice`) are
_dead-ends:_ they have zero choices available to the player, and are therefore
interpreted as game-ending scenes (unless there is an implicit continuation;
see below). You can optionally add the keyword `#OVER` at the end of
a dead-end scene, to indicate that this was a deliberate dead-end and
the game is over at that point (this will overrule the implicit continuation,
if there is one).

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

A scene can also end with a statement of the form `#GOSUB x #GOTO y`
or with a `#CONTINUE`, which is loosely equivalent to returning from a `#GOSUB`,
but it can also be used to schedule scenes in a more general way,
e.g. as a queue; see below.

If what you want is for one scene to flow seamlessly into another with
no detectable interruption, use `#INCLUDE`, like so:

	hair_status = "messy"
	
	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore.
	#INCLUDE messy_hair
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR wise_choice
	#ENDSCENE

	#PAGE messy_hair
	#SCENE Your hair is very #[ hair_status #].
	#CHOOSE I brush my hair #FOR #( You preen. #{ hair_status = "neat" #} #GOTO #PREVIOUS #)
	#ENDSCENE

The keyword `#PREVIOUS` yields the previous scene function, while
`#CURRENT` gives the current one. Because `#GOTO #PREVIOUS` is a common construct, this can be shortened to `#BACK`.

Scheduling scenes for later
---------------------------

FunkScene includes a rudimentary scene queue, that you can use to schedule scenes for a later stage.
You don't have to use this queue; as long as you stay away from the keywords `#GOSUB`, `#STACK`, `#QUEUE` and `#CONTINUE`,
you need never worry about it.
(The queue is useful for some common scheduling patterns, such as side-quests; but to rely too heavily on `#GOSUB` is to miss
other interesting applications of functional programming patterns to narrative, such as coroutines for parallel plots.)

To make use of the queue, the keywords are `#STACK <scene>` and `#QUEUE <scene>`, which can go anywhere in the scene text.
`#STACK` puts the scene on the front of the scene queue, whereas `#QUEUE` puts it at the back.
Both will postpone the delayed scene until a scene ending with `#CONTINUE` is reached.

As an alternative to `#STACK`, at the end of a scene you can use `#GOSUB` followed by `#GOTO`, like so:

	#PAGE battle
	#SCENE You fight valiantly against the stronger opponent.
	#GOSUB death_blow
	#GOTO afterlife
	#ENDSCENE
	
	#PAGE death_blow #( One slip is all it takes. A powerful blow pierces your helmet. It's all over. #)
	
	#PAGE afterlife #( Well, here you are in Heaven. Everything it's cracked up to be. #)

The following version of the `battle` scene is exactly equivalent, if a bit cryptic ---
it shows explicitly how `#GOSUB` pushes its return continuation onto the stack:

	#PAGE battle
	#SCENE You fight valiantly against the stronger opponent.
	#STACK afterlife
	#GOTO death_blow
	#ENDSCENE

In fact, the following version is also equivalent:

	#PAGE battle
	#SCENE You fight valiantly against the stronger opponent.
	#FLUSH
	#QUEUE death_blow
	#QUEUE afterlife
	#CONTINUE
	#ENDSCENE

The `#FLUSH` is only necessary if there might be other scenes on the queue already
(its effect is to clear the queue).

Note that you can chain `#GOSUB` clauses together:

	#PAGE battle
	#SCENE You fight valiantly against the stronger opponent.
	#GOSUB death_blow
	#GOSUB in_limbo
	#GOTO afterlife
	#ENDSCENE


Implicit continuation
---------------------

Consider the following code:

	#PAGE in_plane
	#SCENE Are you ready?
	#CHOOSE Definitely! #FOR #( That's the spirit! #GOTO jump #)
	#CHOOSE Just about. #FOR #( Good! #GOTO jump #)
	#CHOOSE Maybe... #FOR #( I'll take that as a yes! #GOTO jump #)
	#CHOOSE No. #FOR #( Alright, maybe another time. #OVER #)
	#ENDSCENE
	
	#PAGE jump
	#SCENE You pull the ripcord and jump...
	#GOTO free_fall
	#ENDSCENE

The `jump` scene clearly follows on from the `in_plane` scene, and most of the choices from `in_plane` go straight to `jump`.
There is a simpler way to write passages like this:
you can omit the `#ENDSCENE` at the end of the first block (`in_plane`),
along with the `#PAGE` and `#SCENE` at the start of the second (`jump`), so that the two scenes flow together.
Any dead-end choices from the first block will implicitly `#GOTO` the second block, unless they're explicitly flagged as game-over scenes with `#OVER`.

	#PAGE in_plane
	#SCENE
	Are you ready?
	#CHOOSE Definitely! #FOR #( That's the spirit! #)
	#CHOOSE Just about. #FOR #( Good! #)
	#CHOOSE Maybe... #FOR #( I'll take that as a yes! #)
	#CHOOSE No. #FOR #( Alright, maybe another time. #OVER #)
	You pull the ripcord and jump...
	#GOTO free_fall
	#ENDSCENE

You can also keep the scenes separate, but specify a default continuation
explicitly, with a `#GOTO` at the end of the first scene.

	#PAGE in_plane
	#SCENE Are you ready?
	#CHOOSE Definitely! #FOR #( That's the spirit! #)
	#CHOOSE Just about. #FOR #( Good! #)
	#CHOOSE Maybe... #FOR #( I'll take that as a yes! #)
	#CHOOSE No. #FOR #( Alright, maybe another time. #OVER #)
	#GOTO jump
	#ENDSCENE
	
	#PAGE jump
	#SCENE You pull the ripcord and jump...
	#GOTO free_fall
	#ENDSCENE

At the top level (i.e. not within recursively nested `#SCENE` blocks),
yet another option is to have the scenes flow together (implicit continuation)
but explicitly keep the `#PAGE` label as well, so you can still `#GOTO jump`
from elsewhere in the story:

	#PAGE in_plane
	#SCENE Are you ready?
	#CHOOSE Definitely! #FOR #( That's the spirit! #)
	#CHOOSE Just about. #FOR #( Good! #)
	#CHOOSE Maybe... #FOR #( I'll take that as a yes! #)
	#CHOOSE No. #FOR #( Alright, maybe another time. #OVER #)
	#PAGE jump
	You pull the ripcord and jump...
	#PAGE free_fall
        You are in free fall.
	...
	#ENDSCENE

This does not work within recursively declared blocks, i.e. you cannot combine
`#PAGE` and implicit continuation except at the top level; in fact, you can't
use `#PAGE` at all except at the top level.

Here is a longer code excerpt, wherein several scenes are run together using implicit continuations.
Note how you can also use `#GOSUB` and `#INPUT` as "hinges" or "conjunctions" between scenes.

	#PAGE start
	#SCENE
	Here we go.
	#GOSUB are_you_ready
	#GOSUB i_hope_so
	Better tell me your name.
	#INPUT Type your name: #TO name
	Hi, #$name.
	Time for some choices.
	#CHOOSE An irrelevant choice. #FOR #( Hope you're pleased with yourself. #)
	#CHOOSE Another irrelevant choice. #FOR #( Completely pointless. #)
	#CHOOSE Kill myself. #FOR #( First sensible thing you've said. #OVER #)
	Some more scene text.
	#CHOOSE A ditzy choice. #FOR #( Squee! #)
	#CHOOSE A dumb choice. #FOR #( Woohoo! #)
	Even more scene text.
	#CHOOSE A terminal choice. #FOR #( YOU ARE DEAD! #)
	#CHOOSE A final choice. #FOR #( GAME OVER! #)
	#END
	
	#PAGE are_you_ready #( Are you ready?
	  #CHOOSE Yes. #FOR #( Great! #CONTINUE #)
	  #CHOOSE No. #FOR #( That's too bad! #CONTINUE #) #)

	#PAGE i_hope_so #( Seriously, I hope you ARE ready. #CONTINUE #)

Another useful form of implicit continuation is the `#IF...#GOTO...` construct:

	#PAGE inside_temple
	#SCENE
	Finally, you are inside the temple. But is your soul pure?
	#IF #ACHIEVED penance #GOTO inner_sanctum
	Your skin begins to prickle and burn. Flames spring from your clothing.
	The reasons for spontaneous human combustion are unclear; it's not even
	clear if it is, indeed, a natural phenomenon. However, it's certainly a
	supernatural one, and it's also pretty clear the Gods don't like you.
	#ENDSCENE

	#PAGE inner_sanctum
	#SCENE
	...

This is simply the implicit form of the following continuation

	#PAGE inside_temple
	#SCENE
	Finally, you are inside the temple. But is your soul pure?
	#GOTO (#ACHIEVED penance ? inner_sanctum : combustion)
	#ENDSCENE

	#PAGE combustion
	#SCENE
	Your skin begins to prickle and burn. Flames spring from your clothing.
	The reasons for spontaneous human combustion are unclear; it's not even
	clear if it is, indeed, a natural phenomenon. However, it's certainly a
	supernatural one, and it's also pretty clear the Gods don't like you.
	#ENDSCENE

	#PAGE inner_sanctum
	#SCENE
	...


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

This will allow only one of the two "As penance, I..." choices to be taken.
You can explicitly set these flags using `#ACHIEVE penance`, you can clear them using `#FAIL penance`,
and you can test if they're set using the expression `#ACHIEVED penance`.


Scenes that cycle through several different descriptions
--------------------------------------------------------

The following, as part of a scene, will cycle predictably through several statements about the weather

	#CYCLE The wind sighs.
	#NEXT A light rain spatters.
	#NEXT You feel a chill.
	#LOOP

If you want to stop at the last one, use `#STOP` instead of `#LOOP`

	#CYCLE You saunter into the lobby, drawing sharp glances from the conservatively-dressed bankers.
	#NEXT The bankers are pretending not to notice you. You brush some imaginary phlegm off your leather jacket.
	#NEXT This bank has gotten used to you. Time to take your punk ass elsewhere.
	#STOP

If you want access to the current state of the cycler, you can give the state variable a name

	#CYCLE(wind) The wind sighs.
	#NEXT A light rain spatters.
	#NEXT You feel a chill.
	#LOOP
	#SECRETLY #IF wind == 2 #CHOOSE I pull my cloak tighter around me. #FOR #( Wimp. #BACK #)

The state is an integer starting at zero; so, in the above example, the option to pull the cloak tighter
only appears when the text about feeling a chill has been shown.

Note that there cannot be any whitespace between the `#CYCLE` and the opening bracket.


Programmatically generated choice lists
---------------------------------------

As well as just generating scene functions directly in JavaScript or FunkScene,
you can build them with a mix of the two,
using `#CHOICES` to specify the choice list directly

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOICES
	 [["I smash the gates!", electrified],
	  ["I walk away", wise_choice]]
	#ENDSCENE

and mixing `#CHOOSE...#FOR...` blocks with JavaScript code

	#PAGE start
	#SCENE You stand before the gates of the Temple of Belsidore. A sign reads "BEWARE!"
	#CHOICES
	 [["I smash the gates!", electrified],
	  #CHOOSE I walk away #FOR wise_choice
	 ]
	#ENDSCENE

Note that in a `#CHOICES` block (and unlike in the usual choice list environment),
you need to specify choice-separating commas and `[...]` array delimiters explicitly,
even when using `#CHOOSE...#FOR` blocks to describe individual choices.


Embedding and interpolating code in text
----------------------------------------

To evaluate a JavaScript expression and interpolate the result into text, use

	#EVAL <expression> #TEXT

or the shorter form

	#[ <expression> #]

If all you want is the contents of a JavaScript `var` then use

	#$<varname>

To execute JavaScript statements, use this construct:

	#{ <...statements...> #}

You can also use `#IF...#THEN...#ELSIF...#ELSIF...#ELSE...#ENDIF`
to conditionally display certain pieces of text.


Text input direct to variables
------------------------------

	name = "Adventurer"

	#PAGE start
	#SCENE Before we do anything, #$name, how about you tell me your name?
	#INPUT Type your name: #TO name #GOTO thanks
	#ENDSCENE

	#PAGE thanks
	#SCENE Thanks, #$name !
	#GOTO next
	#ENDSCENE

	#PAGE next
	...

The general form is always

	#PAGE <name of page variable>
	#SCENE <...scene text...>
	#INPUT <...prompt text...> #TO <name of input variable>
	#GOTO <next page>
	#ENDSCENE

No other choices are allowed: it has to be a single text box, and a `#GOTO`.

This is represented in the JavaScript API as a single choice that is a triple, interpreted as _(prompt text, next scene, name of input variable)_,
instead of the usual _(choice text, next scene)_ pair.


JavaScript API
--------------

A scene function is a JavaScript function, taking no arguments,
which (when called) must return an array containing two objects:

1. a text string (the _"scene text"_ ),
2. an array of choices (the _"choice list"_ ).

Each choice in the choice list is itself an array containing (usually)
two objects:

1. a text string (the _"choice text"_ ),
2. a scene function (the _"choice target"_ ).

The JavaScript API has special interpretations for certain edge cases
(the FunkScene keywords `#GOTO`, `#IF`, `#ONCE` etc., make use of these):

* An empty choice list signifies that the game is over.
* If the choice text is an empty string, the choice will be
  hidden. (This is used to implement the `#GOTO` case where no choice
  list is to be shown, but the game should still continue, so there
  still needs to be a default choice.)
* If the choice is an empty array `[]` instead of a two-element array,
  then that choice will not even be displayed. (This is used as a placeholder
  for choices that failed a `#SECRETLY #IF`, `#AS` or `#ONCE` test.)
* If the choice text is present but the choice target is missing
  (i.e. the choice is a one-element array instead of a two-element
  array), of if the choice target is `undefined`, the choice text will be shown
  grayed-out and the choice will be disabled. (This is used to implement hints about
  choices that could be unlocked, i.e. failed `#IF` tests.)
* If there is only one choice in the choice list, and that choice is a
  three-element array instead of the usual two-element array, then
  the third element is interpreted as the name of a variable to store
  direct text input from the player, as generated by an `#INPUT` clause.

Several helper functions and data structures are defined as methods and members of the `funkscene` object in `scene.js`:

* The `choiceHistory` array holds the history of choices (with each choice represented as an integer index into the choice list).
* The `restore` method can be used to replay a history.
* The `continuationScene` method can be overridden to implement a different system for scheduling scenes with `#CONTINUE`.
* The `sceneTextToHtml` method can be overridden to implement a different text markup.

