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

define(['timestamp',],
	function(timestamp) {
		return function(func, step, multi) {
			function ChoreSingle(func, step) {
				var task = func; // a variable pointing to the function we run
				var step = step; // a time period in seconds, such as 1/60 or 1/100
				var tps = 0; // tasks per second
				var timer; // a handle to setTimeout for the next task
				var interval = step * 1000; // time period in milliseconds
				var tasks; // a running count of how many times task has run
				var begin; // the time Chore starts
				var now; // a variable holding the current time	

				var loop = function() {
					// run the Chore's actual task first
					task();
					tasks++;

					// get a time now that the task has run
					now = timestamp();
					// elapsed is the time it took for the task to run
					var elapsed = now - begin;
					if (elapsed >= 1000) {
						computeTps(elapsed);
					}

					// If we have run n tasks, elapsed should be n times the interval
					// If we are under that time, we delay by the difference
					// If we are over that time, we run setImmediate instead to try and
					// catch up
					var expected = (tasks + 1) * interval;
					var delay = Math.max(0, expected - elapsed);
					timer = setTimeout(function() {loop();}, delay);
					//if (console) {console.log('elapsed = ', + elapsed + ', delay = ' + delay + ', expected = ' + expected + ', now = ' + now + ', begin = ' + begin);}
				};		
				this.start = function() {
					resetTps();
					loop();
				};
				this.stop = function() {
					clearTimeout(timer);
				};
				var computeTps = function(elapsed) {
					// This updates only once every second, and resets the times task
					// has run and begin time.  It really should match our step
					tps = tasks/(elapsed/1000);
					resetTps();
					//if (console) {console.log('TPS: ' + tps);}
				};
				var resetTps = function() {
					tasks = 0;
					begin = timestamp();
				};
				this.getTps = function() {
					return tps;
				};
			}

			function ChoreMulti(func, step) {
				var task = func; // a variable pointing to the function we run
				var step = step; // a time period in seconds, such as 1/60 or 1/100
				var tps;
				var timer = new Worker('js/chore/timer.js');

				if (step > 0 && step < 1) {
					timer.postMessage(step);
				} else {
					throw new Error('Step needs to evaluate to a number between 0 and 1.');
				}

				this.start = function() {
					timer.postMessage('start');
				};
				this.stop = function() {
					timer.postMessage('stop');
				};
				this.getTps = function() {
					return tps;
				};

				timer.addEventListener('message', function(e) {
					var data = e.data;
					if (data.tick === 'tick') {
						task();
					}
					if (data.tps !== tps) {
						tps = data.tps;
					}
				});
			}

			// This combines single and multi-threaded Chore objects into one module
			// If the user sends a true as the third parameter, it will return a
			// multi-threaded Chore object using a web worker to send back ticks.
			// If the user sends false or nothing as the third parameter, it
			// defaults to a single thread that runs the ticker inside the Chore
			// object.  In either case, their 3 public functions are start, stop,
			// and tps.
			if (multi === true) {
				if (typeof(Worker) !== 'undefined') {
					return new ChoreMulti(func, step);
				} else {
					throw new Error('Web Workers not supported.  Change the chore instantiation to false to run as single-threaded.');
				}
			} else {
				return new ChoreSingle(func, step);
			}
		};
	}
);
