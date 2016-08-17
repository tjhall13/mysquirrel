var util = require('util');
var mPromise = require('mpromise');

function Promise(fn) {
	mPromise.call(this, fn);
}
util.inherits(Promise, mPromise);

Promise.prototype.error = function(err) {
	if (!(err instanceof Error)) {
		if (err instanceof Object) {
			err = util.inspect(err);
		}
		err = new Error(err);
	}
	return this.reject(err);
};

Promise.prototype.resolve = function(err) {
	if (err) return this.error(err);
	return this.fulfill.apply(this, Array.prototype.slice.call(arguments, 1));
};

module.exports = Promise;
