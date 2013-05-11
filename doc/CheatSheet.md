
# The FunkScene Language

More at [funkscene.com](http://funkscene.com/),
including a [README](../README.html) with more detail on the language.

## Describing scenes

	#PAGE start
	#SCENE Do you want to go to the temple?
	#CHOOSE Yes #FOR temple
	#CHOOSE No #FOR wise_choice
	#ENDSCENE

	#PAGE wise_choice
	#SCENE A wise choice, my friend.
	#ENDSCENE

### Abbreviated syntax

	#PAGE temple
	#(
	  You stand at the temple gates.
	  #CHOOSE I smash them open! #FOR electrified
	  #CHOOSE I walk away #FOR wise_choice
	#)

	#PAGE electrified
	#( You have been electrified. #)

## Anonymous sub-scenes

	#PAGE start
	#( You stand at the temple gates.
	#CHOOSE I smash them open! #FOR electrified
	#CHOOSE I walk away #FOR
	 #( Are you sure?
	 #CHOOSE Yes #FOR wise_choice
	 #CHOOSE No #FOR start #) #)

## Choice disabled, but visible

	#IF <expr> #CHOOSE <text> #FOR <page>

	#IF <expr> #CHOOSE <text> #FOR #( <scene> #)


## Choice invisible when disabled

	#SECRETLY #IF <expr> #CHOOSE <text> #FOR <page>

	#SECRETLY #IF <expr> #CHOOSE <text> #FOR #( <scene> #)


## Beginnings, endings, middles

### Force player to take only choice

	#PAGE hanging_on
	#SCENE You hang on for as long as possible.
	  Eventually you have no choice but to...
	#CHOOSE ...let go #FOR #( You let go. #)
	#ENDSCENE

### Omit choices altogether

	#PAGE drink_wine
	#SCENE The wine burns the back of your throat.
         Poison! You reach, but slip into blackness
	#GOTO handcuffed_to_chair
	#ENDSCENE

### Include another scene

	hair_status = "messy"
	
	#PAGE start
	#SCENE You stand before the temple gates.
	#INCLUDE messy_hair
	#CHOOSE I smash the gates! #FOR electrified
	#CHOOSE I walk away #FOR wise_choice
	#ENDSCENE

	#PAGE messy_hair
	#SCENE Your hair is very #[ hair_status #].
	#CHOOSE I brush my hair #FOR
	#( You preen.
	 #{ hair_status = "neat" #}
	 #GOTO #PREVIOUS #)
	#ENDSCENE

`#GOTO #PREVIOUS` can be shortened to `#BACK`.

	#PAGE messy_hair
	#SCENE Your hair is very #[ hair_status #].
	#CHOOSE I brush my hair #FOR
	#( You preen.
	 #{ hair_status = "neat" #} #BACK #)
	#ENDSCENE

## Using `#GOSUB` to schedule scenes for later

	#PAGE start
	#( Fight or flee?
	   #CHOOSE Fight! #FOR battle
	   #CHOOSE Flee! #FOR flee #)

	// The following two scenes use GOSUB followed by GOTO:

	#PAGE battle
	#( You fight valiantly against the stronger opponent.
	   #GOSUB death_blow
	   #GOTO heaven #)

	#PAGE flee
	#( You turn to run, letting your guard down for a moment...
	   #GOSUB death_blow
	   #GOTO hell #)

	// The rest is just code to make this a complete game:
	
	#PAGE death_blow
	#( One slip is all it takes. A blow pierces your skull.
	It's all over. #CONTINUE #)

	#PAGE hell
	#( Cowards never prosper! Enjoy your Hell, roast chicken. #OVER #)

	#PAGE heaven
	#( Well, here you are in Heaven. Everything it's cracked up to be.
	   All whims yours to satisfy. But how will you indulge yourself?
	   #ONCE #CHOOSE I join the perpetual orgy.
	   #FOR #( After centuries, one tires of lust. #BACK #)
	   #ONCE #CHOOSE I stuff my face at the Infinite Banquet.
	   #FOR #( In time, food tastes like ashes. #BACK #) #)

### Placing scenes on the stack directly

	#PAGE battle
	#( You fight valiantly against the stronger opponent.
	   #STACK heaven
	   #GOTO death_blow #)

### Queueing scenes instead of stacking them

	#PAGE battle
	#( You fight valiantly against the stronger opponent.
	   #FLUSH
	   #QUEUE death_blow
	   #QUEUE heaven
	   #CONTINUE #)

### Chaining `#GOSUB` clauses together

	#PAGE battle
	#( You fight valiantly against the stronger opponent.
	   #GOSUB death_blow
	   #GOSUB in_limbo
	   #GOTO heaven #)

### Can't nest `#GOSUB` inside `#IF`

	// This is bad code and WILL NOT COMPILE
	#SCENE
	 You are in the scullery.
	 #IF got_knife #THEN
	  "Hey! You with the knife!" says the Cook.
	  #// Following line will not work; can't use #GOSUB in #IF block
	  #GOSUB carrot_chopping_side_quest
	  Well, that was fun.
	 #ENDIF
	 You were made for greater things than this. Why not go upstairs?
	 #CHOOSE Yes, go upstairs #FOR posh_romance
	 #CHOOSE No, stay downstairs #FOR servant_action
	 #CHOOSE These possibilities constrain me unduly #FOR start_stabbing
	#ENDSCENE


## Implicit continuation

### Long form

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

### Implicit continuation

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

The `#OVER` overrides any continuation and ends the game.

### Explicit continuation

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

### Named implicit continuation

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

### Chained implicit continuations

	#PAGE start
	#SCENE
	Here we go.
	#GOSUB are_you_ready
	#GOSUB i_hope_so
	Better tell me your name.
	#INPUT Type your name: #TO name
	Hi, #$name.
	Time for some choices.
	#CHOOSE An irrelevant choice. #FOR #( Hope you're pleased. #)
	#CHOOSE Another irrelevant choice. #FOR #( Pointless. #)
	#CHOOSE Kill myself. #FOR #( First sensible thing you've said. #OVER #)
	Some more scene text.
	#CHOOSE A ditzy choice. #FOR #( Squee! #)
	#CHOOSE A dumb choice. #FOR #( Woohoo! #)
	Even more scene text.
	#CHOOSE A terminal choice. #FOR #( YOU ARE DEAD! #OVER #)
	#CHOOSE A final choice. #FOR #( GAME OVER! #OVER #)
	#END
	
	#PAGE are_you_ready #( Are you ready?
	  #CHOOSE Yes. #FOR #( Great! #CONTINUE #)
	  #CHOOSE No. #FOR #( That's too bad! #CONTINUE #) #)

	#PAGE i_hope_so #( Seriously, I hope you ARE ready. #CONTINUE #)

### Conditional branch

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

### Alternate form of conditional branch

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

### Explicit break

	...
	You fall asleep in a delirious stupor.
	#BREAK
	The next day, there is a strange itching around your thighs,
	accompanied by an ominous rash.
	...



## One-time choices

	#PAGE start
	#SCENE You're on the train to Hell.
	#ONCE #CHOOSE I play cards.
	#FOR #( You play a few billion games of cards...
	 Before long you're bored. #BACK #)
	#ONCE #CHOOSE I play dice.
	#FOR #( You play some dice games,
	 but quickly lose your money. #BACK #)
	#ONCE #CHOOSE Fornicate. #FOR #( CENSORED #BACK #)
	#CHOOSE Go to hell #FOR #( Welcome to Hell, sinner. #)
	#ENDSCENE

### Group of one-time choices

	#AS penance #CHOOSE As penance, I cross myself.
	#FOR #( You cross yourself, in penance. #BACK #)
	#AS penance #CHOOSE As penance, I regurgitate my last meal.
	#FOR #( You retch, purging yourself of evil. #BACK #)


## Cycling through scene texts

	#CYCLE The wind sighs.
	#NEXT A light rain spatters.
	#NEXT You feel a chill.
	#LOOP

### Stopping instead of looping

	#CYCLE You saunter into the lobby.
	#NEXT The bankers are pretending not to notice you.
	#NEXT This bank has gotten used to you.
	#STOP

### Access to current state of cycler

	#CYCLE(wind) The wind sighs.
	#NEXT A light rain spatters.
	#NEXT You feel a chill.
	#LOOP
	#SECRETLY #IF wind == 2
	#CHOOSE I pull my cloak tighter around me. #FOR
	#( Wimp. #BACK #)

## Cycling between choices

	Well, here you are in the waiting room of the Principal's Office.
	#CHOOSE I leave. #FOR #( You can't, I'm afraid. #)
	#CHOOSE I sit still. #FOR
	 #( You sit motionless for 17 seconds. An achievement. #)
	#ROTATE(pointless_action)
	  #// the (pointless_action) bit is unnecessary
	  #// unless you want to keep track
	#CHOOSE I twiddle my thumbs #FOR
	 #( Consider your thumbs twiddled. #BACK #)
	#CHOOSE I scratch my head #FOR
	 #( You scratch your head, and your neck for good measure. #BACK #)
	#CHOOSE I play with my keys #FOR
	 #( You rattle your keys a bit. #BACK #)
	#LOOP
	The Principal will see you now.

## Programmatically generated choice lists

	#PAGE start
	#SCENE You stand before the temple gates.
	#CHOICES
	 [["I smash the gates!", electrified],
	  ["I walk away", wise_choice]]
	#ENDSCENE

### Mixing `#CHOOSE...#FOR...` blocks with JavaScript code

	#PAGE start
	#SCENE You stand before the temple gates.
	#CHOICES
	 [["I smash the gates!", electrified],
	  #CHOOSE I walk away #FOR wise_choice
	 ]
	#ENDSCENE


## Embedding and interpolating code in text

	#EVAL <expression> #TEXT

### Shorter form

	#[ <expression> #]

## Contents of a JavaScript variable

	#$<varname>

## Execute JavaScript code

	#{ <...statements...> #}

## Conditional display of text

	You are in the scullery.
	#IF got_knife
	 #THEN A young serving-boy eyes your knife uneasily.
	 #ELSE A young boy scurries back and forth with plates.
	#ENDIF

NB: you cannot nest `#GOSUB` inside an `#IF` clause.


## Text input direct to variables

	name = "Adventurer"

	#PAGE start
	#SCENE How about you tell me your name?
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
