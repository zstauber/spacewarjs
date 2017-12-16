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
		// The input parameters are the path to the strip image, and the number of
		// rotations in a full circle.  If rotations is 4, for example, the array
		// returned would have the 4 cardinal directions.  If it is 16, the array
		// returned would have an image rotated every 22.5 degrees.
		return function RotationArray(image, rotations, callback) {
			// http://stackoverflow.com/questions/923885/capture-html-canvas-as-gif-jpg-png-pdf
			// http://www.html5canvastutorials.com/advanced/html5-canvas-load-image-data-url/
			// http://creativejs.com/2012/01/day-10-drawing-rotated-images-into-canvas/
			var imageWidth = image.width;
			var imageHeight = image.height;
			var fltRotation = 2 * Math.PI / rotations;

			var cnvScratch1 = document.createElement('canvas');
			cnvScratch1.width = imageWidth;
			cnvScratch1.height = imageHeight;
			var cntScratch1 = cnvScratch1.getContext('2d');

			var cnvScratch2 = document.createElement('canvas');
			cnvScratch2.width = imageWidth;
			cnvScratch2.height = imageHeight;
			var cntScratch2 = cnvScratch2.getContext('2d');

			var imgFrames = [];
			var loadedFrames = 0;
			for (var i = 0; i < rotations; i++) {
				cntScratch1.save();
				cntScratch1.translate(imageWidth / 2, imageHeight / 2);
				cntScratch1.rotate(i * fltRotation);
				cntScratch1.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
				var imgFrame = cntScratch1.getImageData(0, 0, imageWidth, imageHeight);
				cntScratch1.restore();
				cntScratch1.clearRect(0, 0, cnvScratch1.width, cnvScratch1.height);
				cntScratch2.putImageData(imgFrame, 0, 0);
				var img = new Image();
				// execute callback once all images are loaded into the array
				img.addEventListener('load', function(e) {
					loadedFrames++;
					if (loadedFrames === rotations) {
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