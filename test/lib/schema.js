var Schema = require('../../lib/schema.js');

module.exports = {
	schema: function(test) {
		var schema = new Schema({
			name: { type: String, required: true },
			email: { type: String, required: true },
			comment: { type: String, required: true, default: '' },
			seed: { type: String, required: true },
			valid: { type: Boolean, required: true, default: false },
			time: { type: Date, required: true, default: Date.now }
		});
		test.ok(true);
		test.done();
	}
};
