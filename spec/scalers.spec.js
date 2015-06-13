'use strict';

var testMe = require('test.me');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

describe('scalers', function () {
	var scalerModule,
			fs,
			sharp,
			sharpContent = {};

	function sharpFunc() {
		return sinon.spy(function () {
			return sharpContent;
		});
	}

	beforeEach(function () {
		fs = {
			createWriteStream: sinon.spy(function () {
				return writeStream;
			})
		};
		sharpContent.resize = sharpFunc();
		sharpContent.crop = sharpFunc();
		sharp = sinon.spy(function () {
			return sharpContent;
		});
		sharp.gravity = {center: 'center'};
		scalerModule = testMe('lib/scaler', {
			sharp: sharp
		});
	});

	describe('crop method', function () {
		it('should read source file', function () {
			scalerModule.crop('/dev/null', {width: 500, height: 300});
			expect(sharp).have.been.calledWith('/dev/null');
		});

		it('should scale to 500x300', function () {
			scalerModule.crop('/dev/null', {width: 500, height: 300});
			expect(sharpContent.resize).have.been.calledWith(500, 300);
		});

		it('should crop to exact size', function () {
			scalerModule.crop('/dev/null', {width: 500, height: 300});
			expect(sharpContent.crop).have.been.calledWith(sharp.gravity.center);
		});

		it('should return stream', function () {
			var result = scalerModule.crop('/dev/null', {width: 500, height: 300});
			expect(result).to.equal(sharpContent);
		});
	});

	describe('fit method', function () {
		it('should read source file', function () {
			scalerModule.fit('/dev/null', {width: 500, height: 300});
			expect(sharp).have.been.calledWith('/dev/null');
		});

		it('should scale to 500x300', function () {
			scalerModule.fit('/dev/null', {width: 500, height: 300});
			expect(sharpContent.resize).have.been.calledWith(500, 300);
		});

		it('should not crop to exact size', function () {
			scalerModule.fit('/dev/null', {width: 500, height: 300});
			expect(sharpContent.crop).have.not.been.calledOnce;
		});

		it('should return stream', function () {
			var result = scalerModule.fit('/dev/null', {width: 500, height: 300});
			expect(result).to.equal(sharpContent);
		});
	});

	describe('scale function', function () {
		var scaledStream, scaleMethod;

		beforeEach(function () {
			scaledStream = {
				pipe: sinon.spy()
			};
			scaleMethod = sinon.spy(function () {
				return scaledStream;
			});
			scalerModule.selectMethod = sinon.spy(function (name, cb) {
				cb(null, scaleMethod);
			});
		});

		it('should select method', function () {
			scalerModule.selectMethod = sinon.spy();
			scalerModule.scale({method: 'crop'});
			expect(scalerModule.selectMethod).have.been.calledWith('crop');
		});

		it('should return error if method does not exist', function (done) {
			scalerModule.selectMethod = function (name, cb) {
				cb('failed');
			};
			scalerModule.scale({method: 'bad'}, function (err) {
				expect(err).to.be.equal('failed');
				done();
			});
		});

		it('should call selected method', function (done) {
			var path = '', size = {};
			scalerModule.scale({
				fullsizePath: path,
				size: size
			}, function () {
				expect(scaleMethod).have.been.calledWith(path, size);
				done();
			});
		});

		it('should return stream to callback', function (done) {
			scalerModule.scale({}, function (err, stream) {
				expect(stream).to.equal(scaledStream);
				done();
			});
		});
	});

	describe('selectMethod function', function () {
		it('should select method by name', function (done) {
			scalerModule.methods.foo = 'bar';
			scalerModule.selectMethod('foo', function (err, method) {
				expect(method).to.be.equal('bar');
				done();
			});
		});

		it('should return error if no method was found', function (done) {
			scalerModule.selectMethod('bad', function (err) {
				expect(err.message).to.be.equal('no method `bad` was found');
				done();
			});
		});
	});
});
