var proxyquire	= require('proxyquire'),
	mysql		= require('./mock/mysql.js');

var mysquirrel	= proxyquire('../index.js', {
	'mysql': mysql.proxy
});
var Schema		= mysquirrel.Schema;

function equal(test) {
	return function(expected, actual, msg) {
		if(typeof expected == 'object') {
			test.deepEqual(expected, actual, msg);
		} else {
			test.equal(expected, actual, msg);
		}
	};
}

var Account, Person;

module.exports = {
	setUp: function(done) {
		mysql.mock(null, 'Connection', 'connect').callback(null);
		mysquirrel.connect('mysql://user:pass@localhost/test');
		done();
	},
	tearDown: function(done) {
		mysql.mock(null, 'Connection', 'end');
		mysquirrel.end();

		Account = undefined;
		Person = undefined;
		done();
	},
	scheme: function(test) {
		test.expect(4);
		var query = mysql.mock(equal(test), 'Connection', 'query');

		var account = new Schema({
			value: Number
		});
		query.expects(
			'CREATE TABLE Account( value INTEGER, _id INTEGER AUTO_INCREMENT, PRIMARY KEY(_id) );',
			null
		).callback(null);
		Account = mysquirrel.model('Account', account);

		var person = new Schema({
			name: String,
			age: Number,
			account: [{ type: Account, unique: true }]
		});
		query.expects(
			'CREATE TABLE Person( name VARCHAR(150), age INTEGER, _id INTEGER AUTO_INCREMENT, PRIMARY KEY(_id) ); CREATE TABLE AccountPerson( _id INTEGER AUTO_INCREMENT, person_id INTEGER NOT NULL, account_id INTEGER NOT NULL UNIQUE, PRIMARY KEY(_id), FOREIGN KEY(person_id) REFERENCES Person(_id), FOREIGN KEY(account_id) REFERENCES Account(_id) );',
			null
		).callback(null);
		Person = mysquirrel.model('Person', person);

		test.done();
	},
	crud: {
		setUp: function(done) {
			mysql.mock(null, 'Connection', 'query');
			var account = new Schema({
				value: Number
			});
			Account = mysquirrel.model('Account', account);

			var person = new Schema({
				name: String,
				age: Number,
				accounts: [{ type: Account, unique: true }]
			});
			Person = mysquirrel.model('Person', person);
			done();
		},
		tearDown: function(done) {
			Account = undefined;
			Person = undefined;
			done();
		},
		create: function(test) {
			test.expect(7);
			var query = mysql.mock(equal(test), 'Connection', 'query');
			query.expects(
				'INSERT INTO Person SET ?;',
				{ name: 'Trevor Hall', age: 22 }
			).callback(null, { insertId: 1 });
			Person.create({ name: 'Trevor Hall', age: 22, accounts: [] }, function(err, person) {
				test.equal(err, null);
				test.equal(person.id, 1);
				test.equal(person.name, 'Trevor Hall');
				test.equal(person.age, 22);
				test.deepEqual(person.accounts, []);
				test.done();
			});
		},
		retrieve: {
			find: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'SELECT ?? FROM Person WHERE `name` = ?;',
					[['name', 'age', '_id'], 'Trevor Hall']
				).callback(null, [{
					_id: 1,
					name: 'Trevor Hall',
					age: 21
				}]);
				Person.find({ name: 'Trevor Hall' }, function(err, results) {
					test.equal(err, null);
					test.done();
				});
			},
			findOne: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'SELECT ?? FROM Person WHERE `name` = ? LIMIT 1;',
					[['name', 'age', '_id'], 'Trevor Hall']
				).callback(null, [{
					_id: 1,
					name: 'Trevor Hall',
					age: 21
				}]);
				Person.findOne({ name: 'Trevor Hall' }, function(err, results) {
					test.equal(err, null);
					test.done();
				});
			},
			findById: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'SELECT ?? FROM Person WHERE `_id` = ? LIMIT 1;',
					[['name', 'age', '_id'], 1]
				).callback(null, [{
					_id: 1,
					name: 'Trevor Hall',
					age: 21
				}]);
				Person.findById(1, function(err, results) {
					test.equal(err, null);
					test.done();
				});
			}
		},
		update: {
			save: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				var person = new Person({
					_id: 1,
					name: 'Trevor Hall',
					age: 21,
					accounts: []
				});
				person.age = 22;
				query.expects(
					'UPDATE Person SET ? WHERE `_id` = ?;',
					[{ age: 22 }, 1]
				).callback(null);
				person.save(function(err) {
					test.equal(err, null);
					test.done();
				});
			},
			findOneAndUpdate: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'UPDATE Person SET ? WHERE `name` = ? LIMIT 1;',
					[{ age: 22 }, 'Trevor Hall']
				).callback(null, { affectedRows: 1 });
				Person.findOneAndUpdate({
					name: 'Trevor Hall'
				}, {
					age: 22
				}, function(err, result) {
					test.equal(err, null);
					test.done();
				});
			},
			findByIdAndUpdate: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'UPDATE Person SET ? WHERE `_id` = ? LIMIT 1;',
					[{ age: 22 }, 1]
				).callback(null, { affectedRows: 1 });
				Person.findByIdAndUpdate(1, {
					age: 22
				}, function(err, result) {
					test.equal(err, null);
					test.done();
				});
			},
			update: function(test) {
				test.expect(4);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'UPDATE Person SET ? WHERE `name` = ?;',
					[{ age: 22 }, 'Trevor Hall']
				).callback(null, { affectedRows: 1 });
				Person.update({
					name: 'Trevor Hall'
				}, {
					age: 22
				}, function(err, result) {
					test.equal(err, null);
					test.equal(result.affectedRows, 1);
					test.done();
				});
			}
		},
		delete: {
			'.remove': function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'DELETE FROM Person WHERE `name` = ?;',
					['Trevor Hall']
				).callback(null);
				Person.remove({
					name: 'Trevor Hall'
				}, function(err) {
					test.equal(err, null);
					test.done();
				});
			},
			'#remove': function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				var person = new Person({
					_id: 1,
					name: 'Trevor Hall',
					age: 21,
					accounts: []
				});
				query.expects(
					'DELETE FROM Person WHERE `_id` = ?;',
					[1]
				).callback(null);
				person.remove(function(err) {
					test.equal(err, null);
					test.done();
				});
			},
			findOneAndRemove: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'DELETE FROM Person WHERE `name` = ? LIMIT 1;',
					['Trevor Hall']
				).callback(null);
				Person.findOneAndRemove({
					name: 'Trevor Hall'
				}, function(err) {
					test.equal(err, null);
					test.done();
				});
			},
			findByIdAndRemove: function(test) {
				test.expect(3);
				var query = mysql.mock(equal(test), 'Connection', 'query');

				query.expects(
					'DELETE FROM Person WHERE `_id` = ? LIMIT 1;',
					[1]
				).callback(null);
				Person.findByIdAndRemove(1, function(err) {
					test.equal(err, null);
					test.done();
				});
			}
		}
	}
};
