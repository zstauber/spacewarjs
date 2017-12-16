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

define([],
	function() {
		// name is the handle that will be used for the asset later,
		// type is either image, animation, or rotation.
		// srcUri is the input image
		// parameter is undefined for image, frame width for aniations, and
		// number of rotations for a rotation
		return function(name, type, srcUri, parameter) {
			var name = name;
			var type = type;
			var srcUri = srcUri;
			var frameWidth;
			var rotations;
			if (type === 'animation') {
				frameWidth = parameter;
			} else if (type === 'rotation') {
				rotations = parameter;
			}
			
			this.getName = function() {
				return name;
			};
			
			this.getType = function() {
				return type;
			};
			
			this.getSrcUri = function() {
				return srcUri;
			};
			
			this.getFrameWidth = function() {
				return frameWidth;
			};
			
			this.getRotations = function() {
				return rotations;
			};
		};
	}
);
