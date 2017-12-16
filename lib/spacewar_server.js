/****************************************************************************
 * Copyright (c) 2012-2015 Zachary L. Stauber
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 ****************************************************************************/

define(function(requirejs) {
	// note that Chore uses requirejs, not require, because it is my module,
	// which was written for RequireJS specifically
	var socketio = requirejs('socket.io');
	var Chore = requirejs('chore');
	var StaticSprite = requirejs('sprite/StaticSprite');
	var DynamicSprite = requirejs('sprite/DynamicSprite');
	var IntelligentSprite = requirejs('sprite/IntelligentSprite');
	var Collision = requirejs('sprite/Collision');
	var Level = requirejs('sprite/Level');
	var Regen = requirejs('sprite/Regen');
	var GameState = requirejs('GameState');

	var io;
	var collision;
	var HEIGHT = 600;
	var WIDTH = 800;
	/*var SHIP_TOP_SPEED = 6;
	var SHIP_TOP_ENERGY = 50;
	var SLUG_SPEED = 6;
	var TORPEDO_SPEED = 6;
	var CLOAK_SECONDS = 4;
	var TORPEDO_DAMAGE = 10;
	var SLUG_DAMAGE = 5;
	var PLANET_DAMAGE = 5;
	var SHIP_DAMAGE = 2;
	var G = 2.5; // 6.674e-11 gravitational constant
	var M = 2.5; // 5.9722e24 Earth mass
	var R = 0.0; // 6.3671e6 Earth radius*/
	var SHIP_TOP_SPEED = 3;
	var SHIP_TOP_ENERGY = 50;
	var SLUG_SPEED = 3;
	var TORPEDO_SPEED = 3;
	var CLOAK_SECONDS = 4;
	var TORPEDO_DAMAGE = 10;
	var SLUG_DAMAGE = 5;
	var PLANET_DAMAGE = 5;
	var SHIP_DAMAGE = 2;
	var G = 2.5 // 6.674e-11 gravitational constant
	var M = 2.5; // 5.9722e24 Earth mass
	var R = 0.0; // 6.3671e6 Earth radius
	var PLANET_COLLIDABLE = true;
	var GRAVITY_ON = true;
	var players = [];
	var planets = {};
	var ships = {};
	var regenTimers = {}; // contains regen timers for ships
	var slugs = {};
	var torpedoes = {};
	var snum;
	var gstate;

	var listen = function(server) {
		initializeGame();
		io = socketio.listen(server);
		collision = new Collision(TORPEDO_DAMAGE, SLUG_DAMAGE, SHIP_DAMAGE, PLANET_DAMAGE);
		io.sockets.on('connection', function(socket) {
			console.log(io.sockets.adapter.rooms);
			// any player connecting gets pushed onto the player list and
			// can view the game, but players 3+ are in a view-only queue
			players.push(socket.id);
			console.log('players: ' + players.length);
			console.log(socket.id + ' connected');
			if (players.length === 1) {
				ships['2'].sid = socket.id;
				sendMessage([socket],  'You are player number 1.  Waiting ' +
					'for player 2.', 0);
			} else if (players.length === 2) {
				ships['3'].sid = socket.id;
				var socket1 = getSocketByPlayerId(0);
				var socket2 = getSocketByPlayerId(1);
				console.log('player 2 connected');
				sendMessage([socket1, socket2], 'Two players are connected.  ' +
					'Press space bar to start.', 0);
			} else if (players.length >= 3) {
				sendMessage([socket], 'Two players have connected already, and ' +
					'you are player ' + players.length + ', so you will have ' +
					'to wait your turn.', 0);
			}
			socket.emit('setup', {
				HEIGHT: HEIGHT,
				WIDTH: WIDTH,
				SHIP_TOP_SPEED: SHIP_TOP_SPEED,
				SHIP_TOP_ENERGY: SHIP_TOP_ENERGY,
				SLUG_SPEED: SLUG_SPEED,
				TORPEDO_SPEED: TORPEDO_SPEED,
				CLOAK_SECONDS: CLOAK_SECONDS,
				TORPEDO_DAMAGE: TORPEDO_DAMAGE,
				SLUG_DAMAGE: SLUG_DAMAGE,
				PLANET_DAMAGE: PLANET_DAMAGE,
				SHIP_DAMAGE: SHIP_DAMAGE,
				G: G,
				M: M,
				R: R,
				PLANET_COLLIDABLE: PLANET_COLLIDABLE,
				GRAVITY_ON: GRAVITY_ON
			});
			handleClientConnecting(socket);
			handleClientDisconnecting(socket);
			sendUpdate();
		});
		loopUpdate.start();
		loopSendUpdate.start();
	};

	function initializeGame() {
		gstate = GameState.PAUSED;

		emptyObject(planets);
		emptyObject(ships);
		emptyObject(slugs);
		emptyObject(torpedoes);

		snum = 0;

		// first planet is named '1'
		planets[++snum] = new StaticSprite();
		planets[snum].snum = snum;
		planets[snum].X = WIDTH / 2;
		planets[snum].Y = HEIGHT / 2;
		planets[snum].width = 100;
		planets[snum].height = 100;
		planets[snum].visible = true;
		planets[snum].existsOnLevel = Level.PLANET;
		planets[snum].collidesWithLevels = [Level.PLAYER1, Level.PLAYER2, Level.SLUG, Level.TORPEDO];

		// first ship is named '2'
		ships[++snum] = new IntelligentSprite();
		ships[snum].snum = snum;
		ships[snum].X = 0.5 * WIDTH; // default 400
		ships[snum].Y = 0.25 * HEIGHT; // default 150
		ships[snum].width = 20;
		ships[snum].height = 20;
		ships[snum].visible = true;
		ships[snum].existsOnLevel = Level.PLAYER1;
		ships[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER2, Level.SLUG, Level.TORPEDO];
		ships[snum].hVelocity = 3;
		ships[snum].vVelocity = 0;
		ships[snum].rotation = 0;
		ships[snum].topSpeed = SHIP_TOP_SPEED;
		ships[snum].topEnergy = SHIP_TOP_ENERGY;
		ships[snum].weaponEnergy = SHIP_TOP_ENERGY;
		ships[snum].shieldEnergy = SHIP_TOP_ENERGY;
		ships[snum].alive = true;
		regen(ships[snum]);

		// second ship is named '3'
		ships[++snum] = new IntelligentSprite();
		ships[snum].snum = snum;
		ships[snum].X = 0.5 * WIDTH; // default 400
		ships[snum].Y = 0.75 * HEIGHT; // default 450
		ships[snum].width = 20;
		ships[snum].height = 20;
		ships[snum].visible = true;
		ships[snum].existsOnLevel = Level.PLAYER2;
		ships[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER1, Level.SLUG, Level.TORPEDO];
		ships[snum].hVelocity = -3;
		ships[snum].vVelocity = 0;
		ships[snum].rotation = 8;
		ships[snum].topSpeed = SHIP_TOP_SPEED;
		ships[snum].topEnergy = SHIP_TOP_ENERGY;
		ships[snum].weaponEnergy = SHIP_TOP_ENERGY;
		ships[snum].shieldEnergy = SHIP_TOP_ENERGY;
		ships[snum].alive = true;
		regen(ships[snum]);
	}

	function emptyObject(object) {
		for (var i in object) {
			if (object.hasOwnProperty(i)) {
				delete object[i];
			}
		}
	}

	function handleClientConnecting(socket) {
		console.log('handleClientConnecting');
		socket.on('requestStart', function() {
			if (isActivePlayer(socket.id) === true) {
				if (gstate === GameState.PAUSED) {
					if (players.length >= 2) {
						io.sockets.emit('startGame');
						gstate = GameState.RUNNING;
					} else {
						sendMessage([socket], 'The game needs two players to start.', 0);
					}
				} else if (gstate === GameState.RUNNING) {
					gstate = GameState.PAUSED;
				}
			} else {
				denyCommand(socket);
			}
		});

		socket.on('requestShootSlug', function() {
			if (gstate === GameState.RUNNING) {
				var ship = ships[getShipIdBySocketId(socket.id)];
				if (ship.weaponEnergy > 0) {
					ship.weaponEnergy--;
					io.sockets.emit('play', {
						sound: 'slugLaunch'
					});
					slugs[++snum] = new DynamicSprite();
					slugs[snum].snum = snum;
					slugs[snum].X = ship.X;
					slugs[snum].Y = ship.Y;
					slugs[snum].width = 2;
					slugs[snum].height = 2;
					slugs[snum].visible = true;
					slugs[snum].existsOnLevel = Level.SLUG;
					if (ship.existsOnLevel === Level.PLAYER1) {
						slugs[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER2, Level.TORPEDO];
					} else if (ship.existsOnLevel === Level.PLAYER2) {
						slugs[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER1, Level.TORPEDO];
					}
					var firingAngleRadians = ship.rotation * 22.5 * Math.PI / 180.0;
					slugs[snum].hVelocity = ship.hVelocity + Math.cos(firingAngleRadians) * SLUG_SPEED;
					slugs[snum].vVelocity = ship.vVelocity + Math.sin(firingAngleRadians) * SLUG_SPEED;
					slugs[snum].rotation = ship.rotation;
					slugs[snum].alive = true;
				}
			}
		});

		socket.on('requestShootTorpedo', function() {
			if (gstate === GameState.RUNNING) {
				var ship = ships[getShipIdBySocketId(socket.id)];
				if (ship.weaponEnergy >= 5) {
					ship.weaponEnergy -= 5;
					io.sockets.emit('play', {
						sound: 'torpedoLaunch'
					});
					torpedoes[++snum] = new DynamicSprite();
					torpedoes[snum].snum = snum;
					torpedoes[snum].X = ship.X;
					torpedoes[snum].Y = ship.Y;
					torpedoes[snum].width = 8;
					torpedoes[snum].height = 8;
					torpedoes[snum].visible = true;
					torpedoes[snum].existsOnLevel = Level.TORPEDO;
					if (ship.existsOnLevel === Level.PLAYER1) {
						torpedoes[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER2, Level.SLUG, Level.TORPEDO];
					} else if (ship.existsOnLevel === Level.PLAYER2) {
						torpedoes[snum].collidesWithLevels = [Level.PLANET, Level.PLAYER1, Level.SLUG, Level.TORPEDO];
					}
					var firingAngleRadians = ship.rotation * 22.5 * Math.PI / 180.0;
					torpedoes[snum].hVelocity = ship.hVelocity + Math.cos(firingAngleRadians) * TORPEDO_SPEED;
					torpedoes[snum].vVelocity = ship.vVelocity + Math.sin(firingAngleRadians) * TORPEDO_SPEED;
					torpedoes[snum].rotation = ship.rotation;
					torpedoes[snum].alive = true;
				}
			}
		});

		socket.on('requestHyperspace', function() {
			if (gstate === GameState.RUNNING) {
				var ship = ships[getShipIdBySocketId(socket.id)];
				if (ship.weaponEnergy >= 10) {
					ship.weaponEnergy -= 10;
					io.sockets.emit('play', {
						sound: 'shipWarp'
					});
					ship.X = Math.random() * WIDTH;
					ship.Y = Math.random() * HEIGHT;
				}
			}
		});

		socket.on('requestCloak', function() {
			if (gstate === GameState.RUNNING) {
				var ship = ships[getShipIdBySocketId(socket.id)];
				if (ship.weaponEnergy >= 10) {
					ship.weaponEnergy -= 10;
					ship.visible = false;
					setTimeout(function() {
						ship.visible = true;
					}, CLOAK_SECONDS * 1000);
				}
			}
		});

		socket.on('requestAccelerate', function(data) {
			if (gstate === GameState.RUNNING) {
				ships[getShipIdBySocketId(socket.id)].accelerate(data.acceleration);
			}
		});

		socket.on('requestRotate', function(data) {
			if (gstate === GameState.RUNNING) {
				ships[getShipIdBySocketId(socket.id)].rotate(data.rotation);
			}
		});

		socket.on('requestTransferStoW', function() {
			if (gstate === GameState.RUNNING) {
				ships[getShipIdBySocketId(socket.id)].transferStoW();
			}
		});

		socket.on('requestTransferWtoS', function() {
			if (gstate === GameState.RUNNING) {
				ships[getShipIdBySocketId(socket.id)].transferWtoS();
			}
		});

		socket.on('requestTogglePlanet', function() {
			if (gstate !== GameState.RUNNING) {
				if (isActivePlayer(socket.id) === true) {
					if (PLANET_COLLIDABLE === true) {
						PLANET_COLLIDABLE = false;
					} else if (PLANET_COLLIDABLE === false) {
						PLANET_COLLIDABLE = true;
					}
					io.sockets.emit('togglePlanet', {
						PLANET_COLLIDABLE: PLANET_COLLIDABLE
					});
					if (PLANET_COLLIDABLE === true) {
						sendMessage(getAllSockets(), 'Planet is now collidable.  Watch out!',
							3000);
					} else if (PLANET_COLLIDABLE === false) {
						sendMessage(getAllSockets(), 'Planet is no longer collidable.', 3000);
					}
				} else {
					denyCommand(socket);
				}
			}
		});

		socket.on('requestToggleGravity', function() {
			if (gstate !== GameState.RUNNING) {
				if (isActivePlayer(socket.id) === true) {
					if (GRAVITY_ON === true) {
						GRAVITY_ON = false;
					} else if (GRAVITY_ON === false) {
						GRAVITY_ON = true;
					}
					io.sockets.emit('toggleGravity', {
						GRAVITY_ON: GRAVITY_ON
					});
					if (GRAVITY_ON === true) {
						sendMessage(getAllSockets(), 'Gravity is now on.  Watch out!',
							3000);
					} else if (GRAVITY_ON === false) {
						sendMessage(getAllSockets(), 'Gravit is now off.', 3000);
					}
				} else {
					denyCommand(socket);
				}
			}
		});
	}

	function handleClientDisconnecting(socket) {
		console.log('handleClientDisconnecting');
		socket.on('disconnect', function() {
			// Find out which player disconnected.  If it is player 1 or 2, then
			// reset the game, reassign ships, and promte player 3 to the empty
			// slot.
			var i = players.indexOf(socket.id);
			if (i !== -1) {
				players.splice(i, 1);
			}
			if (i <= 1) {
				gstate = GameState.GAMEOVER;
				io.sockets.emit('endGame');
				initializeGame();
				if (players.length >= 2) {
					var socket1 = getSocketByPlayerId(0);
					var socket2 = getSocketByPlayerId(1);
					ships['2'].sid = socket1.id;
					ships['3'].sid = socket2.id;
					sendMessage(getAllSockets(), 'An active player has ' +
						'disconnected.  Resetting the game.  Player 3 is now in ' +
						'the game.', 3000);
					sendMessage([socket1, socket2], 'Two players are connected.  ' +
						'Press space bar to start.', 0);
				} else if (players.length === 1) {
					var socket1 = getSocketByPlayerId(0);
					ships['2'].sid = socket1.id;
					sendMessage([socket1],  'You are player number 1.  Waiting ' +
						'for player 2.', 0);
				}
			}
			console.log('players: ' + players.length);
			console.log(socket.id + ' disconnected');
			sendUpdate();
		});
	}

	function update() {
		if (gstate === GameState.RUNNING) {
			for (var i in slugs) {
				if (slugs.hasOwnProperty(i)) {
					// much thanks for the formulas: http://physics.stackexchange.com/questions/17285/split-gravitational-force-into-x-y-and-z-componenets
					// alter velocity based on gravity well
					var x = 0.0, y = 0.0;

					var slug = slugs[i];
					x = WIDTH / 2.0 - slug.X;
					y = HEIGHT / 2.0 - slug.Y;

					// move ship based on velocity
					slug.X = slug.X + slug.hVelocity;
					slug.Y = slug.Y + slug.vVelocity;

					// wrap around screen if necessary
					if (slug.X <= 0) {
						slug.X = WIDTH;
					} else if (slug.X >= WIDTH) {
						slug.X = 0;
					}
					if (slug.Y < 0) {
						slug.Y = HEIGHT;
					} else if (slug.Y >= HEIGHT) {
						slug.Y = 0;
					}

					if (PLANET_COLLIDABLE === true) {
						collision.collide(slug, planets['1']);
					}
					collision.collide(ships['2'], slug);
					collision.collide(ships['3'], slug);
					for (var j in torpedoes) {
						if (torpedoes.hasOwnProperty(j)) {
							var torpedo = torpedoes[j];
							collision.collide(torpedo, slug);
						}
					}
					if (slug.alive === false) {
						delete slugs[i];
					}
				}
			}
			for (var i in torpedoes) {
				if (torpedoes.hasOwnProperty(i)) {
					var torpedo = torpedoes[i];

					// much thanks for the formulas: http://physics.stackexchange.com/questions/17285/split-gravitational-force-into-x-y-and-z-componenets
					// alter velocity based on gravity well
					var x = 0.0, y = 0.0, rsq = 0.0, a = 0.0, ax = 0.0, ay = 0.0;

					x = WIDTH / 2.0 - torpedo.X;
					y = HEIGHT / 2.0 - torpedo.Y;

					rsq = Math.pow(x, 2.0) + Math.pow(y, 2.0);

					// compute each component of acceleration
					ax = (G * M) * x / rsq;
					ay = (G * M) * y / rsq;

					// don't need to worry about top speed here since DynamicSprites can neither increase nor decrease speed
					if (GRAVITY_ON === true) {
						var newHVelocity = torpedo.hVelocity + ax;
						var newVVelocity = torpedo.vVelocity + ay;
					} else {
						var newHVelocity = torpedo.hVelocity;
						var newVVelocity = torpedo.vVelocity;
					}
					var newVelocity = Math.pow(Math.pow(newHVelocity, 2.0) + Math.pow(newVVelocity, 2.0), 0.5);

					torpedo.hVelocity = newHVelocity;
					torpedo.vVelocity = newVVelocity;

					// move torpedo based on velocity
					torpedo.X = torpedo.X + torpedo.hVelocity;
					torpedo.Y = torpedo.Y + torpedo.vVelocity;

					// wrap around screen if necessary
					if (torpedo.X <= 0) {
						torpedo.X = WIDTH;
					} else if (torpedo.X >= WIDTH) {
						torpedo.X = 0;
					}
					if (torpedo.Y < 0) {
						torpedo.Y = HEIGHT;
					} else if (torpedo.Y >= HEIGHT) {
						torpedo.Y = 0;
					}

					if (PLANET_COLLIDABLE === true) {
						collision.collide(torpedo, planets['1']);
					}
					collision.collide(ships['2'], torpedo);
					collision.collide(ships['3'], torpedo);
					// The next loop adds not only torpedoes that just collided, but the
					// ones the slugs collided with in the above slugs loop.
					if (torpedo.alive === false) {
						io.sockets.emit('play', {
							sound: 'torpedoExplosion'
						});
						delete torpedoes[i];
					}
				}
			}
			for (var i in ships) {
				if (ships.hasOwnProperty(i)) {
					var ship = ships[i];
					// much thanks for the formulas: http://physics.stackexchange.com/questions/17285/split-gravitational-force-into-x-y-and-z-componenets
					// alter velocity based on gravity well
					var x = 0.0, y = 0.0, rsq = 0.0, a = 0.0, ax = 0.0, ay = 0.0;

					x = WIDTH / 2.0 - ship.X;
					y = HEIGHT / 2.0 - ship.Y;

					rsq = Math.pow(x, 2.0) + Math.pow(y, 2.0);

					// compute each component of acceleration
					ax = (G * M) * x / rsq;
					ay = (G * M) * y / rsq;

					// tricky here, unlike thruster acceleration, we still need the ships to be affected even if they are already at their speed limit
					// so we need to find the magnitude in each direction and scale them back if they're above the top speed
					if (GRAVITY_ON === true) {
						var newHVelocity = ship.hVelocity + ax;
						var newVVelocity = ship.vVelocity + ay;
					} else {
						var newHVelocity = ship.hVelocity;
						var newVVelocity = ship.vVelocity;
					}
					var newVelocity = Math.pow(Math.pow(newHVelocity, 2.0) + Math.pow(newVVelocity, 2.0), 0.5);

					if (newVelocity <= ship.topSpeed) {
						ship.hVelocity = newHVelocity;
						ship.vVelocity = newVVelocity;
					}
					else {
						var scaleFactor = ship.topSpeed / newVelocity;
						ship.hVelocity = newHVelocity * scaleFactor;
						ship.vVelocity = newVVelocity * scaleFactor;
					}

					// move ship based on velocity
					ship.X = ship.X + ship.hVelocity;
					ship.Y = ship.Y + ship.vVelocity;

					// wrap around screen if necessary
					if (ship.X <= 0) {
						ship.X = WIDTH;
					} else if (ship.X >= WIDTH) {
						ship.X = 0;
					}
					if (ship.Y < 0) {
						ship.Y = HEIGHT;
					} else if (ship.Y >= HEIGHT) {
						ship.Y = 0;
					}

					// clear regens if the ship is dead
					if (ship.alive === false) {
						io.sockets.emit('play', {
							sound: 'shipExplosion'
						});
						gstate = GameState.GAMEOVER;
						clearTimeout(regenTimers['2']);
						clearTimeout(regenTimers['3']);
						io.sockets.emit('endGame');
						sendMessage(getAllSockets(), 'Kablam!  The game is over.  Restarting in 5 seconds.', 0);
						setTimeout(function() {
							sendMessage(getAllSockets(), 'Kablam!  The game is over.  Restarting in 4 seconds.', 0);
						}, 1000);
						setTimeout(function() {
							sendMessage(getAllSockets(), 'Kablam!  The game is over.  Restarting in 3 seconds.', 0);
						}, 2000);
						setTimeout(function() {
							sendMessage(getAllSockets(), 'Kablam!  The game is over.  Restarting in 2 seconds.', 0);
						}, 3000);
						setTimeout(function() {
							sendMessage(getAllSockets(), 'Kablam!  The game is over.  Restarting in 1 second.', 0);
						}, 4000);
						setTimeout(function() {
							initializeGame();
							var socket1 = getSocketByPlayerId(0);
							var socket2 = getSocketByPlayerId(1);
							if (socket1.id !== undefined) {
								ships['2'].sid = socket1.id;
							}
							if (socket2.id !== undefined) {
								ships['3'].sid = socket2.id;
							}
							sendMessage([socket1, socket2], 'Two players are connected.  ' +
								'Press space bar to start.', 0);
						}, 5000);
					}
				}
			}
			collision.collide(ships['2'], ships['3']);
			if (PLANET_COLLIDABLE === true) {
				collision.collide(ships['2'], planets['1']);
				collision.collide(ships['3'], planets['1']);
			}
		}
	}

	function sendUpdate() {

		io.sockets.emit('update', {
			gstate: gstate,
			planets: planets,
			ships: ships,
			slugs: slugs,
			torpedoes: torpedoes
		});
	}

	function sendMessage(sockets, message, duration) {
		for (var i = 0, il = sockets.length; i < il; i++) {
			sockets[i].emit('message', {
				message: message,
				duration: duration
			});
		}
	}

	function getAllSockets() {
		var sockets = [];
		for (var i in io.sockets.connected) {
			if (io.sockets.connected.hasOwnProperty(i)) {
				sockets.push(io.sockets.connected[i]);
			}
		}
		return sockets;
	}

	function getSocketByPlayerId(pid) {
		var sid = players[pid];
		var socket = io.sockets.connected[sid];
		return socket;
	}

	function getShipIdBySocketId(sid) {
		for (var i in ships) {
			if (ships.hasOwnProperty(i)) {
				if (ships[i].sid === sid) {
					return i;
				}
			}
		}
	}

	function getActivePlayerSockets() {
		var activePlayerSockets = [];
		// If there are more than 2 players, return 2.  If there are less than
		// 2, return the number (0 or 1)
		for (var i = 0, il = (players.length >= 2 ? 2 : players.length); i < il; i++) {
			var sid = players[i];
			var socket = io.sockets.connected[sid];
			activePlayerSockets.push(socket);
		}
		return activePlayerSockets;
	}

	function getInactivePlayerSockets() {
		var inactivePlayerSockets = [];
		// If there are more than 2 players, start with player 3, otherwise
		// return 2, which means the loop won't run.
		for (var i = 2, il = (players.length >= 3 ? players.length : 2); i < il; i++) {
			var sid = players[i];
			var socket = io.sockets.connected[sid];
			inactivePlayerSockets.push(socket);
		}
		return inactivePlayerSockets;
	}

	// this function checks to see if the socket passed belongs to one of the
	// first two active players, so commands given by observers (players 3+)
	// can be safely ignored
	function isActivePlayer(sid) {
		if (players[0] === sid || players[1] === sid) {
			return true;
		} else {
			return false;
		}
	}

	function denyCommand(socket) {
		var pnum = players.indexOf(socket.id) + 1;
		sendMessage([socket], 'You are player number ' + pnum + ' and will ' +
			'have to wait until you are player 1 or 2 to play.', 5000);
	}

	var loopUpdate = new Chore(update, 1/60, false);
	var loopSendUpdate = new Chore(sendUpdate, 1/30, false);

	function regen(ship) {
		ship.regen();
		regenTimers[ship.snum] = setTimeout(function() {
			regen(ship);
		}, 1000);
	}

	return listen;
});