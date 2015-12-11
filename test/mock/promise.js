var Xerox = require('xerox');

var promise = new Xerox('Promise');

module.exports = {
	proxy: Xerox.documents.Promise,
	mock: function(test, method) {
		return promise.copy(test, method);
	}
};
