var Xerox = require('xerox');

var Connection = new Xerox('Connection');

Connection.copy(null, 'getConnection').callback(null, new Xerox.documents.Connection());

module.exports = {
	proxy: {
		'@global': true,
		createConnection: function(arg) {
			return new Xerox.documents.Connection(arg);
		},
		createPool: function(arg) {
			return new Xerox.documents.Connection(arg);
		}
	},
	mock: function(test, method) {
		return Connection.copy(test, method);
	}
};
