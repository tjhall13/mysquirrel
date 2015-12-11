var Xerox		= require('xerox'),
	proxyquire	= require('proxyquire'),
	query		= require('../mock/query.js'),
	promise		= require('../mock/promise.js');

var mysql = new Xerox('Connection');
var description = new Xerox('Schema');

var Model = proxyquire('../../lib/model.js', {
	'./query.js': query.proxy,
	'./promise.js': promise.proxy
});

var Test, schema, connection;

function equal(test) {
	return function(expected, actual, msg) {
		if(typeof expected == 'object') {
			test.deepEqual(expected, actual, msg);
		} else {
			test.equal(expected, actual, msg);
		}
	};
}

function instance(test) {
	return function(expected, actual, msg) {
		for(var field in expected) {
			test(expected[field], actual[field], msg);
		}
	};
}

module.exports = {
	static: {
		isModel: function(test) {
			test.expect(7);
			connection = new Xerox.documents.Connection();
			schema = new Xerox.documents.Schema();
			description.copy(null, '_describe').yields({
				_id: { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] },
				value: { type: 'INTEGER', required: true }
			});
			query.mock(equal(test), '@construct')
				.expects(connection, 'Test');
			query.mock(equal(test), 'column')
				.expects('_id', { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] }).then()
				.expects('value', { type: 'INTEGER', required: true });
			query.mock(null, 'exec')
				.callback(null);

			Test = Model(connection, 'Test', schema);
			test.ok(Model.isModel(Test));
			Test = undefined;
			schema = undefined;
			connection = undefined;
			test.done();
		}
	},
	model: {
		setUp: function(done) {
			connection = new Xerox.documents.Connection();
			schema = new Xerox.documents.Schema();
			description.copy(null, '_describe').yields({
				_id: { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] },
				value: { type: 'INTEGER', required: true },
				name: { type: 'VARCHAR', size: 50, required: true}
			});
			query.mock(null, 'exec')
				.callback(null);

			Test = Model(connection, 'Test', schema);
			done();
		},
		tearDown: function(done) {
			Test = undefined;
			schema = undefined;
			connection = undefined;
			done();
		},
		static: {
			create: function(test) {
				test.expect(6);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'column')
					.expects('value', 10);
				query.mock(equal(test), 'exec')
					.callback(null, { insertId: 1 });
				promise.mock(instance(equal(test)), 'fulfill')
					.expects({ _id: 1, value: 10 })
					.calls(function() {
						test.done();
					});
				Test.create({
					value: 10
				});
			},
			find: function(test) {
				test.expect(14);
				var verify = instance(equal(test));
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'select')
					.expects('_id').then()
					.expects('value').then()
					.expects('name');
				query.mock(equal(test), 'where')
					.expects('name', 'John Doe');
				query.mock(equal(test), 'exec')
					.callback(null, [
						{ _id: 1, value: 10, name: 'John Doe' },
						{ _id: 2, value: 20, name: 'John Doe' }
					]);
				
				Test.find({ name: 'John Doe' }, function(err, results) {
					test.equal(null, err);
					[
						{ id: 1, value: 10, name: 'John Doe' },
						{ id: 2, value: 20, name: 'John Doe' }
					].forEach(function(value, index) {
						verify(value, results[index]);
					});
					test.done();
				});
			}
		},
		member: {
			
		}
	}
};
