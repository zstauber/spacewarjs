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

define(
    ['animation', 'sprite/Level'],
    function(Animation, Level) {
		//['sprite/StaticSprite','sprite/DynamicSprite','sprite/IntelligentSprite','sprite/Level'],
		//function(StaticSprite, DynamicSprite, IntelligentSprite, Level) {
			return function(TORPEDO_DAMAGE, SLUG_DAMAGE, SHIP_DAMAGE, PLANET_DAMAGE, anmAnimations, imgsShield, imgsExplosion) {
				function Collision(SHIP_DAMAGE, anmAnimations, imgsShield, imgsExplosion) {
					this.TORPEDO_DAMAGE = TORPEDO_DAMAGE;
					this.SLUG_DAMAGE = SLUG_DAMAGE;
					this.SHIP_DAMAGE = SHIP_DAMAGE;
					this.PLANET_DAMAGE = PLANET_DAMAGE;
					this.anmAnimations = anmAnimations;
					this.imgsShield = imgsShield;
					this.imgsExplosion = imgsExplosion;
				}
				Collision.prototype.doCollide = function(a, b) {
					// We first check if the two sprites can even collide, and if
					// so, then we check if their circles intersect
					var aLevel = a.existsOnLevel;
					var aLevels = a.collidesWithLevels;
					var bLevel = b.existsOnLevel;
					var bLevels = b.collidesWithLevels;
					if (bLevels.indexOf(aLevel) !== -1 && aLevels.indexOf(bLevel) !== -1) {
						if (Math.pow((b.X - a.X) * (b.X - a.X) + (b.Y - a.Y) * (b.Y - a.Y), 0.5) <= (a.width/2 + b.width/2)) {
							return true;
						} else {
							return false;
						}
					} else {
						return false;
					}
				};
				// This object has a master method called collide, which determines
				// the type of sprites being collided, and calls the appropriate
				// sprite-specific collide function.  This possible collisions are:
				// static sprite: planet
				// dynamic sprite: slug or missile
				// intelligent sprite: player 1 or player 2 ships
				// intelligent sprite vs. intelligent sprite: both bounce, take moderate damage
				// intelligent sprite vs. dynamic sprite: intelligent takes minor damage, dynamic is destroyed
				// intelligent sprite vs. static sprite: intelligent bounces, takes major damage
				// dynamic sprite vs. dynamic sprite: both are destroyed
				// dynamic sprite vs. static sprite: dynamic is destroyed
				// static sprite vs. static sprite: no collisions possible, neither are capable of movement
				Collision.prototype.collide = function(a, b) {
					if (this.doCollide(a, b)) {
						if (a.type === 'IntelligentSprite') {
							if (b.type === 'IntelligentSprite') {
								this.collideII(a, b);
								return true;
							} else if (b.type === 'DynamicSprite') {
								this.collideID(a, b);
								return true;
							} else if (b.type === 'StaticSprite') {
								this.collideIS(a, b);
								return true;
							}
						} else if (a.type === 'DynamicSprite') {
							if (b.type === 'DynamicSprite') {
								this.collideDD(a, b);
								return true;
							} else if (b.type === 'StaticSprite') {
								this.collideDS(a, b);
								return true;
							}
						} else if (a.type === 'StaticSprite') {
							if (b.type === 'StaticSprite') {
								this.collideSS(a, b);
								return true;
							}
						}
					} else {
						return false;
					}
				};
				Collision.prototype.collideII = function(a, b) {
					// thanks to http://archive.ncsa.illinois.edu/Classes/MATH198/townsend/math.html
					// check for collision
					// find trajectories of each ball
					var a_dir_before = Math.atan2(a.vVelocity,a.hVelocity);
					var b_dir_before = Math.atan2(b.vVelocity,b.hVelocity);

					// find combined vector velocity of each ball
					var a_vel_before = Math.pow(a.hVelocity * a.hVelocity + a.vVelocity * a.vVelocity, 0.5);
					var b_vel_before = Math.pow(b.hVelocity * b.hVelocity + b.vVelocity * b.vVelocity, 0.5);

					// find normal of collision
					var normal = Math.atan2(b.Y - a.Y, b.X - a.X);

					// find separation between ball trajectories and normal
					var a_dir_normal_before = a_dir_before - normal;
					var b_dir_normal_before = b_dir_before - normal;

					// find the velocities of each ball along the normal and tangent directions
					var a_vel_nor_before = a_vel_before * Math.cos(a_dir_normal_before);
					var a_vel_tan_before = a_vel_before * Math.sin(a_dir_normal_before);

					var b_vel_nor_before = b_vel_before * Math.cos(b_dir_normal_before);
					var b_vel_tan_before = b_vel_before * Math.sin(b_dir_normal_before);

					// find velocities after collision, relative to the normal
					// balls keep their normal velocities but exchange tangent velocities
					var a_vel_nor_after = b_vel_nor_before;
					var a_vel_tan_after = a_vel_tan_before;

					var b_vel_nor_after = a_vel_nor_before;
					var b_vel_tan_after = b_vel_tan_before;

					// find velocities after collision, total
					var a_vel_after = Math.pow(a_vel_nor_after * a_vel_nor_after + a_vel_tan_after * a_vel_tan_after, 0.5);
					var b_vel_after = Math.pow(b_vel_nor_after * b_vel_nor_after + b_vel_tan_after * b_vel_tan_after, 0.5);

					// shrink speeds to speed limit
					if (a_vel_after > a.topSpeed) {
						a_vel_after = a.topSpeed;
					}
					if (b_vel_after > b.topSpeed) {
						b_vel_after = b.topSpeed;
					}

					// find trajectory (relative to normal), after collision
					var a_dir_normal_after = Math.atan2(a_vel_tan_after, a_vel_nor_after);
					var b_dir_normal_after = Math.atan2(b_vel_tan_after, b_vel_nor_after);

					// find trajectory (relative to original coordinate system), after collision
					// ball keeps normal velocity but tangent velocity goes negative since it is reflecting at an angle equal to the angle of incidence
					var a_dir_after = a_dir_normal_after + normal;
					var b_dir_after = b_dir_normal_after + normal;

					// find vector velocities (relative to original coordinate system), after collision
					a.hVelocity = a_vel_after * Math.cos(a_dir_after);
					a.vVelocity = a_vel_after * Math.sin(a_dir_after);

					b.hVelocity = b_vel_after * Math.cos(b_dir_after);
					b.vVelocity = b_vel_after * Math.sin(b_dir_after);

					if (this.anmAnimations !== undefined) { // meaning, if on the client, not the server
						if (a.alive === true) {
							this.anmAnimations.push(new Animation(this.imgsShield, a, 0.1));
						} else {
							this.anmAnimations.push(new Animation(this.imgsExplosion, a, 1));
						}
						if (b.alive === true) {
							this.anmAnimations.push(new Animation(this.imgsShield, b, 0.1));
						} else {
							this.anmAnimations.push(new Animation(this.imgsExplosion, b, 1));
						}
					}
					// both take minor damage
					a.damage(this.SHIP_DAMAGE);
					b.damage(this.SHIP_DAMAGE);
				};
				Collision.prototype.collideID = function(a, b) { // ship with slug or torpedo
					// ship takes moderate damage
					if (b.existsOnLevel === Level.SLUG) {
						a.damage(this.SLUG_DAMAGE);
					}	else if (b.existsOnLevel === Level.TORPEDO) { // torpedo causes explosion on itself
						if (this.anmAnimations !== undefined) { // not on server
							// torpedo must explode before it dies
							this.anmAnimations.push(new Animation(this.imgsExplosion, b, 1));
						}
						a.damage(this.TORPEDO_DAMAGE);
					}
					// slug or torpedo dies
					b.damage();
					if (this.anmAnimations !== undefined) { // meaning, if on the client, not the server
						if (a.alive === true) {// shield flickers or ship explodes if it dies
							this.anmAnimations.push(new Animation(this.imgsShield, a, 0.1));
						}	else {
							this.anmAnimations.push(new Animation(this.imgsExplosion, a, 1));
						}
					}
				};
				Collision.prototype.collideIS = function(a, b) { // ship with planet
					// if a ship gets inside a planet's radius before bouncing out due to a threading pause
					// it will start colliding rapidly, die, but still collide and produce animations of
					// exploding forever, and therefore the game will never reset.  This doesn't eliminate
					// the problem of snagging on the planet, but at least once the ship is dead it won't
					// continue to collide and produce animations, so the game will reset.
					if (a.alive !== false) {
						// find trajectory of ship
						var a_dir_before = Math.atan2(a.vVelocity, a.hVelocity);

						// find combined vector velocity of ship
						var a_vel_before = Math.pow(a.hVelocity * a.hVelocity + a.vVelocity * a.vVelocity, 0.5);

						// find normal of collision
						var normal = Math.atan2(b.Y - a.Y, b.X - a.X);

						// find separation between ship trajectory and normal
						var a_dir_normal_before = a_dir_before - normal;

						// find the velocity of ball along the normal and tangent directions
						var a_vel_nor_before = a_vel_before * Math.cos(a_dir_normal_before);
						var a_vel_tan_before = a_vel_before * Math.sin(a_dir_normal_before);

						// find velocity after collision, relative to the normal
						var a_vel_nor_after = -a_vel_nor_before;
						var a_vel_tan_after = a_vel_tan_before;

						// find velocity after collision, total
						var a_vel_after = Math.pow(a_vel_nor_after * a_vel_nor_after + a_vel_tan_after * a_vel_tan_after, 0.5);

						// do not need to check speed limit because ship can't increase speed on bounce

						// find trajectory (relative to normal), after collision
						var a_dir_normal_after = Math.atan2(a_vel_tan_after, a_vel_nor_after);

						// find trajectory (relative to original coordinate system), after collision
						var a_dir_after = a_dir_normal_after + normal;

						// find vector velocity (relative to original coordinate system), after collision
						a.hVelocity = a_vel_after * Math.cos(a_dir_after);
						a.vVelocity = a_vel_after * Math.sin(a_dir_after);

						if (this.anmAnimations !== undefined) { // meaning, if on the client, not the server
							if (a.alive === true) {
								this.anmAnimations.push(new Animation(this.imgsShield, a, 0.1));
							} else {
								this.anmAnimations.push(new Animation(this.imgsExplosion, a, 1));
							}
						}
						// ship takes major damage
						a.damage(this.PLANET_DAMAGE);
					}
				};
				Collision.prototype.collideDD = function(a, b) { // slug with torpedo
					if (this.anmAnimations !== undefined) {
						if (a.existsOnLevel === Level.TORPEDO) {
							this.anmAnimations.push(new Animation(this.imgsExplosion, a, 1));
						}
						if (b.existsOnLevel === Level.TORPEDO) {
							this.anmAnimations.push(new Animation(this.imgsExplosion, b, 1));
						}
					}
					// Both slugs/torpedoes die, they have no shield points
					a.damage();
					b.damage();
				};
				Collision.prototype.collideDS = function(a, b) { // slug or torpedo with planet
					if (this.anmAnimations !== undefined) {
						if (a.existsOnLevel === Level.TORPEDO) {
							this.anmAnimations.push(new Animation(this.imgsExplosion, a, 1));
						}
					}
					// Planet cannot be damaged, slug/torpedo dies
					a.damage();
				};
				Collision.prototype.collideSS = function(a, b) { // planet with planet
					// not really possible, planets don't move
				}
				return new Collision(SHIP_DAMAGE, anmAnimations, imgsShield, imgsExplosion);
			}
		}
);