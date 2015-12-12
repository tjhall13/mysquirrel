var Xerox = require('xerox');

var Model = new Xerox('Generator');

module.exports = {
	proxy: new Xerox.documents.Generator(),
	mock: function(test, method) {
		Model.copy(test, method);
	}
};
