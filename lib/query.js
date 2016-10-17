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
				var _connection;

				if(Query.verbose) {
					_connection = {
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
				} else {
					_connection = connection;
				}

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

Query.verbose = false;

function QueryError(msg, model, fileName, lineNumber) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = '{' + model.modelName + '} ' + msg;
}
util.inherits(QueryError, Error);

function ConditionalQuery(Model) {
	Query.call(this, Model.db);

	this._conditions = [ ];
	this._parameters = [ ];
	var active = null;

	function literal(column, condition, prefix) {
		var _conditions = [ ];
		var _parameters = [ ];

		if(typeof condition == 'object') {
			for(var param in condition) {
				switch(param) {
					case '$in':
						_conditions.push(prefix + '.' + column + ' IN ( ? )');
						_parameters.push(condition[param]);
						break;
					case '$eq':
						_conditions.push(prefix + '.' + column + ' = ?');
						_parameters.push(condition[param]);
						break;
					case '$gt':
						_conditions.push(prefix + '.' + column + ' > ?');
						_parameters.push(condition[param]);
						break;
					case '$lt':
						_conditions.push(prefix + '.' + column + ' < ?');
						_parameters.push(condition[param]);
						break;
					case '$gte':
						_conditions.push(prefix + '.' + column + ' >= ?');
						_parameters.push(condition[param]);
						break;
					case '$lte':
						_conditions.push(prefix + '.' + column + ' <= ?');
						_parameters.push(condition[param]);
						break;
				}
			}
		} else {
			_conditions.push(prefix + '.' + column + ' = ?');
			_parameters.push(condition);
		}

		return {
			conditions: _conditions,
			parameters: _parameters
		};
	}

	function logical(type, conditions, prefix) {
		var prepared = conditions.reduce(function(prepared, condition) {
			var _partial;

			for(var column in condition) {
				switch(column) {
					case '$and':
						_partial = logical('and', condition[column], prefix);
						break;
					case '$or':
						_partial = logical('or', condition[column], prefix);
						break;
					default:
						_partial = literal(column, condition[column], prefix);
						break;
				}
				prepared.conditions = prepared.conditions.concat(_partial.conditions);
				prepared.parameters = prepared.parameters.concat(_partial.parameters);
			}

			return prepared;
		}, { conditions: [ ], parameters: [ ] });

		return {
			conditions: [ '( ' + prepared.conditions.join(' ' + type.toUpperCase() + ' ') + ' )' ],
			parameters: prepared.parameters
		};
	}

	this.where = function(path, val, prefix) {
		prefix = prefix || Model.modelName;

		if(path && val) {
			var prepared = literal(path, val, prefix);
			Array.prototype.push.apply(this._conditions, prepared.conditions);
			Array.prototype.push.apply(this._parameters, prepared.parameters);
		} else {
			active = {
				path: path,
				prefix: prefix
			};
		}

		return this;
	};

	this.in = function(path, val, prefix) {
		if(path && val) {
			this.where(path, { $in: val }, prefix);
		} else {
			this.where(active.path, { $in: path }, active.prefix);
		}
		return this;
	};

	this.and = function(conditions, prefix) {
		prefix = prefix || Model.modelName;

		var prepared = logical('and', conditions, prefix);
		Array.prototype.push.apply(this._conditions, prepared.conditions);
		Array.prototype.push.apply(this._parameters, prepared.parameters);

		return this;
	};

	this.or = function(conditions, prefix) {
		prefix = prefix || Model.modelName;

		var prepared = logical('or', conditions, prefix);
		Array.prototype.push.apply(this._conditions, prepared.conditions);
		Array.prototype.push.apply(this._parameters, prepared.parameters);

		return this;
	};
}
util.inherits(ConditionalQuery, Query);

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
	ConditionalQuery.call(this, Model);

	var command = 'SELECT ?? FROM ' + Model.modelName;
	var fields = [ ];
	var modifiers = { };
	var populates = { };
	var joins = [ ];
	var sorts = [ ];

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
		if(this._conditions.length) {
			query += ' WHERE ' + this._conditions[0];
		}
		for(i = 1; i < this._conditions.length; i++) {
			query += ' AND ' + this._conditions[i];
		}
		if(sorts.length) {
			query += ' ORDER BY ' + sorts[0];
		}
		for(i = 1; i < sorts.length; i++) {
			query += ', ' + sorts[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		var data = [fields].concat(this._parameters);
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
			if(err) {
				callback(err);
			} else if(!rows) {
				callback(null, [], rows);
			} else {
				if(rows && rows.length) {
					this._populate(connection, rows, callback);
				} else {
					callback(null, modifiers.LIMIT == 1 ? null : [], rows);
				}
			}
		}.bind(this));
	};

	this._populate = function(connection, rows, callback) {
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
				this._hydrate(collections, rows, callback);
			}
		}.bind(this));
	};

	this._hydrate = function(collections, rows, callback) {
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

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};

	this.sort = function(paths) {
		if(typeof paths == 'object') {
			for(var path in paths) {
				switch(paths[path]) {
					case 1:
					case 'asc':
					case 'ascending':
						sorts.push(path + ' ASC');
						break;
					case -1:
					case 'desc':
					case 'descending':
						sorts.push(path + ' DESC');
						break;
				}
			}
		} else if(typeof paths == 'string') {
			var arr = paths.split(' ');
			var opts = arr.reduce(function(opts, path) {
				if(path.charAt(0) == '-') {
					opts[path.substr(1)] = -1;
				} else {
					opts[path] = 1;
				}
				return opts;
			}, { });
			this.sort(opts);
		}

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
	ConditionalQuery.call(this, Model);

	var command = 'UPDATE ' + Model.modelName + ' SET ?';
	var modifiers = { };
	var data = { };

	function _query() {
		var query;
		var i;

		query = command;
		if(this._conditions.length) {
			query += ' WHERE ' + this._conditions[0];
		}
		for(i = 1; i < this._conditions.length; i++) {
			query += ' AND ' + this._conditions[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		return [data].concat(this._parameters);
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

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};
}
util.inherits(UpdateQuery, Query);

function DeleteQuery(Model) {
	ConditionalQuery.call(this, Model);

	var command = 'DELETE FROM ' + Model.modelName;
	var modifiers = { };

	function _query() {
		var query;
		var i;

		query = command;
		if(this._conditions.length) {
			query += ' WHERE ' + this._conditions[0];
		}
		for(i = 1; i < this._conditions.length; i++) {
			query += ' AND ' + this._conditions[i];
		}
		for(var mod in modifiers) {
			query += ' ' + mod + ' ' + modifiers[mod];
		}
		query += ';';

		return query;
	}

	function _data() {
		return [].concat(this._parameters);
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

	this.limit = function(num) {
		modifiers.LIMIT = num;
		return this;
	};
}
util.inherits(DeleteQuery, Query);

module.exports = Query;
