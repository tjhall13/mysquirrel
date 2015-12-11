var Xerox = require('xerox');

var Connection = new Xerox('Connection');

module.exports = {
	proxy: {
		'@global': true,
		createConnection: function(arg, callback) {
			return new Xerox.documents.Connection(arg);
		}
	},
	mock: function(test, method) {
		return Connection.copy(test, method);
	}
};
