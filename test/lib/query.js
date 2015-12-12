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
	create: function(test) {
		test.expect(3);
		var query = new Query.Create(connection, 'Test')
			.column('id', { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] })
			.column('name', { type: 'VARCHAR', size: 50, required: true })
			.column('value', { type: 'INTEGER', required: true });

		mysql.copy(equal(test), 'query')
			.expects('CREATE TABLE Test( id INTEGER AUTO_INCREMENT, name VARCHAR(50) NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(id) );', null)
			.callback(null);
		promise.mock(equal(test), 'resolve')
			.expects(null)
			.calls(function() {
				test.done();
			});

		query.exec();
	},
	select: function(test) {
		test.expect(4);
		var query = new Query.Select(connection, 'Test')
			.select('name')
			.select('value')
			.select('email')
			.where('id', { eq: 1 });

		mysql.copy(equal(test), 'query')
			.expects(
				'SELECT ?? FROM Test WHERE `id` = ?;',
				[['name', 'value', 'email'], 1]
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
			.where('id', { eq: 1 });

		mysql.copy(equal(test), 'query')
			.expects(
				'UPDATE Test SET ? WHERE `id` = ?;',
				[{ name: 'John Jones', value: 100 }, 1]
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
			.where('email', { eq: 'jdoe@email.com' })
			.limit(1);

		mysql.copy(equal(test), 'query')
			.expects(
				'DELETE FROM Test WHERE `email` = ? LIMIT 1;',
				[ 'jdoe@email.com' ]
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
