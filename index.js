'use strict';

var listener = require('./lib/listener');
var scaler = require('./lib/scaler');

module.exports = {
	/*
	cfg.urlParser must return something like to callback
	```
	cfg: {
	  urlParser: function (url, cb) {
		  // do some stuff here...
			cb(null, {
				fullsizePath: '/fullsize/some/image',
				scaledPath: '/scaled/some/image',
				size: {
					width: 320,
					height: 240
				},
				method: 'crop'
			});
		}
	}
	```
	*/
	listener: function (cfg) {
		var l = listener(cfg);
		return function (req, res) {
			l.listen(req, res);
		};
	},
	scaler: scaler
};
