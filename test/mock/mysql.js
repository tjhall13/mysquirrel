var Xerox = require('xerox');

var Connection = new Xerox('Connection');

Connection.copy(null, 'release');
Connection.copy(null, 'end').callback(null);

var Pool = new Xerox('Pool');

Pool.copy(null, 'getConnection').callback(null, new Xerox.documents.Connection());
Pool.copy(null, 'end').callback(null);

module.exports = {
	proxy: {
		'@global': true,
		createConnection: function(arg) {
			return new Xerox.documents.Connection(arg);
		},
		createPool: function(arg) {
			return new Xerox.documents.Pool(arg);
		}
	},
	mock: function(test, method) {
		return Connection.copy(test, method);
	}
};
