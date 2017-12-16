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

var PORT      = 3000;

var requirejs = require('requirejs');
var http      = requirejs('http');
var fs        = requirejs('fs');
var path      = requirejs('path');
var mime      = requirejs('mime');
var cache     = {};

requirejs.config({
	baseUrl: __dirname,
	nodeRequire: require,
    packages: [
		{name: 'timestamp', location: 'public/js/lib/timestamp'},
		{name: 'chore', location: 'public/js/lib/chore'},
		{name: 'animation', location: 'public/js/lib/animation'},
		{name: 'sprite', location: 'public/js/lib/sprite'},
		{name: 'GameState', location: 'public/js/lib', main: 'GameState'}
    ]	
});

requirejs(['./lib/spacewar_server'], function(spacewar_server) {
	function send404(response) {
		response.writeHead(404, {'Content-Type': 'text/plain'});
		response.write('Error 404: response not found.');
		response.end();
	}

	function sendFile(response, filePath, fileContents) {
		response.writeHead(
			200,
			{'Content-Type': mime.lookup(path.basename(filePath))}
		);
		response.end(fileContents);
	}

	function serveStatic(response, cache, absPath) {
		if (cache[absPath]) {
			sendFile(response, absPath, cache[absPath]);
		} else {
			fs.exists(absPath, function(exists) {
				if (exists) {
					fs.readFile(absPath, function(err, data) {
						if (err) {
							send404(response);
						} else {
							cache[absPath] = data;
							sendFile(response, absPath, data);
						}
					});
				} else {
					send404(response);
				}
			});
		}
	}

	var server = http.createServer(function(request, response) {
		var filePath = false;

		if (request.url === '/') {
			filePath = 'public/index.html';
		} else {
			filePath = 'public' + request.url;
		}
		var absPath = './' + filePath;
		serveStatic(response, cache, absPath);
	});

	server.listen(PORT, function() {
		console.log('Server listening on port ' + PORT + '.');
	});

	spacewar_server(server);
});
