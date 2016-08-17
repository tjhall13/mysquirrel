var proxyquire = require('proxyquire');
var mysql = require('./mock/mysql.js');

var mysquirrel = proxyquire('../index.js', {
	'mysql': mysql.proxy
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

var Schema = mysquirrel.Schema;

var businessSchema = new Schema({
	_id: Schema.Types.ObjectId,
	name: String,
	people: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
});

var personSchema = new Schema({
	_id: Schema.Types.ObjectId,
	type: Number,
	name: String,
	accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
	businesses: [{ type: Schema.Types.ObjectId, ref: 'Business' }]
});

var accountSchema = new Schema({
	_id: Schema.Types.ObjectId,
	person: { type: Schema.Types.ObjectId, ref: 'Person' },
	value: Number,
	acct: String
});

var Business = mysquirrel.model('Business', businessSchema);
var Person = mysquirrel.model('Person', personSchema);
var Account = mysquirrel.model('Account', accountSchema);

module.exports = {
	setUp: function(done) {
		mysquirrel.connect('mysql://user:pass@localhost/test');
		done();
	},
	tearDown: function(done) {
		mysquirrel.end();
		done();
	},
	schema: function(test) {
		test.ok(true);
		test.done();
	},
	crud: {
		retrieve: {
			singleton: function(test) {
				test.expect(5);

				mysql.mock(equal(test), 'query')
					.expects({ sql: 'SELECT ?? FROM Account WHERE Account._id = ? LIMIT 1;', nestTables: '.', values: [ [ 'Account._id', 'Account.person', 'Account.value', 'Account.acct' ], 1 ] })
					.callback(null, [
						{ 'Account._id': 1, 'Account.person': 1, 'Account.value': 20, 'Account.acct': '1111111111' }
					]);
				mysql.mock(null, 'release');

				Account
					.findById(1)
					.exec(function(err, account) {
						test.equal(account._id, 1);
						test.equal(account.person, 1);
						test.equal(account.value, 20);
						test.equal(account.acct, '1111111111');
						test.done();
					});
			},
			foreign: function(test) {
				test.expect(5);

				mysql.mock(equal(test), 'query')
					.expects({ sql: 'SELECT ?? FROM Account WHERE Account.acct = ?;', nestTables: '.', values: [ [ 'Account._id', 'Account.person', 'Account.value', 'Account.acct' ], '1111111111' ] })
					.callback(null, [
						{ 'Account._id': 1, 'Account.person': 1, 'Account.value': 20, 'Account.acct': '1111111111' }
					])
					.then()
					.expects({ sql: 'SELECT ?? FROM Person LEFT JOIN Account ON Person._id = Account.person WHERE Account._id IN ( ? );', nestTables: '.', values: [ [ 'Person._id', 'Person.type', 'Person.name', 'Account._id' ], [ 1 ] ] })
					.callback(null, [
						{ 'Person._id': 1, 'Person.name': 'Joe', 'Person.type': 'Manager', 'Account._id': 1 }
					]);
				mysql.mock(null, 'release');

				Account
					.find({ acct: '1111111111' })
					.populate('person')
					.exec(function(err, accounts) {
						test.equal(accounts.length, 1);
						test.equal(accounts[0].value, 20);
						test.equal(accounts[0].person.name, 'Joe');
						test.done();
					});
			},
			array: function(test) {
				test.expect(7);

				mysql.mock(equal(test), 'query')
					.expects({ sql: 'SELECT ?? FROM Person WHERE Person.name = ?;', nestTables: '.', values: [ [ 'Person._id', 'Person.type', 'Person.name' ], 'Joe' ] })
					.callback(null, [
						{ 'Person._id': 1, 'Person.name': 'Joe', 'Person.type': 'Manager' }
					])
					.then()
					.expects({ sql: 'SELECT ?? FROM Account LEFT JOIN Person ON Account.person = Person._id WHERE Person._id IN ( ? );', nestTables: '.', values: [ [ 'Account._id', 'Account.person', 'Account.value', 'Account.acct', 'Person._id' ], [ 1 ] ] })
					.callback(null, [
						{ 'Account._id': 1, 'Account.person': 1, 'Account.value': 10.0, 'Account.acct': '1234567890', 'Person._id': 1 },
						{ 'Account._id': 2, 'Account.person': 1, 'Account.value': 20.0, 'Account.acct': '1111111111', 'Person._id': 1 }
					]);
				mysql.mock(null, 'release');

				Person
					.find({ name: 'Joe' })
					.populate('accounts')
					.exec(function(err, persons) {
						test.equal(err, null);
						test.equal(persons.length, 1);
						test.equal(persons[0].name, 'Joe');
						test.equal(persons[0].accounts.length, 2);
						test.equal(persons[0].accounts[1].acct, '1111111111');
						test.done();
					});
			},
			many: function(test) {
				test.expect(7);

				mysql.mock(equal(test), 'query')
					.expects({ sql: 'SELECT ?? FROM Business WHERE Business.name = ?;', nestTables: '.', values: [ [ 'Business._id', 'Business.name' ], 'Universe' ] })
					.callback(null, [
						{ 'Business._id': 1, 'Business.name': 'Universe' }
					])
					.then()
					.expects({ sql: 'SELECT ?? FROM Person LEFT JOIN __Business_Person__ ON Person._id = __Business_Person__.person_id LEFT JOIN Business ON __Business_Person__.business_id = Business._id WHERE Business._id IN ( ? );', nestTables: '.', values: [ [ 'Person._id', 'Person.type', 'Person.name', 'Business._id' ], [ 1 ] ] })
					.callback(null, [
						{ 'Person._id': 1, 'Person.name': 'Joe', 'Person.type': 'Manager', 'Business._id': 1 },
						{ 'Person._id': 2, 'Person.name': 'Bob', 'Person.type': 'Employee', 'Business._id': 1 }
					]);

				Business
					.find({ name: 'Universe' })
					.populate('people')
					.exec(function(err, businesses) {
						test.equal(businesses.length, 1);
						test.equal(businesses[0].name, 'Universe');
						test.equal(businesses[0].people.length, 2);
						test.equal(businesses[0].people[0].name, 'Joe');
						test.equal(businesses[0].people[1].name, 'Bob');
						test.done();
					});
			}
		}
	}
};
