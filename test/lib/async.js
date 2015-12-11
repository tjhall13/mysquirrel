var async = require('../../lib/async.js');

module.exports = {
	forEachAsync: function(test) {
		test.expect(13);
		var array = [1, 2, 3, 4, 5, 6];
		array.forEachAsync(function(next, value, index, arr) {
			process.nextTick(function() {
				test.equal(arr[index], value);
				test.equal(array[index], arr[index]);
				next();
			});
		}, function(err) {
			test.equal(err, null);
			test.done();
		});
	},
	reduceAsync: function(test) {
		test.expect(2);
		var array = [1, 2, 3, 4, 5, 6];
		array.reduceAsync(function(next, current, value) {
			process.nextTick(function() {
				next(null, current + value);
			});
		},
		function(err, value) {
			test.equal(err, null);
			test.equal(value, 21);
			test.done();
		});
	}
};
