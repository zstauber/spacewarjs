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
	['sprite/StaticSprite'],
	function(StaticSprite) {
		return function() {
			function DynamicSprite() {
				this.type = 'DynamicSprite';
				this.alive = true;
				this.hVelocity;
				this.vVelocity;
				this.rotation = 0;
				this.rotImgs = []; // send in the array, set the main img based on rotation
			}
			DynamicSprite.prototype = new StaticSprite();
			DynamicSprite.prototype.rotate = function(rotation) {
				// The rotation will flip back to zero when it reaches the
				// number of images in the rotImgs array.  If it goes below
				// zero it will flip back to the maximum.  Let's say rotation is
				// -2 and the number of arcs in a full rotation is 16.  The end
				// rotation should be 14.
				var arcs = 16; // this.rotImgs.length;
				if (rotation === 1) {
					this.rotation += 1;
				} else if (rotation === -1) {
					this.rotation += -1;
				}
				while (this.rotation < 0) {
					this.rotation = arcs + this.rotation;
				}
				// Here if it's above 16 we remove 16 from it until it isn't.
				this.rotation = this.rotation % arcs;
			};
			DynamicSprite.prototype.rotateImages = function() {
				// This function is only run by the client, since the rotImgs
				// attribute will be empty on the server version of the sprite,
				// and it will not run.
				this.img = this.rotImgs[this.rotation];
			};
			DynamicSprite.prototype.damage = function() {
				// DynamicSprites only have one hit point, so any damage is death
				this.alive = false;
			};
			return new DynamicSprite();
		};
	}
);