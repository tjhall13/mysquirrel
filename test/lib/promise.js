function PATH(file) {
	var folder = process.env.MYSQUIRREL_COV ? 'lib-cov/' : 'lib/';
	return '../../' + folder + file;
}

var Promise = require(PATH('promise.js'));

module.exports = {
	error: {
		cast: function(test) {
			test.expect(2);
			var promise = new Promise(function(err, value) {
				test.equal('test error', err.message);
				test.equal(null, value);
				test.done();
			});
			process.nextTick(function() {
				promise.error('test error');
			});
		},
		type: function(test) {
			test.expect(2);
			var error = new Error('test error');
			var promise = new Promise(function(err, value) {
				test.equal(error, err);
				test.equal(null, value);
				test.done();
			});
			process.nextTick(function() {
				promise.error(error);
			});
		}
	},
	resolve: {
		error: function(test) {
			test.expect(2);
			var promise = new Promise(function(err, value) {
				test.equal('test error', err.message);
				test.equal(null, value);
				test.done();
			});
			process.nextTick(function() {
				promise.resolve('test error', null);
			});
		},
		fulfill: function(test) {
			test.expect(2);
			var promise = new Promise(function(err, value) {
				test.equal(null, err);
				test.equal(1, value);
				test.done();
			});
			process.nextTick(function() {
				promise.resolve(null, 1);
			});
		}
	}
};
