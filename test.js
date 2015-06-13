'use strict';

var imgHost = require('./index');
var http = require('http');
var urlParser = require('url').parse;

var listener = imgHost.listener({
	urlParser: function (url, cb) {
		var parsedUrl = urlParser(url, true);
		var size = {
			width: Number(parsedUrl.query.w),
			height: Number(parsedUrl.query.h)
		};
		cb(null, {
			fullsizePath: '/home/nyrkovalex/Pictures' + parsedUrl.pathname,
			scaledPath: '/tmp' +
					parsedUrl.pathname +
					size.width + 'x' + size.height +
					'-' + parsedUrl.query.method,
			size: size,
			method: parsedUrl.query.method
		});
	}
});

var server = http.createServer(listener);
server.listen(6666);
