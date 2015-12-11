var util = require('util');
var Xerox = require('xerox');

var query = new Xerox('Query');
var Query = Xerox.documents.Query;
Query.Create = CreateQuery;
Query.Select = SelectQuery;
Query.Update = UpdateQuery;
Query.Insert = InsertQuery;
Query.Delete = DeleteQuery;

function CreateQuery(db, name) {
	Query.call(this, db, name);
}
util.inherits(CreateQuery, Query);

function SelectQuery(db, name) {
	Query.call(this, db, name);
}
util.inherits(SelectQuery, Query);

function UpdateQuery(db, name) {
	Query.call(this, db, name);
}
util.inherits(UpdateQuery, Query);

function InsertQuery(db, name) {
	Query.call(this, db, name);
}
util.inherits(InsertQuery, Query);

function DeleteQuery(db, name) {
	Query.call(this, db, name);
}
util.inherits(DeleteQuery, Query);

module.exports = {
	proxy: Query,
	mock: function(test, method) {
		return query.copy(test, method);
	}
};
