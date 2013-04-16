FunkScene Language Quick Start for JavaScript programmers
=========================================================

FunkScene is a dialect of JavaScript intended to encourage functional
programming in the creation of choice-based interactive fiction (IF).

Most JavaScript programs are valid FunkScene programs. In addition,
FunkScene provides a few macros to construct the staples of
choice-based IF: passages of text ("scenes"), with choices that lead
to other scenes.

JavaScript API
==============

The fundamental concept in the FunkScene JavaScript API is the "scene
function". A scene function is a JavaScript function, taking no
arguments, which (when called) must return an array containing two
objects:

 (a) a text string (the "scene text"),
 (b) an array of choices (the "choice list").

Each choice in the choice list is itself an array containing two
objects:

 (a) a text string (the "choice text"),
 (b) a scene function (the "choice target").

Succintly: a scene function returns a piece of text (describing the
scene) along with a list of (choicetext,scenefunction) pairs.

The JavaScript API has special interpretations for certain edge cases
(the FunkScene macros #GOTO and #IF make use of some of these):

 - An empty choice list signifies that the game is over.
 - If the choice text is an empty string, the choice will be
    hidden. (This is used to implement the #GOTO case where no choice
    list is to be shown, but the game should still continue, so there
    still needs to be a default choice.)
 - If a choice target is undefined, the choice text will be shown but
    grayed-out and the choice disabled. (Used to implement hints about
    choices that could be unlocked, i.e. failed #IF tests.)

The choiceHistory array holds the history of choices (with each choice
represented as an integer index into the choice list). The restore()
function can be used to replay a history.


FunkScene language JavaScript extensions
========================================

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
begin with a "#"; if you need to use an actual hash symbol in your
JavaScript or your text, escape it as "##").


Beginnings, endings, middles
============================

Note that one of the scene functions is called "start"; regardless of
where it is declared in the program, this will always be the first
scene the player sees.

The other two scenes (page names "electrified" and "wise_choice") have
zero choices available to the player, and are therefore interpreted as
game-ending scenes.

For middle passages, i.e. scenes that have only one choice, you can
either list a single choice, emphasizing that the player is taking the
only course of action available:

 #SCENE You hang onto the ledge for as long as possible,
   but the pain is unbearable. Eventually you have no choice but to...
 #CHOOSE ...let go #FOR #( You let go, and plummet to your doom. #)
 #ENDSCENE

Or, you can use the special #GOTO keyword, which hides the choice list
altogether:

 #SCENE The wine burns the back of your throat. Poison! You reach for
  the door, but your legs buckle and the door-handle recedes down a
  tunnel as you slip into unconsciousness...
 #GOTO handcuffed_to_chair
 #ENDSCENE

Note the final "#ENDSCENE" delimiter is still required after a
#GOTO. (You can optionally use "#END" any place you can
use"#ENDSCENE", too.)


JavaScript object code
======================

FunkScene is compiled internally to JavaScript. The above program
compiles to the following:

 start = function() {
     return ["You stand before the gates of the Temple of Belsidore. A sign reads \"BEWARE!\"",
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

Note that the quotes around "BEWARE!" do not need to be escaped in the
FunkScene macro, although obviously they are in the compiled
JavaScript.


General format of a scene declaration
=====================================

The general format of the FunkScene #PAGE...#SCENE...#ENDSCENE macro,
which constructs a scenefunction and assigns it to a JavaScript var,
is as follows (NB newlines are not significant, they are treated
exactly the same as any other whitespace):

 #PAGE <"page name", i.e. name of scenefunction var>
 #SCENE <...some text...>
 #CHOOSE <...choice text...> #FOR <name of choicetarget var>
 #CHOOSE <...more choice text...> #FOR <another var name>
  <more #CHOOSE...#FOR... blocks here, if you want them>
  <...>
 #ENDSCENE

You can use #(...#) in place of #SCENE...#ENDSCENE, if cryptic
uber-efficiency via punctuation is your thing. (Actually, this has an
added benefit that you can use many text editors'
parenthesis-balancing feature to check that your brackets match.)


Anonymous scene functions
=========================

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


Single-choice scenes
====================

There are two ways to implement single-choice scenes
(i.e. non-interactive fiction...)

If you want the choice to be visible


Choices that are disabled but still visible
===========================================

The choice can be prefixed by #IF <JavaScript expression>, e.g.
 #IF <JavaScript expression> #CHOOSE <text> #FOR <var name>

or the anonymous version
 #IF <JavaScript expression> #CHOOSE <text> #FOR #( <scene> #)


Choices that are disabled and invisible
=======================================

 #SECRETLY #IF <expression> #CHOOSE <text> #FOR <var name>
 #SECRETLY #IF <JavaScript expression> #CHOOSE <text> #FOR #( <scene> #)

Programmatically generated choice lists
=======================================

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

Note that in a #CHOICES block, you need to specify commas and [...]
array delimiters explicitly, even when using #CHOOSE...#FOR blocks.


Embedding and interpolating code in text
========================================

 #EVAL <...JavaScript expression to be interpolated...> #TEXT

 #[ <...JavaScript expression to be interpolated...> #]

 #{ <...JavaScript code to be discarded...> #}

An expression can, in fact, optionally be interpolated from the latter
form, by use of "return". This...

 #{ return "Hi there" #}

...gives the same result as this...

 #[ "Hi there" #]

...although they are implemented slightly differently (#{...#} blocks
run inside an anonymous closure).


Text input to variables
=======================

TBD.
