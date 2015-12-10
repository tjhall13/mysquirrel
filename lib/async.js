function reduce(array, fn, value, callback, index) {
	if(index < array.length) {
		fn(function(err, value) {
			if(err) {
				callback(err);
			} else {
				reduce(array, fn, value, callback, index + 1);
			}
		}, value, array[index], index, array);
	} else {
		callback(null, value);
	}
}

function forEach(array, fn, callback, index) {
	if(index < array.length) {
		fn(function(err) {
			if(err) {
				callback(err);
			} else {
				forEach(array, fn, callback, index + 1);
			}
		}, array[index], index, array);
	} else {
		callback(null);
	}
}

Array.prototype.reduceAsync = function(fn, value, callback) {
	reduce(this, fn, value, callback, 0);
};

Array.prototype.forEachAsync = function(fn, callback) {
	forEach(this, fn, callback, 0);
};
