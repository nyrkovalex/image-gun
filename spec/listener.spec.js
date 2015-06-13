/*jshint -W030 */

'use strict';

var testMe = require('test.me');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

describe('image host', function () {
	var fs, readStream, writeStream, scaler, scaledStream, listenerModule;

	beforeEach(function () {
		readStream = {pipe: sinon.spy()};
		writeStream = {};
		scaledStream = {
			pipe: sinon.spy()
		};
		scaler = sinon.spy(function (req, cb) {
			cb(null, scaledStream);
		});
		fs = {
			exists: sinon.spy(function (path, cb) {
				cb(true);
			}),
			createReadStream: sinon.spy(function () {
				return readStream;
			}),
			createWriteStream: function () {
				return writeStream;
			}
		};
		listenerModule = testMe('lib/listener', {
			fs: fs,
			'./scaler': scaler
		});
	});

	describe('url sanitizer', function () {
		it('should return error if path escapes root dir', function (done) {
			listenerModule.sanitize('../some/path', function (err) {
				expect(err.message).to.equal('possible malicious path');
				done();
			});
		});

		it('should return decent path', function (done) {
			listenerModule.sanitize('/some/path', function (err, path) {
				expect(err).to.be.null;
				expect(path).to.equal('/some/path');
				done();
			});
		});
	});

	describe('request listener', function () {
		var res,
				listener,
				scaleRequest = {
					fullsizePath: '/fullsize/some/path',
					scaledPath: '/scaled/some/path'
				};

		beforeEach(function () {
			listener = listenerModule.createListener({
				urlParser: sinon.spy(function (url, cb) {
					cb(null, scaleRequest);
				})
			});
			listenerModule.fullsizeExists = sinon.spy(function (req, cb) {
				cb(true);
			});
			listenerModule.scaledExists = sinon.spy(function (req, cb) {
				cb(false);
			});
			listenerModule.readScaled = sinon.spy(function () {
				return scaledStream;
			});
			res = responseSpy();
		});

		function responseSpy() {
			return {
				writeHead: sinon.spy(),
				end: sinon.spy(),
				expectError: function (code, msg) {
					expect(this.writeHead).have.been.calledWith(code, msg);
					expect(this.end).have.been.calledOnce;
				}
			};
		}

		it('should sanitize incoming path', function () {
			listenerModule.sanitize = sinon.spy();
			listener.listen({url: '/some/path'}, res);
			expect(listenerModule.sanitize).have.been.calledWith('/some/path');
		});

		it('should respond with 403 if sanitizer fails', function () {
			listener.listen({url: '../some/path'}, res);
			res.expectError(403, 'possible malicious path');
		});

		it('should parse request url', function () {
			listener.listen({url: '/some/path'}, res);
			expect(listener.cfg.urlParser).have.been.calledWith('/some/path');
		});

		it('should respond with 400 on parse error', function () {
			listener.cfg.urlParser = function (url, cb) {
				cb(new Error('failed'));
			};
			listener.listen({url: '/some/path'}, res);
			res.expectError(400, 'failed');
		});

		it('should check if fullsize image exists', function () {
			listener.listen({url: '/some/path?w=320&h=240'}, res);
			expect(listenerModule.fullsizeExists).have.been.calledWith(scaleRequest);
		});

		it('should respond 404 if no fullsize image exists', function () {
			listenerModule.fullsizeExists = function (req, cb) {
				cb(false);
			};
			listener.listen({url: '/some/path?w=320&h=240'}, res);
			res.expectError(404, 'file `/fullsize/some/path` was not found');
		});

		it('should respond with scaled image if exists', function () {
			listenerModule.scaledExists = function (req, cb) {
				cb(true);
			};
			listener.listen({url: '/some/path?w=320&h=240'}, res);
			expect(scaledStream.pipe).have.been.calledWith(res);
			expect(res.writeHead).have.been.calledWith(200, {'Content-Type': 'image'});
		});

		it('should scale image', function () {
			listener.listen({url: '/some/path?w=320&h=240'}, res);
			expect(scaler).have.been.calledWith(scaleRequest);
		});

		it('should write stream to scaledPath', function () {
			listener.listen({url: '/some/path?w=320&h=240'}, res);
			expect(scaledStream.pipe).have.been.calledWith(writeStream);
		});

		it('should respond with 400 on scale error', function () {
			listenerModule.scaler = function (req, cb) {
				cb(new Error('failed'));
			};
			listener.listen({url: '/some/path?w=320&h=240&method=bad'}, res);
			res.expectError(500, 'failed');
		});

	});

	describe('fullsizeExists', function () {
		it('should check if file exists', function (done) {
			listenerModule.fullsizeExists({fullsizePath: '/dev/null'}, function () {
				expect(fs.exists).have.been.calledWith('/dev/null');
				done();
			});
		});
	});

	describe('scaledExists', function () {
		it('should check if file exists', function (done) {
			listenerModule.scaledExists({scaledPath: '/dev/null'}, function () {
				expect(fs.exists).have.been.calledWith('/dev/null');
				done();
			});
		});
	});

	describe('readScaled', function () {
		it('should create read stream', function () {
			listenerModule.readScaled({scaledPath: '/dev/null'});
			expect(fs.createReadStream).have.been.calledWith('/dev/null');
		});

		it('should return read stream', function () {
			var scaled = listenerModule.readScaled({scaledPath: '/dev/null'});
			expect(scaled).to.equal(readStream);
		});
	});

	describe('createListener', function () {
		it('should create listener with provided parser', function () {
			var cfg = {
				urlParser: {}
			};
			var listener = listenerModule.createListener(cfg);
			expect(listener.cfg.urlParser).to.equal(cfg.urlParser);
		});

		it('should throw when no parser provided', function () {
			expect(listenerModule.createListener).to.throw('no `urlParser` provided');
		});

		it('should be exported', function () {
			expect(listenerModule.module.exports).to.equal(listenerModule.createListener);
		});
	});
});
