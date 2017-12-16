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
	[],
	function() {
		// The input parameters are the path to the strip image, and the width of
		// each frame.  It returns an array of images. The number of images returned
		// is the width of the input strip divided by the width of each frame.
		return function() {
			function StaticSprite() {
				this.type = 'StaticSprite';
				this.snum; // this is the sprite number, a unique number that is conveyed between clients and server
				this.X;
				this.Y;
				this.width;
				this.height;
				this.img;
				this.visible;
				this.collisionPolygon; // this was in case we had a library that could determine intersections between complex polygons
				this.existsOnLevel;
				this.collidesWithLevels = [];
			}
			StaticSprite.prototype.draw = function(context) {
				if (this.visible === true) {
					context.drawImage(this.img, Math.round(this.X - this.width/2), Math.round(this.Y - this.height/2), this.width, this.height);
				}
			};
			return new StaticSprite();
		};
	}
);