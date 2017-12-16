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

var timer; // a handle to the setTimeout object, so it can be cleared
var message; // this is the return object sent back by the worker
var step; // the tick period in seconds
var interval; // the tick period in milliseconds
var ticks = 0; // a count of how many times the tick has run
var tps = 0; // the number of ticks per second recorded in the last second
var begin; // the time the last second has started
var now; // holds the current time
var elapsed = 0; // the differnce between begin and now
var expected; // the expected time to have passed after n ticks
var delay; // the time we want to wait before calling setTiemout again

function initializeTimer() {
	addEventListener('message', function(e) {
		var data = e.data;
		if (data === "start") {
			startTimer();
		} else if (data === "stop") {
			stopTimer();
		} else if (data > 0) {
			step = data;
			interval = step * 1000;
		}
	});
}

initializeTimer();

function startTimer() {
	resetTps();
	timerCount();
}

function resetTps() {
	ticks = 0;
	begin = timestamp();
}

function timerCount() {
	// our task is simply to send back a tick, along with the actual tps
	message = {
		tick: "tick",
		tps: tps
	};
	postMessage(message);
	ticks++;
	
	// get a time now that the task has run
	now = timestamp();
	elapsed = now - begin;
	
	if (elapsed >= 1000) {
		computeTps();
	}
	
	// If we have run n tasks, elapsed should be n times the interval
	// If we are under that time, we delay by the difference
	// If we are over that time, we run immediately, but we can't pass a neg
	expected = (ticks + 1) * interval;
	delay = Math.max(0, expected - elapsed);
	timer = setTimeout(timerCount, delay);	
}

function timestamp() {
	return new Date().getTime();
}

function computeTps() {
	tps = ticks/(elapsed/1000);
	resetTps();
}

function stopTimer() {
	clearTimeout(timer);
}
