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
		// The input parameters are the path to the strip image, and the width of
		// each frame.  It returns an array of images. The number of images returned
		// is the width of the input strip divided by the width of each frame.
		return function AnimationArray(image, frameWidth, callback) {
			// http://stackoverflow.com/questions/923885/capture-html-canvas-as-gif-jpg-png-pdf
			// http://www.html5canvastutorials.com/advanced/html5-canvas-load-image-data-url/
			var stripWidth = image.width;
			var stripHeight = image.height;
			var intFrames = stripWidth / frameWidth;

			var cnvScratch1 = document.createElement('canvas');
			cnvScratch1.width = stripWidth;
			cnvScratch1.height = stripHeight;
			var cntScratch1 = cnvScratch1.getContext('2d');
			cntScratch1.drawImage(image, 0, 0, stripWidth, stripHeight);

			var cnvScratch2 = document.createElement('canvas');
			cnvScratch2.width = frameWidth;
			cnvScratch2.height = stripHeight;
			var cntScratch2 = cnvScratch2.getContext('2d');

			var imgFrames = [];
			var loadedFrames = 0;
			for (var i = 0; i < intFrames; i++) {
				var imgFrame = cntScratch1.getImageData(i * frameWidth, 0, frameWidth, stripHeight);
				cntScratch2.putImageData(imgFrame, 0, 0);
				var img = new Image();
				// execute callback once all images are loaded into the array
				img.addEventListener('load', function(e) {
					loadedFrames++;
					if (loadedFrames === intFrames) {
						if (callback !== undefined) {
							callback(image.src);
						}
					}
				});
				imgFrames.push(img);
				imgFrames[i].src = cnvScratch2.toDataURL('image/png');
				cntScratch2.clearRect(0, 0, cnvScratch2.width, cnvScratch2.height);
			}

			return imgFrames;
		};
	}
);