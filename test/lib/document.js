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
	reference: { type: Schema.Types.ObjectId, ref: 'Reference' },
});

var referenceSchema = new Schema({
	_id: Schema.Types.ObjectId,
	value: Number
});

var Test = mysquirrel.model('Test', testSchema);
var Reference = mysquirrel.model('Reference', referenceSchema);

module.exports = {
	setUp: function(done) {
		mysquirrel.connect('mysql://user:pass@localhost/test', { verbose: false });
		done();
	},
	toObject: function(test) {
        mysql.mock(equal(test), 'query')
            .callback(null, [
                { 'Test._id': 1, 'Test.name': 'Test', 'Test.reference': 1 }
            ])
            .then()
            .callback(null, [
                { 'Test._id': 1, 'Reference._id': 1, 'Reference.value': 10 }
            ]);

        Test.findById(1).populate('reference').exec(function(err, doc) {
            test.equal(err, null);
            test.deepEqual(doc.toObject(), { id: 1, name: 'Test', reference: { id: 1, value: 10 } });
            test.done();
        });
    },
	toString: function(test) {
        mysql.mock(equal(test), 'query')
            .callback(null, [
                { 'Test._id': 1, 'Test.name': 'Test', 'Test.reference': 1 }
            ])
            .then()
            .callback(null, [
                { 'Test._id': 1, 'Reference._id': 1, 'Reference.value': 10 }
            ]);

        Test.findById(1).populate('reference').exec(function(err, doc) {
            test.equal(err, null);
            test.deepEqual(doc.toString(), '{"id":1,"name":"Test","reference":{"id":1,"value":10}}');
            test.done();
        });
    }
};