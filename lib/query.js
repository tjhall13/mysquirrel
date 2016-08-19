var util = require('util');
var async = require('async');
var Promise = require('./promise.js');

var mysql = require('mysql');

function Query(db) {
	this.exec = function(callback) {
		var promise = new Promise(callback);
		db.getConnection(function(err, connection) {
			if(err) {
				promise.error(err);
			} else {
				var _connection = {
					query: function() {
						if(arguments.length > 2) {
							console.log(arguments[0], arguments[1]);
						} else {
							console.log(arguments[0].sql, arguments[0].values);
						}
						connection.query.apply(connection, arguments);
					},
					release: function() {
						connection.release();
					}
				};

				this._exec(_connection, function(err, data) {
					_connection.release();
					promise.resolve(err, data);
				});
			}
		}.bind(this));
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
	var queries = [];
	var primary = '_id';

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

		return query;
	}

	Object.defineProperty(this, '_query', {
		get: _query
	});
	Object.defineProperty(this, '_data', {
		get: function() { return null; }
	});

	this._exec = function(connection, callback) {
		queries.unshift(this);
		async.eachSeries(queries, function(sql, next) {
			var query = sql._query;
			var data = sql._data;
			connection.query(query, data, next);
		}, function(err) {
			queries.shift();
			callback(err);
		});
	};

	this.column = function(field, attributes) {
		column = '';
		if(attributes.type != 'ARRAY') {
			column += field + ' ' + attributes.type;
			if(attributes.size) {
				column += '(' + attributes.size + ')';
			}
			if(attributes.properties) {
				attributes.properties.forEach(function(property) {
					column += ' ' + property;
				});
			}
            
			if(attributes.key) {
				if(attributes.key == 'PRIMARY') {
					primary = field;
					keys.push({
						type: 'primary',
						column: field
					});
				} else if(attributes.key == 'FOREIGN') {
					var foreign = attributes.name;
					var id = attributes.column;
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
			}
			if(attributes.default) {
				column += ' DEFAULT ' + ( attributes.default == 'CURRENT_TIMESAMP' ? attributes.default : '\'' + attributes.default + '\'' );
			}
			columns.push(column);
		} else {
			var ref = {
				column: attributes.table.column,
				name: attributes.table.name
			};
			var query = new CreateQuery(db, name + '_' + ref.name);

			query.column(primary, { type: 'INTEGER', key: 'PRIMARY', properties: ['AUTO_INCREMENT'] });
			query.column(name.toLowerCase(), { type: 'INTEGER', required: true, unique: false, key: 'FOREIGN', name: name, column: primary });
			query.column(ref.name.toLowerCase(), { type: 'INTEGER', required: true, unique: attributes.table.unique, key: 'FOREIGN', name: ref.name, column: ref.column });

			queries.push(query);
		}
		return this;
	};
}
util.inherits(CreateQuery, Query);

function SelectQuery(Model) {
	Query.call(this, Model.db);

	var command = 'SELECT ?? FROM ' + Model.modelName;
	var fields = [ ];
	var conditions = [ ];
	var parameters = [ ];
	var modifiers = { };
	var populates = { };
	var joins = [ ];
	var chain = { };

	function _query() {
		var query;
		var i, j;

		query = command;
		for(i = 0; i < joins.length; i++) {
			query += ' ' + joins[i].type.toUpperCase() + ' JOIN ' + joins[i].table;
			if(joins[i].conditions.length) {
				query += ' ON ' + joins[i].conditions[0];
			}
			for(j = 1; j < joins[i].conditions.length; j++) {
				query += ' AND ' + joins[i].conditions[j];
			}
		}
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

	this._exec = function(connection, callback) {
		connection.query({ sql: this._query, nestTables: '.', values: this._data }, function(err, rows) {
			var set = rows.reduce(function(current, row) {
				current.push(row[Model.modelName + '._id']);
				return current;
			}, [ ]);

			async.reduce(Object.keys(populates), { }, function(collections, column, next) {
				populates[column]
					.select('_id', Model.modelName)
					.where('_id', undefined, Model.modelName).in(set)
					._exec(connection, function(err, docs, rows) {
						if(err) {
							next(err);
						} else {
							var references = docs.reduce(function(refs, doc, index) {
								var _id = rows[index][Model.modelName + '._id'];
								if(Array.isArray(Model.schema.paths[column])) {
									if(refs[_id]) {
										refs[_id].push(doc);
									} else {
										refs[_id] = [ doc ];
									}
								} else {
									refs[_id] = doc;
								}

								return refs;
							}, { });

							collections[column] = references;
							next(null, collections);
						}
					});
			}, function(err, collections) {
				if(err) {
					callback(err);
				} else {
					var sanitizer = new RegExp(Model.modelName + '\\.([a-zA-Z_0-9.]+)');
					var results = rows.reduce(function(results, row) {
						var _id = row[Model.modelName + '._id'];
						var doc = { };
						var sanitized, column, path;

						for(column in row) {
							sanitized = column.match(sanitizer);
							if(sanitized) {
								path = sanitized[1];
								doc[path] = row[column];
							}
						}
						for(path in collections) {
							if(Array.isArray(Model.schema.paths[path])) {
								doc[path] = collections[path][_id] || [ ];
							} else {
								doc[path] = collections[path][_id] || null;
							}
						}

						results.push( Model.hydrate(doc) );
						return results;
					}, [ ]);

					if(modifiers.LIMIT == 1) {
						callback(null, results[0] || null, rows);
					} else {
						callback(null, results, rows);
					}
				}
			});
		});
	};

	this.select = function(name, prefix) {
		prefix = prefix || Model.modelName;
		if(!Array.isArray(Model.schema.paths[name])) {
			fields.push(prefix + '.' + name);
		}
		return this;
	};

	this.join = function(name, options) {
		joins.push({
			table: name,
			type: options ? options.type || 'left' : 'left',
			conditions: []
		});
		return this;
	};

	this.on = function(column, reference) {
		var left_table, right_table;
		if(joins.length) {
			if(joins.length > 1) {
				left_table = joins[joins.length - 2].table;
			} else {
				left_table = Model.modelName;
			}
			right_table = joins[joins.length - 1].table;

			joins[joins.length - 1].conditions.push(left_table + '.' + column + ' = ' + right_table + '.' + reference);
			return this;
		} else {
			throw new Error('Call to on must be preceeded by join');
		}
	};

	this.populate = function(columns) {
		var table, column, schema, path;

		if(Array.isArray(columns)) {
			columns.forEach(this.populate.bind(this));
		} else {
			columns = columns.split(' ');
			if(columns.length > 1) {
				this.populate(columns);
			} else {
				column = columns[0];
				schema = Model.schema.paths[column];
				if(Array.isArray(schema)) {
					Reference = Model.model(schema[0].ref);
					path = Object.keys(Reference.schema.paths).find(function(path) {
						return Reference.schema.paths[path].ref == Model.modelName;
					}, this);

					if(path) {
						populates[column] = 
							Reference.find({ })
								.join(Model.modelName).on(path, '_id');
					} else {
						table = '__' + ( Model.modelName.localeCompare(Reference.modelName) > 0 ? Reference.modelName + '_' + Model.modelName : Model.modelName + '_' + Reference.modelName ) + '__';

						populates[column] = 
							Reference.find({ })
								.join(table).on('_id', Reference.modelName.toLowerCase() + '_id')
								.join(Model.modelName).on(Model.modelName.toLowerCase() + '_id', '_id');
					}
				} else {
					Reference = Model.model(schema.ref);

					populates[column] = 
						Reference.find({ })
							.join(Model.modelName).on('_id', column);
				}
			}
		}

		return this;
	};

	this.where = function(path, val, prefix) {
		prefix = prefix || Model.modelName;
		if(chain.where) {
			conditions.push(chain.where);
		}
		path = prefix + '.' + path;
		if(val) {
			conditions.push(path + ' = ?');
			parameters.push(val);
		}
		chain.where = path;
		return this;
	};

	this.in = function(path, val, prefix) {
		if(path && val) {
			this.where(path, undefined, prefix);
		} else {
			val = path;
			path = chain.where;
		}
		conditions.push(path + ' IN ( ? )');
		parameters.push(val);
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
		modifiers['ORDER BY'] = '`' + table + '.' + field + '` ' + direction;
		return this;
	};
}
util.inherits(SelectQuery, Query);

function InsertQuery(Model) {
	Query.call(this, Model.db);

	var query = 'INSERT INTO ' + Model.modelName + ' SET ?;';
	var data = { };

	Object.defineProperty(this, '_query', {
		get: function() { return query; }
	});
	Object.defineProperty(this, '_data', {
		get: function() { return data; }
	});

	this._exec = function(connection, callback) {
		connection.query(this._query, this._data, callback);
	};

	this.column = function(name, value) {
		data[name] = value;
		return this;
	};
}
util.inherits(InsertQuery, Query);

function UpdateQuery(Model) {
	Query.call(this, Model.db);

	var command = 'UPDATE ' + Model.modelName + ' SET ?';
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

	this._exec = function(connection, callback) {
		connection.query(this._query, this._data, callback);
	};

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

function DeleteQuery(Model) {
	Query.call(this, Model.db);

	var command = 'DELETE FROM ' + Model.modelName;
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

	this._exec = function(connection, callback) {
		connection.query(this._query, this._data, callback);
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
util.inherits(DeleteQuery, Query);

module.exports = Query;
