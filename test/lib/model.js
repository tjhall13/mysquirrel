var Xerox		= require('xerox'),
	proxyquire	= require('proxyquire'),
	query		= require('../mock/query.js'),
	promise		= require('../mock/promise.js');

var mysql = new Xerox('Connection');
var description = new Xerox('Schema');

function PATH(file) {
	var folder = process.env.MYSQUIRREL_COV ? 'lib-cov/' : 'lib/';
	return '../../' + folder + file;
}

var Model = proxyquire(PATH('model.js'), {
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
	setUp: function(done) {
		connection = new Xerox.documents.Connection();
		schema = new Xerox.documents.Schema();
		done();
	},
	tearDown: function(done) {
		schema = undefined;
		connection = undefined;
		done();
	},
	static: {
		isModel: function(test) {
			test.expect(7);
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
			test.done();
		}
	},
	model: {
		setUp: function(done) {
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
			find: {
				none: function(test) {
					var verify = instance(equal(test));
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test');
					query.mock(equal(test), 'select')
						.expects('_id').then()
						.expects('value').then()
						.expects('name');
					query.mock(equal(test), 'where')
						.expects('name', 'John Doe');
					query.mock(null, 'exec')
						.callback(null, [
							{ _id: 1, value: 10, name: 'John Doe' },
							{ _id: 2, value: 20, name: 'John Doe' },
							{ _id: 3, value: 30, name: 'Jane Doe' }
						]);
					Test.find(function(err, results) {
						test.equal(null, err);
						[
							{ id: 1, value: 10, name: 'John Doe' },
							{ id: 2, value: 20, name: 'John Doe' },
							{ id: 3, value: 30, name: 'Jane Doe' }
						].forEach(function(value, index) {
							verify(value, results[index]);
						});
						test.done();
					});
				},
				conditions: {
					success: function(test) {
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
						query.mock(null, 'exec')
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
					},
					error: function(test) {
						test.expect(8);
						var expected = new Error('Test');
						query.mock(equal(test), '@construct')
							.expects(connection, 'Test');
						query.mock(equal(test), 'select')
							.expects('_id').then()
							.expects('value').then()
							.expects('name');
						query.mock(equal(test), 'where')
							.expects('name', 'John Doe');
						query.mock(null, 'exec')
							.callback(expected, null);

						Test.find({ name: 'John Doe' }, function(err, results) {
							test.deepEqual(expected, err);
							test.done();
						});
					}
				},
				projection: {
					string: function(test) {
						test.expect(11);
						var verify = instance(equal(test));
						query.mock(equal(test), '@construct')
							.expects(connection, 'Test');
						query.mock(equal(test), 'select')
							.expects('_id').then()
							.expects('name');
						query.mock(equal(test), 'where')
							.expects('name', 'John Doe');
						query.mock(null, 'exec')
							.callback(null, [
								{ _id: 1, name: 'John Doe' },
								{ _id: 2, name: 'John Doe' }
							]);

						Test.find({ name: 'John Doe' }, 'id name', function(err, results) {
							test.equal(null, err);
							[	
								{ id: 1, name: 'John Doe' },
								{ id: 2, name: 'John Doe' }
							].forEach(function(value, index) {
								verify(value, results[index]);
							});
							test.done();
						});
					},
					array: function(test) {
						test.expect(11);
						var verify = instance(equal(test));
						query.mock(equal(test), '@construct')
							.expects(connection, 'Test');
						query.mock(equal(test), 'select')
							.expects('_id').then()
							.expects('name');
						query.mock(equal(test), 'where')
							.expects('name', 'John Doe');
						query.mock(null, 'exec')
							.callback(null, [
								{ _id: 1, name: 'John Doe' },
								{ _id: 2, name: 'John Doe' }
							]);

						Test.find({ name: 'John Doe' }, [ '_id', 'name' ], function(err, results) {
							test.equal(null, err);
							[	
								{ id: 1, name: 'John Doe' },
								{ id: 2, name: 'John Doe' }
							].forEach(function(value, index) {
								verify(value, results[index]);
							});
							test.done();
						});
					},
					description: function(test) {
						test.expect(11);
						var verify = instance(equal(test));
						query.mock(equal(test), '@construct')
							.expects(connection, 'Test');
						query.mock(equal(test), 'select')
							.expects('_id').then()
							.expects('name');
						query.mock(equal(test), 'where')
							.expects('name', 'John Doe');
						query.mock(null, 'exec')
							.callback(null, [
								{ _id: 1, name: 'John Doe' },
								{ _id: 2, name: 'John Doe' }
							]);

						Test.find({ name: 'John Doe' }, { _id: 1, name: 1 }, function(err, results) {
							test.equal(null, err);
							[	
								{ id: 1, name: 'John Doe' },
								{ id: 2, name: 'John Doe' }
							].forEach(function(value, index) {
								verify(value, results[index]);
							});
							test.done();
						});
					}
				},
				options: function(test) {
					test.done();
				}
			},
			findOne:{
				success: function(test) {
					test.expect(12);
					var verify = instance(equal(test));
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test');
					query.mock(equal(test), 'select')
						.expects('_id').then()
						.expects('value').then()
						.expects('name');
					query.mock(equal(test), 'where')
						.expects('name', 'John Doe');
					query.mock(equal(test), 'limit')
						.expects(1);
					query.mock(null, 'exec')
						.callback(null, [
							{ _id: 1, value: 10, name: 'John Doe' }
						]);

					Test.findOne({ name: 'John Doe' }, function(err, result) {
						test.equal(null, err);
						verify(
							{ id: 1, value: 10, name: 'John Doe' },
							result
						);
						test.done();
					});
				},
				error: function(test) {
					test.expect(9);
					var expected = new Error('Test');
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test');
					query.mock(equal(test), 'select')
						.expects('_id').then()
						.expects('value').then()
						.expects('name');
					query.mock(equal(test), 'where')
						.expects('name', 'John Doe');
					query.mock(equal(test), 'limit')
						.expects(1);
					query.mock(null, 'exec')
						.callback(expected, null);

					Test.findOne({ name: 'John Doe' }, function(err, result) {
						test.deepEqual(expected, err);
						test.done();
					});
				},
				query: function(test) {
					test.expect(10);
					var verify = instance(equal(test));
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test')
						.sets('_id', 1);
					query.mock(equal(test), 'select')
						.expects('_id').then()
						.expects('value').then()
						.expects('name');
					query.mock(equal(test), 'where')
						.expects('name', 'John Doe');
					query.mock(equal(test), 'limit')
						.expects(1);
					query.mock(null, 'exec')
						.callback(null, [
							{ _id: 1, value: 10, name: 'John Doe' }
						]);

					var output = Test.findOne({ name: 'John Doe' });
					test.ok(output instanceof Xerox.documents.Query.Select);
					test.equal(output._id, 1);
					test.done();
				}
			},
			findById: function(test) {
				test.expect(12);
				var verify = instance(equal(test));
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'select')
					.expects('_id').then()
					.expects('value').then()
					.expects('name');
				query.mock(equal(test), 'where')
					.expects('_id', 1);
				query.mock(equal(test), 'limit')
					.expects(1);
				query.mock(equal(test), 'exec')
					.callback(null, [
						{ _id: 1, value: 10, name: 'John Doe' }
					]);

				Test.findById(1, function(err, result) {
					test.equal(null, err);
					verify(
						{ id: 1, value: 10, name: 'John Doe' },
						result
					);
					test.done();
				});
			},
			findOneAndUpdate: function(test) {
				test.expect(9);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'column')
					.expects('value', 100);
				query.mock(equal(test), 'where')
					.expects('name', 'John Doe');
				query.mock(equal(test), 'limit')
					.expects(1);
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 1 });

				Test.findOneAndUpdate(
					{ name: 'John Doe' },
					{ value: 100 },
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 1 }, value);
						test.done();
					}
				);
			},
			findByIdAndUpdate: function(test) {
				test.expect(9);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'column')
					.expects('value', 100);
				query.mock(equal(test), 'where')
					.expects('_id', 1);
				query.mock(equal(test), 'limit')
					.expects(1);
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 1 });

				Test.findByIdAndUpdate(
					1,
					{ value: 100 },
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 1 }, value);
						test.done();
					}
				);
			},
			findOneAndRemove: function(test) {
				test.expect(7);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'where')
					.expects('name', 'John Doe');
				query.mock(equal(test), 'limit')
					.expects(1);
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 1 });

				Test.findOneAndRemove(
					{ name: 'John Doe' },
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 1 }, value);
						test.done();
					}
				);
			},
			findByIdAndRemove: function(test) {
				test.expect(7);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'where')
					.expects('_id', 1);
				query.mock(equal(test), 'limit')
					.expects(1);
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 1 });

				Test.findByIdAndRemove(
					1,
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 1 }, value);
						test.done();
					}
				);
			},
			update: function(test) {
				test.expect(8);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'column')
					.expects('value', 100);
				query.mock(equal(test), 'where')
					.expects('name', 'John Doe');
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 2 });

				Test.update(
					{ name: 'John Doe' },
					{ value: 100 },
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 2 }, value);
						test.done();
					}
				);
			},
			remove: function(test) {
				test.expect(6);
				query.mock(equal(test), '@construct')
					.expects(connection, 'Test');
				query.mock(equal(test), 'where')
					.expects('name', 'John Doe');
				query.mock(null, 'exec')
					.callback(null, { affectedRows: 2 });

				Test.remove(
					{ name: 'John Doe' },
					function(err, value) {
						test.equal(null, err);
						test.deepEqual({ affectedRows: 2 }, value);
						test.done();
					}
				);
			},
			modelName: function(test) {
				test.equal('Test', Test.modelName);
				test.done();
			},
			schema: function(test) {
				test.deepEqual(schema, Test.schema);
				test.done();
			}
		},
		member: {
			save: {
				insert: {
					local: {
						success: function(test) {
							test.expect(9);
							var verify = instance(equal(test));
							query.mock(equal(test), '@construct')
								.expects(connection, 'Test');
							query.mock(equal(test), 'column')
								.expects('value', 30).then()
								.expects('name', 'John Jones');
							query.mock(null, 'exec')
								.callback(null, { insertId: 3 });
							promise.mock(verify, 'fulfill')
								.expects({ _id: 3, value: 30, name: 'John Jones' })
								.calls(function() {
									test.done();
								});

							var item = new Test({
								value: 30,
								name: 'John Jones'
							});
							item.save();
						},
						error: function(test) {
							test.expect(7);
							var err = new Error('Test');
							query.mock(equal(test), '@construct')
								.expects(connection, 'Test');
							query.mock(equal(test), 'column')
								.expects('value', 30).then()
								.expects('name', 'John Jones');
							query.mock(null, 'exec')
								.callback(err, null);
							promise.mock(equal(test), 'error')
								.expects(err)
								.calls(function() {
									test.done();
								});

							var item = new Test({
								value: 30,
								name: 'John Jones'
							});
							item.save();
						}
					},
					foreign: {
						success: function(test) {
							test.done();
						},
						error: function(test) {
							test.done();
						}
					},
					array: function(test) {
						test.done();
					}
				},
				update:{
					local: {
						success: function(test) {
							test.expect(9);
							var verify = instance(equal(test));
							query.mock(equal(test), '@construct')
								.expects(connection, 'Test');
							query.mock(equal(test), 'column')
								.expects('value', 100);
							query.mock(equal(test), 'where')
								.expects('_id', 1);
							query.mock(null, 'exec')
								.callback(null, { affectedRows: 1 });
							promise.mock(verify, 'fulfill')
								.expects({ _id: 1, value: 100, name: 'John Doe' })
								.calls(function() {
									test.done();
								});

							var item = new Test({
								_id: 1,
								value: 10,
								name: 'John Doe'
							});
							item.value = 100;
							item.save();
						},
						error: function(test) {
							test.expect(7);
							var err = new Error('Test');
							query.mock(equal(test), '@construct')
								.expects(connection, 'Test');
							query.mock(equal(test), 'column')
								.expects('value', 100);
							query.mock(equal(test), 'where')
								.expects('_id', 1);
							query.mock(null, 'exec')
								.callback(err, null);
							promise.mock(equal(test), 'error')
								.expects(err)
								.calls(function() {
									test.done();
								});

							var item = new Test({
								_id: 1,
								value: 10,
								name: 'John Jones'
							});
							item.value = 100;
							item.save();
						}
					},
					foreign: {
						success: function(test) {
							test.done();
						},
						error: function(test) {
							test.done();
						}
					},
					array: function(test) {
						test.done();
					}
				}
			},
			remove: {
				success: function(test) {
					test.expect(8);
					var verify = instance(equal(test));
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test');
					query.mock(equal(test), 'where')
						.expects('_id', 1);
					query.mock(null, 'exec')
						.callback(null, { affectedRows: 1 });

					var item = new Test({
						_id: 1,
						value: 10,
						name: 'John Doe'
					});
					item.remove(function(err, self) {
						test.equal(null, err);
						test.ok(!self.id);
						verify({ value: 10, name: 'John Doe' }, self);
						test.done();
					});
				},
				query: function(test) {
					test.expect(6);
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test')
						.sets('_id', 1);
					query.mock(equal(test), 'where')
						.expects('_id', 1);

					var item = new Test({
						_id: 1,
						value: 10,
						name: 'John Doe'
					});
					var output = item.remove();
					test.ok(output instanceof query.proxy.Delete);
					test.equal(output._id, 1);
					test.done();
				},
				error: function(test) {
					test.expect(5);
					var expected = new Error('Test');
					query.mock(equal(test), '@construct')
						.expects(connection, 'Test');
					query.mock(equal(test), 'where')
						.expects('_id', 1);
					query.mock(null, 'exec')
						.callback(expected, null);

					var item = new Test({
						_id: 1,
						value: 10,
						name: 'John Doe'
					});
					item.remove(function(err, self) {
						test.equal(expected, err);
						test.done();
					});
				}
			}
		}
	}
};
