'use strict';

var defaultUrlParser = require('./urlParser');
var scaler = require('./scaler');
var fs = require('fs');

function sanitize(path, cb) {
	if (path.indexOf('..') > -1) {
		return cb(new Error('possible malicious path'));
	}
	cb(null, path);
}

function fullsizeExists(req, cb) {
	fs.exists(req.fullsizePath, cb);
}

function scaledExists(req, cb) {
	fs.exists(req.scaledPath, cb);
}

function readScaled(req) {
	return fs.createReadStream(req.scaledPath);
}

function Listener(cfg) {
	this.cfg = cfg;
}

Listener.prototype.listen = function (req, res) {
	var self = this;

	function sendError(code, err) {
		res.writeHead(code, err.message);
		res.end();
	}

	function sendStream(stream) {
		stream.pipe(res);
		res.writeHead(200, {'Content-Type': 'image' });
	}

	function errorOrNext(code, err, next) {
		if (err) {
			return sendError(code, err);
		}
		next();
	}

	function scaleImage(scaleReq) {
		scaler(scaleReq, function (err, stream) {
			errorOrNext(500, err, function () {
				stream.pipe(fs.createWriteStream(scaleReq.scaledPath));
				sendStream(stream);
			});
		});
	}

	function scaleOrRespond(scaleReq) {
		scaledExists(scaleReq, function (sExists) {
			if (sExists) {
				return sendStream(readScaled(scaleReq));
			}
			scaleImage(scaleReq);
		});
	}

	function checkPaths(scaleReq) {
		fullsizeExists(scaleReq, function (fExists) {
			if (!fExists) {
				return sendError(404, new Error('file `' + scaleReq.fullsizePath + '` was not found'));
			}
			scaleOrRespond(scaleReq);
		});
	}

	function parsePath(path) {
		self.cfg.urlParser(path, function (err, parsed) {
			errorOrNext(400, err, function () {
				checkPaths(parsed);
			});
		});
	}

	sanitize(req.url, function (err, path) {
		errorOrNext(403, err, function () {
			parsePath(path);
		});
	});
};

function createListener(cfg) {
	if (!(cfg && cfg.urlParser)) {
		throw new Error('no `urlParser` provided');
	}
	return new Listener({
		urlParser: cfg.urlParser
	});
}

module.exports = createListener;
