function PATH(file) {
	var folder = process.env.MYSQUIRREL_COV ? 'lib-cov/' : 'lib/';
	return '../../' + folder + file;
}

var async = require(PATH('async.js'));

module.exports = {
	success: {
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
	},
	failed: {
		forEachAsync: function(test) {
			test.expect(5);
			var array = [0, 1, 2, 3, 4, 5];
			var expected = new Error('Test');
			array.forEachAsync(function(next, value, index) {
				test.equal(value, index);
				process.nextTick(function() {
					if(index == 3) {
						next(expected);
					} else {
						next();
					}
				});
			}, function(err) {
				test.equal(err, expected);
				test.done();
			});
		},
		reduceAsync: function(test) {
			test.expect(6);
			var array = [0, 1, 2, 3, 4, 5];
			var expected = new Error('Test');
			array.reduceAsync(function(next, current, value, index) {
				test.equal(value, index);
				process.nextTick(function() {
					if(index == 3) {
						next(expected, current);
					} else {
						next(null, current + value);
					}
				});
			},
			function(err, value) {
				test.equal(err, expected);
				test.equal(value, 3);
				test.done();
			});
		}
	}
};
