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
	['sprite/DynamicSprite', 'sprite/Regen'],
	function(DynamicSprite, Regen) {
		return function() {
			function IntelligentSprite() {
				this.type = 'IntelligentSprite';
				// This is the socket ID of the player of this sprite, so that a
				// client may know which image to display (red or blue ship).
				// Images are large so they're not sent over the socket, plus
				// they are only displayed on the client, so the server version
				// doesn't even have an img attached
				this.sid;
				this.topSpeed;
				this.topEnergy;
				this.weaponEnergy;
				this.shieldEnergy;
				this.lastRegenerated = Regen.WEAPON;
			}
			IntelligentSprite.prototype = new DynamicSprite();
			IntelligentSprite.prototype.accelerate = function(acceleration) {
				// find the rotation in cartesian radians
				var phi = (this.rotation * -22.5) * (Math.PI / 180);
				var newHVelocity;
				var newVVelocity;
				if (acceleration === 1) {
					// this always assumes a unit circle, however acceleration
					// could actually be !== 1 and then "* acceleration" would
					// change the magnitude of each vector
					newHVelocity = this.hVelocity + Math.cos(phi);
					newVVelocity = this.vVelocity - Math.sin(phi);
				}
				if (Math.pow(Math.pow(newHVelocity, 2) + Math.pow(newVVelocity, 2), 1/2) <= this.topSpeed) {
					this.hVelocity = newHVelocity;
					this.vVelocity = newVVelocity;
				}
			};
			IntelligentSprite.prototype.transferWtoS = function() {
				if (this.weaponEnergy > 0 && this.shieldEnergy < this.topEnergy) {
					this.weaponEnergy--;
					this.shieldEnergy++;
				}
			};
			IntelligentSprite.prototype.transferStoW = function() {
				if (this.shieldEnergy > 0 && this.weaponEnergy < this.topEnergy) {
					this.shieldEnergy--;
					this.weaponEnergy++;
				}
			};
			IntelligentSprite.prototype.damage = function(points) {
				if (this.shieldEnergy >= 0) {
					this.shieldEnergy -= points;
				}
				if (this.shieldEnergy < 0) {
					this.shieldEnergy = 0;
					this.visible = false;
					this.alive = false;
				}
			};
			IntelligentSprite.prototype.regen = function() {
				if (this.alive === true) {
					// energy regen alternates between weapons and shields, until
					// one is full, and then goes fully into the remaining one until
					// it is also full, then has no effect
					if (this.lastRegenerated === Regen.SHIELD || this.shieldEnergy === this.topEnergy) {
						if (this.weaponEnergy < this.topEnergy) {
							this.weaponEnergy++;
						}
						this.lastRegenerated = Regen.WEAPON;
					} else if (this.lastRegenerated === Regen.WEAPON || this.weaponEnergy === this.stopEnergy) {
						if (this.shieldEnergy < this.topEnergy) {
							this.shieldEnergy++;
						}
						this.lastRegenerated = Regen.SHIELD;
					}
				}
			};
			IntelligentSprite.prototype.cloak = function() {
				this.visible = false;
				setTimeout(function() {
					this.visible = true;
				}, 1000);
			};
			return new IntelligentSprite();
		};
	}
);