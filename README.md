# spacewarjs
A two-player, Node.js server based version of the old PDP-10 game Spacewar!

This is a two-player game, meaning that if two players connect to the Node.js server, it will start, and any extra players connecting will just sit in read-only mode until one of the original two disconnects.  It's not the smartest design, but I was trying to get a handle on Node.js and real time game loops, so it didn't go much further.  It has graphics, obviously, and sound, actually cribbed from the old MS-DOS version of Spacewar that I loved so much as a child.  Thank you B. Seiler, whoever you were, for inspiring me.  Unlike the MS-DOS version, this one has no artificial intelligence, so if you don't have a second human player, you're out of luck.
