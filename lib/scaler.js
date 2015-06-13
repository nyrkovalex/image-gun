'use strict';

var sharp = require('sharp');

var methods = {
	crop: crop,
	fit: fit
};

function crop(path, targetSize) {
	return fit(path, targetSize).crop(sharp.gravity.center);
}

function fit(path, targetSize) {
	return sharp(path).max().resize(targetSize.width, targetSize.height);
}

function selectMethod(name, cb) {
	var found = methods[name];
	if (!found) {
		return cb(new Error('no method `' + name + '` was found'));
	}
	cb(null, found);
}

function scale(request, cb) {
	selectMethod(request.method, function (err, method) {
		if (err) {
			return cb(err);
		}
		var stream = method(request.fullsizePath, request.size);
		cb(null, stream);
	});
}

module.exports = scale;
