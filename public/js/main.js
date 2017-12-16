/*******************************************************************************
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
 ******************************************************************************/

define.amd.jQuery = true;

require.config({
    baseUrl: 'js/lib',
    packages: [
		{name: 'domReady', location: 'https://cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1', main: 'domReady.min'},
		{name: 'jquery', location: 'https://code.jquery.com', main: 'jquery-2.1.4.min'},
		//{name: 'jquerymobile', location: 'https://ajax.googleapis.com/ajax/libs/jquerymobile/1.4.5', main: 'jquery.mobile.min'},
		{name: 'socketio', location: '/socket.io', main: 'socket.io'}, // slash is pathname starting at server name (e.g. turner.stauber.org:3000)
		{name: 'timestamp', location: 'timestamp'}, // no slash is relative to baseUrl (e.g. js/lib)
		{name: 'chore', location: 'chore'},
		{name: 'animation', location: 'animation'},
		{name: 'asset', location: 'asset'},
		{name: 'sprite', location: 'sprite'},
		{name: 'GameState', location: '.', main: 'GameState'},
		{name: 'GameControls', location: '.', main: 'GameControls'}
    ]
});

define(
	// dependencies
	[
		'domReady',
		'jquery',
		//'jquerymobile',
		'socketio',
		'timestamp',
		'chore',
		'animation',
		'animation/AnimationArray',
		'animation/RotationArray',
		'asset',
		'sprite/StaticSprite',
		'sprite/DynamicSprite',
		'sprite/IntelligentSprite',
		'sprite/Collision',
		'sprite/Level',
		'sprite/Regen',
		'GameState',
		'GameControls'
	],
	// call back
	function(
		domReady,
		$,
		//jquerymobile,
		io,
		timestamp,
		Chore,
		Animation,
		AnimationArray,
		RotationArray,
		Asset,
		StaticSprite,
		DynamicSprite,
		IntelligentSprite,
		Collision,
		Level,
		Regen,
		GameState,
		GameControls
	) {
		var socket;
		var communications;
		var CPS_EXPECTED = undefined, cpsActual = 0;

		// player objects
		var HEIGHT = null;
		var WIDTH = null;
		var SHIP_TOP_SPEED = null;
		var SHIP_TOP_ENERGY = null;
		var SLUG_SPEED = null;
		var TORPEDO_SPEED = null;
		var CLOAK_SECONDS = null;
		var TORPEDO_DAMAGE = null;
		var SLUG_DAMAGE = null;
		var PLANET_DAMAGE = null;
		var SHIP_DAMAGE = null;
		var G = null; // gravitational constant
		var M = null; // Earth mass
		var R = null; // Earth radius
		var PLANET_COLLIDABLE  = null;
		var GRAVITY_ON = null;

		var gstate = null;
		var pnum = null;

		// DOM elements
		var divGame, divStart, divDebug, divButtons;

		// rendering objects
		var canvas, context;
		var canvasTmp, contextTmp;
		var frames;
		var FPS_EXPECTED = 60, fpsActual = 0;
		
		// update object
		var chrUpdateGame;
		var UPS_EXPECTED = 60;
		
		// once per second, update info with per second counts
		var begin, now;
		var chrUpdateRates;

		var assets = [];
		assets.push(new Asset('starfield', 'image', 'img/Starfield.png'));
		assets.push(new Asset('planet', 'image', 'img/Planet.png'));
		assets.push(new Asset('ship1', 'rotation', 'img/Ship1.png', 16));
		assets.push(new Asset('ship2', 'rotation', 'img/Ship2.png', 16));
		assets.push(new Asset('explosion', 'animation', 'img/Explosion.png', 20));
		assets.push(new Asset('shield', 'animation', 'img/Shield.png', 20));
		assets.push(new Asset('slug', 'image', 'img/Slug.png'));
		assets.push(new Asset('torpedo', 'rotation', 'img/Torpedo.png', 16));
		assets.push(new Asset('shipExplosion', 'sound', 'snd/ship_explosion.wav'));
		assets.push(new Asset('shipWarp', 'sound', 'snd/ship_warp.wav'));
		assets.push(new Asset('slugLaunch', 'sound', 'snd/slug_launch.wav'));
		assets.push(new Asset('torpedoExplosion', 'sound', 'snd/torpedo_explosion.wav'));
		assets.push(new Asset('torpedoLaunch', 'sound', 'snd/torpedo_launch.wav'));

		var images = {};
		var animations = {};
		var rotations = {};
		var sounds = {};

		var anmAnimations = [];

		var planets = {};
		var ships = {};
		var regenTimers = {}; // contains regen timers for ships
		var slugs = {};
		var torpedoes = {};
		var collision;

		domReady(function() {
			// we don't connect until assets are loaded, because connecting
			// will precipitate a setup and an update coming back from the
			// server. which will try to load images (assets) into the sprites
			// as needed
			loadAssets(assets);
		});

		function handleSetupScreen() {
			socket.on('setup', function (data) {
				HEIGHT = data.HEIGHT;
				WIDTH = data.WIDTH;
				SHIP_TOP_SPEED = data.SHIP_TOP_SPEED;
				SHIP_TOP_ENERGY = data.SHIP_TOP_ENERGY;
				SLUG_SPEED = data.SLUG_SPEED;
				TORPEDO_SPEED = data.TORPEDO_SPEED;
				CLOAK_SECONDS = data.CLOAK_SECONDS;
				TORPEDO_DAMAGE = data.TORPEDO_DAMAGE;
				SLUG_DAMAGE = data.SLUG_DAMAGE;
				PLANET_DAMAGE = data.PLANET_DAMAGE;
				SHIP_DAMAGE = data.SHIP_DAMAGE;
				G = data.G;
				M = data.M;
				R = data.R;
				PLANET_COLLIDABLE = data.PLANET_COLLIDABLE;
				GRAVITY_ON = data.GRAVITY_ON;

				// collision object needs anims, which have images, so it has to get
				// created now
				collision = new Collision(TORPEDO_DAMAGE, SLUG_DAMAGE, SHIP_DAMAGE, PLANET_DAMAGE, anmAnimations, animations.shield, animations.explosion);

				// set up main game screen
				if (divGame === undefined) {
					divGame = document.getElementById('divGame');
					divGame.style.height = HEIGHT + 'px';
					divGame.style.width = WIDTH + 'px';
					// controls are captured by the divGame so this is run now
					handleCanvasControls();
				}
				if (divStart === undefined) {
					divStart = document.getElementById('divStart');
					divStart.style.width = WIDTH + 'px';
					divStart.style.height = HEIGHT + 'px';
					// scale title size appropriately, if screen is 800px wide, the
					// font-size will be 60px, if it's 480px wide, font-size will be
					// 36px, and so on
					document.getElementById('spnTitle').style.fontSize = WIDTH / (40/3) + 'px';
				}
				if (divDebug === undefined) {
					divDebug = document.getElementById('divDebug');
					divDebug.style.right = '0px';
				}
				document.getElementById('spnSocketId').textContent = socket.id;
				// create main canvas and context on first render
				if (canvas === undefined) {
					canvas = document.getElementById('cnvCanvas');
					canvas.height = HEIGHT;
					canvas.width = WIDTH;
					context = canvas.getContext('2d');
				}
				// create canvasTmp and contextTmp for the first time
				if (canvasTmp === undefined) {
					canvasTmp = document.createElement('canvas');
					canvasTmp.id = 'cnvCanvasTmp';
					canvasTmp.width = WIDTH;
					canvasTmp.height = HEIGHT;
					contextTmp = canvasTmp.getContext('2d');
				}
				run();
			});
		}

		function handleStartEndGame() {
			socket.on('startGame', function() {
				document.getElementById('divStart').style.display = 'none';
			});
			socket.on('endGame', function() {
				document.getElementById('divStart').style.display = 'inline';
			});
		}

		function handleReceiveUpdate() {
			socket.on('update', function(data) {
				communications++;

				gstate = data.gstate;

				var serverPlanets = data.planets;
				var serverShips = data.ships;
				var serverSlugs = data.slugs;
				var serverTorpedoes = data.torpedoes;

				// Loop through every sprite.  If it is not found in the sprites
				// from the server, delete it.
				for (var i in planets) {
					if (planets.hasOwnProperty(i)) {
						if (serverPlanets[i] === undefined) {
							delete planets[i];
						} else if (serverPlanets[i] !== undefined) {
							copyPlanet(serverPlanets[i], planets[i]);
						}
					}
				}

				for (var i in ships) {
					if (ships.hasOwnProperty(i)) {
						if (serverShips[i] === undefined) {
							delete ships[i];
						} else if (serverShips[i] !== undefined) {
							copyShip(serverShips[i], ships[i]);
							ships[i].rotateImages();
						}
					}
				}

				for (var i in slugs) {
					if (slugs.hasOwnProperty(i)) {
						if (serverSlugs[i] === undefined) {
							delete slugs[i];
						} else if (serverSlugs[i] !== undefined) {
							copyOther(serverSlugs[i], slugs[i]);
						}
					}
				}

				for (var i in torpedoes) {
					if (torpedoes.hasOwnProperty(i)) {
						if (serverTorpedoes[i] === undefined) {
							delete torpedoes[i];
						} else if (serverTorpedoes[i] !== undefined) {
							copyOther(serverTorpedoes[i], torpedoes[i]);
							torpedoes[i].rotateImages();
						}
					}
				}

				// Then loop through every server sprite.  If it is not found in
				// the local sprites, create it and copy over its attributes,
				// and set its img accordingly.  If is found, simply copy over
				// its attributes.
				for (var i in serverPlanets) {
					if (serverPlanets.hasOwnProperty(i)) {
						if (planets[i] === undefined) {
							planets[i] = new StaticSprite();
							copyPlanet(serverPlanets[i], planets[i]);
							planets[i].snum = serverPlanets[i].snum;
							planets[i].width = serverPlanets[i].width;
							planets[i].height = serverPlanets[i].height;
							planets[i].existsOnLevel = serverPlanets[i].existsOnLevel;
							planets[i].collidesWithLevels = serverPlanets[i].collidesWithLevels;
							planets[i].img = images['planet'];
						}
					}
				}

				for (var i in serverShips) {
					if (serverShips.hasOwnProperty(i)) {
						if (ships[i] === undefined) {
							ships[i] = new IntelligentSprite();
							copyShip(serverShips[i], ships[i]);
							// we can start up a regen timer once alive is set to true
							regen(ships[i]);
							ships[i].sid = serverShips[i].sid;
							ships[i].snum = serverShips[i].snum;
							ships[i].width = serverShips[i].width;
							ships[i].height = serverShips[i].height;
							ships[i].existsOnLevel = serverShips[i].existsOnLevel;
							ships[i].collidesWithLevels = serverShips[i].collidesWithLevels;
							ships[i].topSpeed = serverShips[i].topSpeed;
							ships[i].topEnergy = serverShips[i].topEnergy;
							if (ships[i].existsOnLevel === Level.PLAYER1) {
								ships[i].rotImgs = rotations['ship1'];
							} else {
								ships[i].rotImgs = rotations['ship2'];
							}
							ships[i].rotateImages();
						}
					}
				}

				for (var i in serverSlugs) {
					if (serverSlugs.hasOwnProperty(i)) {
						if (slugs[i] === undefined) {
							slugs[i] = new DynamicSprite();
							copyOther(serverSlugs[i], slugs[i]);
							slugs[i].sid = serverSlugs[i].sid;
							slugs[i].snum = serverSlugs[i].snum;
							slugs[i].width = serverSlugs[i].width;
							slugs[i].height = serverSlugs[i].height;
							slugs[i].existsOnLevel = serverSlugs[i].existsOnLevel;
							slugs[i].collidesWithLevels = serverSlugs[i].collidesWithLevels;
							slugs[i].img = images['slug'];
						}
					}
				}

				for (var i in serverTorpedoes) {
					if (serverTorpedoes.hasOwnProperty(i)) {
						if (torpedoes[i] === undefined) {
							torpedoes[i] = new DynamicSprite();
							copyOther(serverTorpedoes[i], torpedoes[i]);
							torpedoes[i].sid = serverTorpedoes[i].sid;
							torpedoes[i].snum = serverTorpedoes[i].snum;
							torpedoes[i].width = serverTorpedoes[i].width;
							torpedoes[i].height = serverTorpedoes[i].height;
							torpedoes[i].existsOnLevel = serverTorpedoes[i].existsOnLevel;
							torpedoes[i].collidesWithLevels = serverTorpedoes[i].collidesWithLevels;
							torpedoes[i].rotImgs = rotations['torpedo'];
							torpedoes[i].rotateImages();
						}
					}
				}
			});
		}

		function handleSettingChange() {
			socket.on('togglePlanet', function(data) {
				PLANET_COLLIDABLE = data.PLANET_COLLIDABLE;
			});

			socket.on('toggleGravity', function(data) {
				GRAVITY_ON = data.GRAVITY_ON;
			});
		}

		function handlePlaySound() {
			socket.on('play', function(data) {
				sounds[data.sound].play();
			});
		}

		function handleReceiveMessage() {
			socket.on('message', function(data) {
				var message = data.message;
				var duration = data.duration;
				var spnStatus = document.getElementById('spnStatus');
				spnStatus.innerHTML = message;
				if (duration > 0) {
					setTimeout(function() {
						spnStatus.innerHTML = '';
					}, duration);
				}
			});
		}

		function copyPlanet(src, dst) {
			dst.X = src.X;
			dst.Y = src.Y;
			dst.visible = src.visible;
		}

		function copyShip(src, dst) {
			dst.X = src.X;
			dst.Y = src.Y;
			dst.visible = src.visible;
			dst.alive = src.alive;
			dst.hVelocity = src.hVelocity;
			dst.vVelocity = src.vVelocity;
			dst.rotation = src.rotation;
			dst.weaponEnergy = src.weaponEnergy;
			dst.shieldEnergy = src.shieldEnergy;
		}

		function copyOther(src, dst) {
			dst.X = src.X;
			dst.Y = src.Y;
			dst.visible = src.visible;
			dst.alive = src.alive;
			dst.hVelocity = src.hVelocity;
			dst.vVelocity = src.vVelocity;
			dst.rotation = src.rotation;
		}

		function loadAssets(assets) {
			var assetsToLoad = assets.length;

			var assetLoaded = function() {
				assetsToLoad--;
				if (assetsToLoad === 0) {
					communications = 0;
					socket = io.connect();
					// the following functions reference socket so they must go
					// after socket is set to something, not before
					handleSetupScreen();
					handleStartEndGame();
					handleReceiveUpdate();
					handleSettingChange();
					handlePlaySound();
					handleReceiveMessage();
				}
			};

			for (var i = 0, il = assetsToLoad; i < il; i++) {
				var asset = assets[i];

				if (asset.getType() === 'image') {
					var img = new Image();
					img.addEventListener('load', assetLoaded);
					img.src = asset.getSrcUri();
					images[asset.getName()] = img;
				} else if (asset.getType() === 'animation') {
					var img = new Image();
					// we must attach some things to the image because it's the
					// only way to get to get information about the asset into
					// the callback
					img.name = asset.getName();
					img.frameWidth = asset.getFrameWidth();
					img.addEventListener('load', function(e) {
						animations[this.name] = AnimationArray(this, this.frameWidth, assetLoaded);
					});
					img.src = asset.getSrcUri();
				} else if (asset.getType() === 'rotation') {
					var img = new Image();
					// we must attach some things to the image because it's the
					// only way to get to get information about the asset into
					// the callback
					img.name = asset.getName();
					img.rotations = asset.getRotations();
					img.addEventListener('load', function(e) {
						rotations[this.name] = RotationArray(this, this.rotations, assetLoaded);
					});
					img.src = asset.getSrcUri();
				} else if (asset.getType() === 'sound') {
					var snd = document.createElement('audio');
					snd.addEventListener('canplay', assetLoaded);
					snd.src = asset.getSrcUri();
					sounds[asset.getName()] = snd;
				}
			}
		}

		function run() {
			if (chrUpdateGame === undefined) {
				chrUpdateGame = new Chore(estimate, 1/UPS_EXPECTED);
			}
			chrUpdateGame.start();
			
			if (chrUpdateRates === undefined) {
				chrUpdateRates = new Chore(updateRates, 1);
			}
			chrUpdateRates.start();

			resetPss();
			render();
		}

		function regen(ship) {
			ship.regen();
			regenTimers[ship.snum] = setTimeout(function() {
				regen(ship);
			}, 1000);
		}

		function estimate() {
			if (gstate === GameState.RUNNING) {
				for (var i in slugs) {
					if (slugs.hasOwnProperty(i)) {
						// much thanks for the formulas: http://physics.stackexchange.com/questions/17285/split-gravitational-force-into-x-y-and-z-componenets
						// alter velocity based on gravity well
						var x = 0.0, y = 0.0;

						var slug = slugs[i];
						x = WIDTH/2.0 - slug.X;
						y = HEIGHT/2.0 - slug.Y;

						// move ship based on velocity
						slug.X = slug.X + slug.hVelocity;
						slug.Y = slug.Y + slug.vVelocity;

						// wrap around screen if necessary
						if (slug.X <= 0 ) {
							slug.X = WIDTH;
						} else if (slug.X >= WIDTH) {
							slug.X = 0;
						}
						if (slug.Y < 0) {
							slug.Y = HEIGHT;
						} else if (slug.Y >= HEIGHT) {
							slug.Y = 0;
						}

						if (PLANET_COLLIDABLE=== true) {
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
					}

					// clear regens if the ship is dead
					if (ship.alive === false) {
						gstate = GameState.GAMEOVER;
						clearTimeout(regenTimers['2']);
						clearTimeout(regenTimers['3']);
					}
				}
				collision.collide(ships['2'], ships['3']);
				if (PLANET_COLLIDABLE === true) {
					collision.collide(ships['2'], planets['1']);
					collision.collide(ships['3'], planets['1']);
				}
			}
		}

		function updateRates() {
			document.getElementById('spnFpsExpected').textContent = FPS_EXPECTED;
			document.getElementById('spnFpsActual').textContent = fpsActual.toFixed(2);
			document.getElementById('spnUpsExpected').textContent = UPS_EXPECTED;
			document.getElementById('spnUpsActual').textContent = chrUpdateGame.getTps().toFixed(2);
			document.getElementById('spnCpsExpected').textContent = undefined;
			document.getElementById('spnCpsActual').textContent = cpsActual.toFixed(2);
		}

		function render() {
			// clear contextTmp
			contextTmp.clearRect(0, 0, canvasTmp.width, canvasTmp.height);

			// draw to contextTmp
			
			// first draw starfield and planet
			contextTmp.drawImage(images['starfield'], 0, 0, WIDTH, HEIGHT);
			for (var i in planets) {
				if (planets.hasOwnProperty(i)) {
					planets[i].draw(contextTmp);
				}
			}

			// draw players
			for (var i in ships) {
				if (ships.hasOwnProperty(i)) {
					ships[i].draw(contextTmp);
				}
			}

			for (var i in slugs) {
				if (slugs.hasOwnProperty(i)) {
					slugs[i].draw(contextTmp);
				}
			}

			for (var i in torpedoes) {
				if (torpedoes.hasOwnProperty(i)) {
					torpedoes[i].draw(contextTmp);
				}
			}

			// draw animations
			for (var i = 0, il = anmAnimations.length; i < il; i++) {
				var animation = anmAnimations[i];
				if (animation !== undefined) {
					animation.updateFrame();
					if (animation.getCurrentFrame() === -1) {
						delete anmAnimations[i];
					} else {
						animation.draw(contextTmp);
					}
				}
			}

			// draw shield and weapon energies for both players, if they exist
			contextTmp.fillStyle = 'red';
			contextTmp.fillText('S', 20, 530);
			if (ships['2'] !== undefined) {
				contextTmp.fillRect(35, 525, ships['2'].shieldEnergy * 3, 2);
			}
			contextTmp.fillText('W', 20, 550);
			if (ships['2'] !== undefined) {
				contextTmp.fillRect(35, 545, ships['2'].weaponEnergy * 3, 2);
			}
			contextTmp.fillStyle = 'blue';
			contextTmp.fillText('S', 760, 530);
			if (ships['3'] !== undefined) {
				contextTmp.fillRect(755 - ships['3'].shieldEnergy * 3, 525, ships['3'].shieldEnergy * 3, 2);
			}
			contextTmp.fillText('W', 760, 550);
			if (ships['3'] !== undefined) {
				contextTmp.fillRect(755 - ships['3'].weaponEnergy * 3, 545, ships['3'].weaponEnergy * 3, 2);
			}

			// now draw canvasTmp to context
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(canvasTmp, 0, 0);
	
			frames++;
			now = timestamp();
			var elapsed = now - begin;
			if (elapsed >= 1000) {
				computePss(elapsed);
			}

			requestAnimationFrame(render);
		}

		function computePss(elapsed) {
			cpsActual = communications/(elapsed/1000);
			fpsActual = frames/(elapsed/1000);
			resetPss();
		}
		
		function resetPss() {
			communications = 0;
			frames = 0;
			begin = timestamp();
		}
		
		// We're going to do two things here.  Every time a player issues a
		// command, the client will respond to the command so that the display
		// updates immediately, but it will also request to have the command
		// applied in the server's world.  If the server decides this is a no
		// go, the server's word goes, and it will be undone on the next update
		// posted from the server.  Since the client has most of the same
		// objects in play, they will likely agree, but because new players can
		// connect to the server without the client knowing, and the client may
		// experience lag, sometimes the world of the client may also lag
		// behind.  Also, the client can be hacked by a player quite easily, so
		// it would not do to take the client's word for anything, like ammo
		// remaining or shield capacity.
		function handleCanvasControls() {
			divGame.addEventListener('keydown', function(e) {
				var k = e.which;
				console.log(k);
				if (k === 32) {
					requestStart();
				} else if (k === 192) {
					if (e.shiftKey === true) {
						toggleDebug();
					}
				} else if (k === 36 || k === 103 || k === 81) { // fire slug
					requestShootSlug();
				} else if (k === 38 || k === 104 || k === 87) { // cloak
					requestCloak();
				} else if (k === 33 || k === 105 || k === 69) { // fire torpedo
					requestShootTorpedo();
				} else if (k === 37 || k === 100 || k === 65) { // rotate ccw
					requestRotate(-1);
				} else if (k === 12 || k === 101 || k === 83) { // engine thrust
					requestAccelerate(1);
				} else if (k === 39 || k === 102 || k === 68) { // rotate cw
					requestRotate(1);
				} else if (k === 35 || k === 97 || k === 90) { // weapon energy
					requestTransferStoW();
				} else if (k === 40 || k === 98 || k === 88) { // hyper space
					requestHyperspace();
				} else if (k === 34 || k === 99 || k === 67) { // shield energy
					requestTransferWtoS();
				} else if (k === 112) { // toggle planet collisions
					requestTogglePlanet();
				} else if (k === 113) { // toggle gravity
					requestToggleGravity();
				}
			});
		}

		function requestStart() {
			socket.emit('requestStart');
		}

		function requestShootSlug() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestShootSlug');
			}
		}

		function requestShootTorpedo() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestShootTorpedo');
			}
		}

		function requestAccelerate(acceleration) {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestAccelerate', {acceleration: acceleration});
				ships[getShipIdBySocketId()].accelerate(acceleration);
			}
		}

		function requestTransferStoW() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestTransferStoW');
				ships[getShipIdBySocketId()].transferStoW();
			}
		}

		function requestHyperspace() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestHyperspace');
			}
		}

		function requestCloak() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestCloak');
			}
		}

		function requestTransferWtoS() {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestTransferWtoS');
				ships[getShipIdBySocketId()].transferWtoS();
			}
		}

		function requestTogglePlanet() {
			socket.emit('requestTogglePlanet');
		}

		function requestToggleGravity() {
			socket.emit('requestToggleGravity');
		}

		function requestRotate(rotation) {
			if (gstate === GameState.RUNNING) {
				socket.emit('requestRotate', {rotation: rotation});
				ships[getShipIdBySocketId()].rotate(rotation);
				ships[getShipIdBySocketId()].rotateImages();
			}
		}

		function getShipIdBySocketId() {
			for (var i in ships) {
				if (ships.hasOwnProperty(i)) {
					if (ships[i].sid === socket.id) {
						return i;
					}
				}
			}
		}

		function toggleDebug() {
			var divDebug = document.getElementById('divDebug');
			if (window.getComputedStyle(divDebug).display === 'none') {
				divDebug.style.display = 'block';
			} else if (window.getComputedStyle(divDebug).display === 'block') {
				divDebug.style.display = 'none';
			}
		}
	}
);
