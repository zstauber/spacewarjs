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
	['timestamp'],
	function(timestamp) {
		return function(imgFrames, sprite, duration) {
			var imgFrames = imgFrames; // an array of HTML images
			var intFrames = imgFrames.length;
			var intWidth = imgFrames[0].width;
			var intHeight = imgFrames[0].height;
			var intCurrentFrame = 0;
			var sprite = sprite; // a sprite, presumably with an XY position
			var duration = duration; // the animation duration, in seconds
			var period = duration * 1000 / intFrames; // the length of each frame, in milliseconds
			var begin = timestamp(); // holds the time when animation first started
			var now; // holds the current time
			var elapsed;

			this.draw = function(context) {
				//if (console) {console.log(sprite);}
				var x = sprite.X;
				var y = sprite.Y;
				context.drawImage(imgFrames[intCurrentFrame], x - intWidth / 2, y - intHeight / 2, intWidth, intHeight);
			};

			this.updateFrame = function() {
				now = timestamp();
				elapsed = now - begin;
				intCurrentFrame = Math.floor(elapsed / period);
				if (intCurrentFrame >= intFrames) {
					intCurrentFrame = -1;
				}
			};

			this.getCurrentFrame = function() {
				return intCurrentFrame;
			};
		};
	}
);
