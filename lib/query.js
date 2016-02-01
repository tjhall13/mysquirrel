var util = require('util');
var Promise = require('./promise.js');

function Query(db) {
	this.exec = function(callback) {
		var promise = new Promise(callback);
		db.query(this._query, this._data, function() {
			Promise.prototype.resolve.apply(promise, arguments);
		});
		return promise;
	};
}

Query.QueryError = QueryError;
Query.Create = CreateQuery;
Query.Insert = InsertQuery;
Query.Select = SelectQuery;
Query.Update = UpdateQuery;
Query.Delete = DeleteQuery;

function QueryError(msg, model, fileName, lineNumber) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = '{' + model.modelName + '} ' + msg;
}
util.inherits(QueryError, Error);

function CreateQuery(db, name) {
	Query.call(this, db);

	var command = 'CREATE TABLE ' + name + '( ';
	var columns = [];
	var keys = [];
	var subqueries = [];

	function _query() {
		var i;
		var query;

		query = command;
		if(columns.length) {
			query += columns[0];
		}
		for(i = 1; i < columns.length; i++) {
			query += ', ' + columns[i];
		}
		for(i = 0; i < keys.length; i++) {
			if(keys[i].type == 'primary') {
				rule = 'PRIMARY KEY(' + keys[i].column + ')';
			} else if(keys[i].type == 'foreign') {
				rule = 'FOREIGN KEY(' + keys[i].local + ')';
				rule = rule.concat(' REFERENCES ', keys[i].table, '(', keys[i].foreign, ')');
			}
			query += ', ' + rule;
		}
		query += ' );';

		subqueries.forEach(function(next) {
			query += ' ' + next._query;
		});

		return query;
	}

	Object.defineProperty(this, '_query', {
		get: _query
	});
	Object.defineProperty(this, '_data', {
		get: function() { return null; }
	});

	this.column = function(field, attributes) {
		column = '';
		if(attributes.type != 'array') {
			column += field + ' ' + attributes.type;
			if(attributes.size) {
				column += '(' + attributes.size + ')';
			} else if(attributes.type == 'VARCHAR'){
				column += '(150)';
			}
			if(attributes.properties) {
				attributes.properties.forEach(function(property) {
					column += ' ' + property;
				});
			}
            
			if(attributes.key) {
				if(attributes.key == 'PRIMARY') {
					keys.push({
						type: 'primary',
						column: field
					});
				} else if(attributes.key == 'FOREIGN') {
					var foreign, id;
					if(typeof attributes.table == 'object') {
						foreign = attributes.table.name;
						id = attributes.table.id;
					} else {
						foreign = attributes.table;
						id = '_id';
					}
					keys.push({
						type: 'foreign',
						local: field,
						table: foreign,
						foreign: id
					});
				}
			}
			if(attributes.key != 'PRIMARY') {
				if(attributes.required) {
					column += ' NOT NULL';
				}
				if(attributes.unique) {
					column += ' UNIQUE';
				}
			}
			if(attributes.default) {
				column += ' DEFAULT "' + attributes.default + '"';
			}
			columns.push(column);
		} else {
			var ref = attributes.table.table;
			var query = new CreateQuery(db, ref + name);
			query.column('_id', { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] });
			query.column(name.toLowerCase() + '_id', { type: 'INTEGER', required: true, unique: false, key: 'FOREIGN', table: name });
			query.column(ref.toLowerCase() + '_id', { type: 'INTEGER', required: true, unique: attributes.table.unique, key: 'FOREIGN', table: ref });
			subqueries.push(query);
		}
		return this;
	};
}
util.inherits(CreateQuery, Query);

function SelectQuery(db, name) {
	Query.call(this, db);

	var command = 'SELECT ?? FROM ' + name;
	var fields = [];
	var conditions = [];
	var parameters = [];
	var modifiers = { };

	function _query() {
		var query;
		var i;

		query = command;
		if(conditions.length) {
			query += ' WHERE ' + conditions[0];
		}
		for(i = 1; i < conditions.length; i++) {
			query += ' AND ' + conditions[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		var data = [fields].concat(parameters);
		return data;
	}

	Object.defineProperty(this, '_query', {
		get: _query
	});
	Object.defineProperty(this, '_data', {
		get: _data
	});

	this.select = function(name) {
		fields.push(name);
		return this;
	};

	this.where = function(column, condition) {
		conditions.push('`' + column + '` = ?');
		if(typeof condition == 'object') {
			parameters.push(condition.eq);
		} else {
			parameters.push(condition);
		}
		return this;
	};

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};

	this.order = function(param) {
		var direction, field;
		if(typeof param == 'object') {
			field = param.field;
			if(param.direction.toLowerCase() == 'asc') {
				direction = 'ASC';
			} else if(param.direction.toLowerCase() == 'desc') {
				direction = 'DESC';
			} else {
				throw new QueryError('Unknown order: ' + param.direction, { modelName: name });
			}
		} else {
			direction = 'DESC';
			field = param;
		}
		modifiers['ORDER BY'] = '`' + field + '` ' + direction;
		return this;
	};
}
util.inherits(SelectQuery, Query);

function InsertQuery(db, name) {
	Query.call(this, db);

	var query = 'INSERT INTO ' + name + ' SET ?;';
	var data = { };

	Object.defineProperty(this, '_query', {
		get: function() { return query; }
	});
	Object.defineProperty(this, '_data', {
		get: function() { return data; }
	});

	this.column = function(name, value) {
		data[name] = value;
		return this;
	};
}
util.inherits(InsertQuery, Query);

function UpdateQuery(db, name) {
	Query.call(this, db);

	var command = 'UPDATE ' + name + ' SET ?';
	var conditions = [];
	var parameters = [];
	var modifiers = { };
	var data = { };

	function _query() {
		var query;
		var i;

		query = command;
		if(conditions.length) {
			query += ' WHERE ' + conditions[0];
		}
		for(i = 1; i < conditions.length; i++) {
			query += ' AND ' + conditions[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		return [data].concat(parameters);
	}

	Object.defineProperty(this, '_query', {
		get: _query
	});
	Object.defineProperty(this, '_data', {
		get: _data
	});

	this.column = function(name, value) {
		data[name] = value;
		return this;
	};

	this.where = function(column, condition) {
		conditions.push('`' + column + '` = ?');
		if(typeof condition == 'object') {
			parameters.push(condition.eq);
		} else {
			parameters.push(condition);
		}
		return this;
	};

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};
}
util.inherits(UpdateQuery, Query);

function DeleteQuery(db, name) {
	Query.call(this, db);

	var command = 'DELETE FROM ' + name;
	var conditions = [];
	var parameters = [];
	var modifiers = { };

	function _query() {
		var query;
		var i;

		query = command;
		if(conditions.length) {
			query += ' WHERE ' + conditions[0];
		}
		for(i = 1; i < conditions.length; i++) {
			query += ' AND ' + conditions[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		return [].concat(parameters);
	}

	Object.defineProperty(this, '_query', {
		get: _query
	});
	Object.defineProperty(this, '_data', {
		get: _data
	});

	this.where = function(column, condition) {
		conditions.push('`' + column + '` = ?');
		if(typeof condition == 'object') {
			parameters.push(condition.eq);
		} else {
			parameters.push(condition);
		}
		return this;
	};

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};
}
util.inherits(DeleteQuery, Query);

module.exports = Query;
