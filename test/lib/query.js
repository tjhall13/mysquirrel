var Xerox		= require('xerox'),
	proxyquire	= require('proxyquire'),
	promise		= require('../mock/promise.js');

function PATH(file) {
	var folder = process.env.MYSQUIRREL_COV ? 'lib-cov/' : 'lib/';
	return '../../' + folder + file;
}

var Query = proxyquire(PATH('query.js'), {
	'./promise.js': promise.proxy
});

function equal(test) {
	return function(expected, actual, msg) {
		if(typeof expected == 'object') {
			test.deepEqual(expected, actual, msg);
		} else {
			test.equal(expected, actual, msg);
		}
	};
}

var mysql = new Xerox('Connection');

var connection;

module.exports = {
	setUp: function(done) {
		connection = new Xerox.documents.Connection();
		done();
	},
	tearDown: function(done) {
		connection = null;
		done();
	},
	create: {
		local: function(test) {
			test.expect(3);
			var query = new Query.Create(connection, 'Test')
				.column('id', { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] })
				.column('name', { type: 'VARCHAR', size: 50, required: true })
				.column('value', { type: 'INTEGER', required: true, default: 1 })
				.column('email', { type: 'VARCHAR', unique: true });

			mysql.copy(equal(test), 'query')
				.expects('CREATE TABLE Test( id INTEGER AUTO_INCREMENT, name VARCHAR(50) NOT NULL, value INTEGER NOT NULL DEFAULT "1", email VARCHAR(150) UNIQUE, PRIMARY KEY(id) );', null)
				.callback(null);
			promise.mock(equal(test), 'resolve')
				.expects(null)
				.calls(function() {
					test.done();
				});

			query.exec();
		},
		foreign: function(test) {
			test.expect(3);
			var query = new Query.Create(connection, 'Test')
				.column('id', { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] })
				.column('test1', { type: 'INTEGER', key: 'FOREIGN', table: 'Other1', required: true })
				.column('test2', { type: 'INTEGER', key: 'FOREIGN', table: { name: 'Other2', id: 'other_id' } });

			mysql.copy(equal(test), 'query')
				.expects('CREATE TABLE Test( id INTEGER AUTO_INCREMENT, test1 INTEGER NOT NULL, test2 INTEGER, PRIMARY KEY(id), FOREIGN KEY(test1) REFERENCES Other1(_id), FOREIGN KEY(test2) REFERENCES Other2(other_id) );', null)
				.callback(null);
			promise.mock(equal(test), 'resolve')
				.expects(null)
				.calls(function() {
					test.done();
				});

			query.exec();
		}
	},
	select: {
		where: function(test) {
			test.expect(4);
			var query = new Query.Select(connection, 'Test')
				.select('name')
				.select('value')
				.select('email')
				.where('name', { eq: 'John Doe' })
				.where('value', 10);

			mysql.copy(equal(test), 'query')
				.expects(
					'SELECT ?? FROM Test WHERE `name` = ? AND `value` = ?;',
					[['name', 'value', 'email'], 'John Doe', 10]
				).callback(null, [
					{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
				]);
			promise.mock(equal(test), 'resolve')
				.expects(null, [
					{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
				]).calls(function() {
					test.done();
				});

			query.exec();
		},
		limit: function(test) {
			test.expect(4);
			var query = new Query.Select(connection, 'Test')
				.select('name')
				.select('value')
				.select('email')
				.limit(1);

			mysql.copy(equal(test), 'query')
				.expects(
					'SELECT ?? FROM Test LIMIT 1;',
					[['name', 'value', 'email']]
				).callback(null, [
					{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
				]);
			promise.mock(equal(test), 'resolve')
				.expects(null, [
					{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
				]).calls(function() {
					test.done();
				});

			query.exec();
		},
		order: {
			asc: function(test) {
				test.expect(4);
				var query = new Query.Select(connection, 'Test')
					.select('name')
					.select('value')
					.select('email')
					.order({
						field: 'value',
						direction: 'asc'
					});

				mysql.copy(equal(test), 'query')
					.expects(
						'SELECT ?? FROM Test ORDER BY `value` ASC;',
						[['name', 'value', 'email']]
					).callback(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]);
				promise.mock(equal(test), 'resolve')
					.expects(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]).calls(function() {
						test.done();
					});

				query.exec();
			},
			desc: function(test) {
				test.expect(4);
				var query = new Query.Select(connection, 'Test')
					.select('name')
					.select('value')
					.select('email')
					.order({
						field: 'value',
						direction: 'desc'
					});

				mysql.copy(equal(test), 'query')
					.expects(
						'SELECT ?? FROM Test ORDER BY `value` DESC;',
						[['name', 'value', 'email']]
					).callback(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]);
				promise.mock(equal(test), 'resolve')
					.expects(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]).calls(function() {
						test.done();
					});

				query.exec();
			},
			default: function(test) {
				test.expect(4);
				var query = new Query.Select(connection, 'Test')
					.select('name')
					.select('value')
					.select('email')
					.order('value');

				mysql.copy(equal(test), 'query')
					.expects(
						'SELECT ?? FROM Test ORDER BY `value` DESC;',
						[['name', 'value', 'email']]
					).callback(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]);
				promise.mock(equal(test), 'resolve')
					.expects(null, [
						{ name: 'John Doe', value: 10, email: 'jdoe@email.com' }
					]).calls(function() {
						test.done();
					});

				query.exec();
			},
			invalid: function(test) {
				test.expect(1);
				var query = new Query.Select(connection, 'Test')
					.select('name')
					.select('value')
					.select('email');

				try {
					query.order({
						field: 'value',
						direction: 'invalid'
					});
				} catch(err) {
					test.equal(err.message, '{Test} Unknown order: invalid');
				}
				test.done();
			}
		}
	},
	insert: function(test) {
		test.expect(4);
		var query = new Query.Insert(connection, 'Test')
			.column('name', 'Jane Doe')
			.column('value', 20)
			.column('email', 'jdoe@email.com');

		mysql.copy(equal(test), 'query')
			.expects(
				'INSERT INTO Test SET ?;',
				{ name: 'Jane Doe', value: 20, email: 'jdoe@email.com' }
			).callback(null, { insertId: 2 });
		promise.mock(equal(test), 'resolve')
			.expects(null,
				{ insertId: 2 }
			).calls(function() {
				test.done();
			});

		query.exec();
	},
	update: function(test) {
		test.expect(4);
		var query = new Query.Update(connection, 'Test')
			.column('name', 'John Jones')
			.column('value', 100)
			.where('name', { eq: 'John Doe' })
			.where('value', 10)
			.limit(2);

		mysql.copy(equal(test), 'query')
			.expects(
				'UPDATE Test SET ? WHERE `name` = ? AND `value` = ? LIMIT 2;',
				[{ name: 'John Jones', value: 100 }, 'John Doe', 10]
			).callback(null, [
				{ affectedRows: 1 }
			]);
		promise.mock(equal(test), 'resolve')
			.expects(null, [
				{ affectedRows: 1 }
			]).calls(function() {
				test.done();
			});

		query.exec();
	},
	delete: function(test) {
		test.expect(4);
		var query = new Query.Delete(connection, 'Test')
			.where('name', 'John Doe')
			.where('email', { eq: 'jdoe@email.com' })
			.limit(1);

		mysql.copy(equal(test), 'query')
			.expects(
				'DELETE FROM Test WHERE `name` = ? AND `email` = ? LIMIT 1;',
				[ 'John Doe', 'jdoe@email.com' ]
			).callback(null, [
				{ affectedRows: 1 }
			]);
		promise.mock(equal(test), 'resolve')
			.expects(null, [
				{ affectedRows: 1 }
			]).calls(function() {
				test.done();
			});

		query.exec();
	}
};
