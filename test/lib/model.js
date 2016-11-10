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

var testSchema = new Schema({
	_id: Schema.Types.ObjectId,
	name: String,
	references: [{ type: Schema.Types.ObjectId, ref: 'Reference' }],
	joins: [{ type: Schema.Types.ObjectId, ref: 'Join' }]
});

var joinSchema = new Schema({
	_id: Schema.Types.ObjectId,
	value: Number,
	tests: [{ type: Schema.Types.ObjectId, ref: 'Test' }]
});

var referenceSchema = new Schema({
	_id: Schema.Types.ObjectId,
	value: Number,
	test: { type: Schema.Types.ObjectId, ref: 'Test' }
});

var Test = mysquirrel.model('Test', testSchema);
var Join = mysquirrel.model('Join', joinSchema);
var Reference = mysquirrel.model('Reference', referenceSchema);

module.exports = {
	setUp: function(done) {
		mysquirrel.connect('mysql://user:pass@localhost/test', { verbose: false });
		done();
	},
	save: {
		array: {
			create: {
				reference: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Reference._id': 1, 'Reference.test': 1, 'Reference.value': 10, 'Test._id': 1 },
							{ 'Reference._id': 2, 'Reference.test': 1, 'Reference.value': 20, 'Test._id': 1 },
							{ 'Reference._id': 3, 'Reference.test': 1, 'Reference.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null, { insertId: 4 });

					Test.findById(1).populate('references').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.references.push(
							new Reference({ value: 40 })
						);
						doc.markModified('references');

						doc.save(function(err, doc) {
							test.equal(err, null);
							test.equal(doc.references[3].id, 4);
							test.done();
						});
					});
				},
				join: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Join._id': 1, 'Join.value': 10, 'Test._id': 1 },
							{ 'Join._id': 2, 'Join.value': 20, 'Test._id': 1 },
							{ 'Join._id': 3, 'Join.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null, { insertId: 4 });

					Test.findById(1).populate('joins').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.joins.push(
							new Join({ value: 40 })
						);
						doc.markModified('joins');

						doc.save(function(err, doc) {
							test.equal(err, null);
							test.equal(doc.joins[3].id, 4);
							test.done();
						});
					});
				}
			},
		  update: {
		    reference: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Reference._id': 1, 'Reference.test': 1, 'Reference.value': 10, 'Test._id': 1 },
							{ 'Reference._id': 2, 'Reference.test': 1, 'Reference.value': 20, 'Test._id': 1 },
							{ 'Reference._id': 3, 'Reference.test': 1, 'Reference.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null, { affectedRows: 1 });

					Test.findById(1).populate('references').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

            doc.references.forEach(function(reference) {
              reference.value = reference.value / 2;
            });
						doc.markModified('references');

            doc.save(function(err, doc) {
					    test.equal(err, null);
					    test.equal(doc.references[0].value, 5);
					    test.equal(doc.references[1].value, 10);
					    test.equal(doc.references[2].value, 15);
					    test.done();
            });
          });
	      },
	      join: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Join._id': 1, 'Join.value': 10, 'Test._id': 1 },
							{ 'Join._id': 2, 'Join.value': 20, 'Test._id': 1 },
							{ 'Join._id': 3, 'Join.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null, { affectedRows: 1 });

					Test.findById(1).populate('joins').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

            doc.joins.forEach(function(join) {
              join.value = join.value / 2;
            });
						doc.markModified('joins');

						doc.save(function(err, doc) {
							test.equal(err, null);
					    test.equal(doc.joins[0].value, 5);
					    test.equal(doc.joins[1].value, 10);
					    test.equal(doc.joins[2].value, 15);
							test.done();
						});
					});
        }
	    },
			delete: {
				reference: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Reference._id': 1, 'Reference.test': 1, 'Reference.value': 10, 'Test._id': 1 },
							{ 'Reference._id': 2, 'Reference.test': 1, 'Reference.value': 20, 'Test._id': 1 },
							{ 'Reference._id': 3, 'Reference.test': 1, 'Reference.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null);

					Test.findById(1).populate('references').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.references.splice(1, 1);
						doc.markModified('references');

						doc.save(function(err, doc) {
							test.equal(err, null);
							test.equal(doc.references[1].id, 3);
							test.done();
						});
					});
				},
				join: function(test) {
					mysql.mock(equal(test), 'query')
						.callback(null, [
							{ 'Test._id': 1, 'Test.name': 'Test' }
						])
						.then()
						.callback(null, [
							{ 'Join._id': 1, 'Join.value': 10, 'Test._id': 1 },
							{ 'Join._id': 2, 'Join.value': 20, 'Test._id': 1 },
							{ 'Join._id': 3, 'Join.value': 30, 'Test._id': 1 }
						])
						.then()
						.callback(null);

					Test.findById(1).populate('joins').exec(function(err, doc) {
						test.equal(err, null);
						test.ok(doc);

						doc.joins.splice(1, 1);
						doc.markModified('joins');

						doc.save(function(err, doc) {
							test.equal(err, null);
							test.equal(doc.joins[1].id, 3);
							test.done();
						});
					});
				}
			}
		}
	}
};
