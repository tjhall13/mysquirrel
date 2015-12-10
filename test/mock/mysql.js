var Xerox = require('xerox');

var templates = { Connection: new Xerox('Connection') };

module.exports = {
	proxy: {
		'@global': true,
		createConnection: function(arg, callback) {
			return new Xerox.documents.Connection(arg);
		}
	},
	mock: function(test, name, method) {
		return templates[name].copy(test, method);
	}
};
