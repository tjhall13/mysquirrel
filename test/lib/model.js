var proxyquire = require('proxyquire');
var mysql = require('../mock/mysql.js');

var mysquirrel = proxyquire('../../index.js', {
	'mysql': mysql.proxy
});
var Schema = mysquirrel.Schema;

function equal(test) {
	return function(expected, actual, msg) {
		if(typeof expected == 'object') {
			test.deepEqual(expected, actual, msg);
		} else {
			test.equal(expected, actual, msg);
		}
	};
}

var Model, Reference;

module.exports = {
	save: {
		array: {
			setUp: function(done) {
				var modelSchema = new Schema({
					_id: Schema.Types.ObjectId,
					name: String,
					reference: [{ type: Schema.Types.ObjectId, ref: 'Reference' }],
					join: [{ type: Schema.Types.ObjectId, ref: 'Join' }]
				});

				var referenceSchema = new Schema({
					_id: Schema.Types.ObjectId,
					value: Number,
					model: { type: Schema.Types.ObjectId, ref: 'Model' }
				});

				var joinSchema = new Schema({
					_id: Schema.Types.ObjectId,
					value: Number,
					model: [{ type: Schema.Types.ObjectId, ref: 'Model' }]
				});

				Model = mysquirrel.model('Model', modelSchema);
				Reference = mysquirrel.model('Reference', referenceSchema);
				Join = mysquirrel.model('Join', joinSchema);

				mysquirrel.connect('mysql://user:pass@localhost/test', { verbose: true });
				done();
			},
			delete: {
				reference: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Model._id': 1, 'Model.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Reference._id': 1, 'Reference.model': 1, 'Reference.value': 10, 'Model._id': 1 },
							{ 'Reference._id': 2, 'Reference.model': 1, 'Reference.value': 20, 'Model._id': 1 },
							{ 'Reference._id': 3, 'Reference.model': 1, 'Reference.value': 30, 'Model._id': 1 }
						])
						.then()
						.callback(null);

					Model.findById(1).populate('reference').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.reference.splice(1, 1);
						doc.markModified('reference');

						doc.save(function(err) {
							test.equal(err, null);
							test.done();
						});
					});
				},
				join: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Model._id': 1, 'Model.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Join._id': 1, 'Join.value': 10, 'Model._id': 1 },
							{ 'Join._id': 2, 'Join.value': 20, 'Model._id': 1 },
							{ 'Join._id': 3, 'Join.value': 30, 'Model._id': 1 }
						])
						.then()
						.callback(null);

					Model.findById(1).populate('join').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.join.splice(1, 1);
						doc.markModified('join');

						doc.save(function(err) {
							test.equal(err, null);
							test.done();
						});
					});
				}
			}
		}
	}
};
