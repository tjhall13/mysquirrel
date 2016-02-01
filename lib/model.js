var Sync = require('sync');

var async = require('./async.js');
var Query = require('./query.js');
var Promise = require('./promise.js');

var models = { };

function Model(connection, name, schema) {
	var primary;
	var description;
	if(schema) {
		description = schema._describe();
		create();
	} else {
		// TODO: import schema from db
	}
	for(var field in description) {
		if(description[field].key == 'PRIMARY') {
			primary = field;
			break;
		}
	}

	function create(callback) {
		var query = new Query.Create(connection, name);
		for(var field in description) {
			query.column(field, description[field]);
		}
		return query.exec(callback);
	}

	var model = function(values) {
		if(!values) {
			values = { };
		}
		var self = this;
		var modified = { };
		function getter(field) { return function() { return values[field]; }; }
		function setter(field) { return function(value) { values[field] = value; modified[field] = true; }; }
		Object.defineProperty(this, 'id', {
			get: getter(primary),
			set: setter(primary)
		});
		for(var field in description) {
			Object.defineProperty(this, field, {
				get: getter(field),
				set: setter(field)
			});
		}

		this.save = function(callback) {
			var query;
			var promise = new Promise(callback);

			if(values[primary]) {
				query = new Query.Update(connection, name);
				Object.keys(values).forEachAsync(function(next, field) {
					if(field == primary) {
						query.where(primary, values[primary]);
						next();
					} else {
						if(modified[field]) {
							if(description[field].key == 'FOREIGN') {
								values[field].save(function(err, object) {
									if(!err) {
										query.column(field, object.id);
									}
									next(err);
								});
							} else if(description[field].type == 'array') {
								// TODO: Handle array types
								next();
							} else {
								query.column(field, values[field]);
								next();
							}
						} else {
							next();
						}
					}
				}, function(err) {
					if(err) {
						promise.error(err);
					} else {
						query.exec(function(err) {
							if(err) {
								promise.error(err);
							} else {
								promise.fulfill(self);
							}
						});
					}
				});
			} else {
				query = new Query.Insert(connection, name);
				Object.keys(values).forEachAsync(function(next, field) {
					if(description[field].key == 'FOREIGN') {
						values[field].save(function(err, object) {
							if(!err) {
								query.column(field, object.id);
							}
							next(err);
						});
					} else if(description[field].type == 'array') {
						// TODO: Handle array types
						next();
					} else {
						query.column(field, values[field]);
						next();
					}
				}, function(err) {
					if(err) {
						promise.error(err);
					} else {
						query.exec(function(err, result) {
							if(err) {
								promise.error(err);
							} else {
								values[primary] = result.insertId;
								promise.fulfill(self);
							}
						});
					}
				});
			}

			return promise;
		};
		this.remove = function(callback) {
			var query = new Query.Delete(connection, name);
			query.where(primary, values[primary]);
			if(callback) {
				return query.exec(function(err, result) {
					if(err) {
						callback(err, null);
					} else {
						values[primary] = null;
						callback(null, self);
					}
				});
			} else {
				return query;
			}
		};
	};
	model.create = function(values, callback) {
		return new model(values).save(callback);
	};
	model.find = function(conditions, projection, options, callback) {
		if(typeof conditions == 'function') {
			callback = conditions;
			options = { };
			projection = null;
			conditions = { };
		} else if(typeof projection == 'function') {
			callback = projection;
			options = { };
			projection = null;
		} else if(typeof options == 'function') {
			callback = options;
			options = { };
		}

		try {
			var query = new Query.Select(connection, name);
			if(!projection) {
				projection = Object.keys(description);
			} else if(typeof projection == 'string') {
				projection = projection.split(' ');
			} else if(typeof projection == 'object' && !Array.isArray(projection)) {
				projection = Object.keys(projection);
			}
			projection.forEach(function(field) {
				if(field == 'id') {
					field = primary;
				}
				if(description[field]) {
					if(description[field].type == 'array') {
						// TODO: Handle deferred array type
					} else {
						query.select(field);
					}
				} else {
					throw new Query.QueryError('unknown field: ' + field, model);
				}
			});
			for(var cond in conditions) {
				if(cond == 'id') {
					query.where(primary, conditions[cond]);
				} else {
					query.where(cond, conditions[cond]);
				}
			}

			if(typeof callback == 'function') {
				return query.exec(function(err, results) {
					if(err) {
						callback(err, null);
					} else {
						callback(null, results.map(function(value) {
							// TODO: Handle array types
							return new model(value);
						}));
					}
				});
			} else {
				return query;
			}
		} catch(err) {
			if(typeof callback == 'function') {
				callback(err, null);
			} else {
				throw err;
			}
		}
	};
	model.findOne = function() {
		var arg, i = 0;
		var args = [];
		while(i < arguments.length) {
			arg = arguments[i++];
			if(typeof arg == 'function') {
				break;
			} else {
				args.push(arg);
				arg = undefined;
			}
		}
		var callback = arg;

		var query = model.find.apply(null, args);
		query.limit(1);
		if(typeof callback == 'function') {
			query.exec(function(err, value) {
				if(err) {
					callback(err, null);
				} else {
					callback(null, new model(value[0]));
				}
			});
		} else {
			return query;
		}
	};
	model.findById = function(id, projection, options, callback) {
		return model.findOne({ id: id }, projection, options, callback);
	};
	model.findOneAndUpdate = function(conditions, update, options, callback) {
		if(typeof options == 'function') {
			callback = options;
			options = { };
		}
		var query = new Query.Update(connection, name);
		for(var column in update) {
			query.column(column, update[column]);
		}
		for(var cond in conditions) {
			if(cond == 'id') {
				query.where(primary, conditions[cond]);
			} else {
				query.where(cond, conditions[cond]);
			}
		}
		query.limit(1);
		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};
	model.findByIdAndUpdate = function(id, update, options, callback) {
		return model.findOneAndUpdate({ id: id }, update, options, callback);
	};
	model.findOneAndRemove = function(conditions, options, callback) {
		if(typeof options == 'function') {
			callback = options;
			options = { };
		}
		var query = new Query.Delete(connection, name);
		for(var cond in conditions) {
			if(cond == 'id') {
				query.where(primary, conditions[cond]);
			} else {
				query.where(cond, conditions[cond]);
			}
		}
		query.limit(1);
		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};
	model.findByIdAndRemove = function(id, options, callback) {
		return model.findOneAndRemove({ id: id }, options, callback);
	};
	model.update = function(conditions, update, options, callback) {
		if(typeof options == 'function') {
			callback = options;
			options = { };
		}
		var query = new Query.Update(connection, name);
		for(var column in update) {
			query.column(column, update[column]);
		}
		for(var cond in conditions) {
			query.where(cond, conditions[cond]);
		}
		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};
	model.remove = function(conditions, callback) {
		var query = new Query.Delete(connection, name);
		for(var cond in conditions) {
			query.where(cond, conditions[cond]);
		}
		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};

	model.modelName = name;
	model.schema = schema;

	models[name] = model;
	return model;
}

Model.isModel = function(type) {
	for(var name in models) {
		if(type == models[name]) {
			return true;
		}
	}
	return false;
};

module.exports = Model;
