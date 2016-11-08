var Document = require('./document.js');
var Promise = require('./promise.js');
var Query = require('./query.js');
var util = require('util');

var models = { };

function model(name, schema, db) {
	var primary = '_id';

	function getter(prop) {
		return function() {
			return this.get(prop);
		};
	}

	function setter(prop) {
		return function(v) {
			this.set(prop, v);
		};
	}

	function Model(doc) {
		Document.call(this, doc, schema.paths);
	}
	util.inherits(Model, Document);

	Object.assign(Model.prototype, schema.methods);

	Object.defineProperty(Model.prototype, 'id', {
		get: getter('_id'),
		set: setter('_id')
	});

	for(var path in schema.paths) {
		Object.defineProperty(Model.prototype, path, {
			get: getter(path),
			set: setter(path)
		});
	}

	for(var virtual in schema.virtuals) {
		Object.defineProperty(Model.prototype, virtual, {
			get: schema.virtuals[virtual]._getter,
			set: schema.virtuals[virtual]._setter
		});
	}

	Model.prototype.save = function(callback) {
		var Class = this.constructor;
		var promise = new Promise(callback);

		var query, promises = [];
		if(this.get(primary)) {
			query = new Query.Update(this).where(primary, this.get(primary));
		} else {
			query = new Query.Insert(this);
		}

		this.modifiedPaths().forEach(function(path) {
			if(path != primary) {
				if(Array.isArray(schema.paths[path])) {
					var Reference = Model.model(schema.paths[path][0].ref);

					var ref = Object.keys(Reference.schema.paths).find(function(path) {
						return Reference.schema.paths[path].ref == Class.modelName;
					});

					var deletions = this.$__initial[path].filter(function(id) {
						return !this.$__columns[path].find(function(document) { return document.id == id; });
					}, this);

					if(deletions.length) {
						var promise;

						if(ref) {
							promise = Reference
								.remove({ _id: { $in: deletions } })
								.exec();
						} else {
							promise = new Query.Reference(Class, Reference)
								.delete(this.get('id'), { $in: deletions })
								.exec();
						}

						promises.push(promise);
					}

					promises.push(
						Promise.all(
							this.get(path).map(function(document) {
							  if(document.id) {
							    return document.save();
						    } else {
							    if(ref) {
							      document.set(ref, this.id);
								    return document.save();
						      } else {
						        return document.save()
						          .then(function(doc) {
						            return new Query.Reference(Class, Reference)
						              .create(this.id, doc.id)
						              .exec();
					            });
							    }
						    }
							}, this)
						)
					);
				} else {
					query.column(path, this.get(path));
				}
			}
		}, this);

		Promise.all(promises)
			.then(function() {
				return query.exec();
			})
			.then(function(doc) {
				promise.fulfill(doc);
			}, function(err) {
				promise.reject(err);
			});

		return promise;
	};

	Model.prototype.remove = function(callback) {
		var Class = this.constructor;

		var query = new Query.Delete(Class);
		var promises = [];

		query.where('_id', this.get('id'));

		Object.keys(this.schema.paths).forEach(function(path) {
			if(Array.isArray(this.schema.paths[path])) {
				var Reference = Model.model(schema.paths[path][0].ref);

				var deletions = this.get(path).map(function(document) { return document.id; });

				var ref = Object.keys(Reference.schema.paths).find(function(path) {
					return Reference.schema.paths[path].ref == Class.modelName;
				});

				var promise;
				if(ref) {
					promise = Reference
						.remove({ _id: { $in: deletions } })
						.exec();
				} else {
					promise = new Query.Reference(Class, Reference)
						.delete(this.get('id'), { $in: deletions })
						.exec();
				}

				promises.push(promise);
			}
		}, this);

		return Promise.all(promises)
			.then(function() {
				return query.exec(callback);
			});
	};

	Model.prototype.model = function(name) {
		return Model.model(name);
	};

	Model.prototype.schema = schema;
	Model.prototype.modelName = name;

	Model.db = db;
	Model.schema = schema;
	Model.modelName = name;

	Model.model = function(name) {
		return models[name];
	};

	Model.hydrate = function(doc) {
		var model = Object.create(Model.prototype);
		return Document.prototype.init.call(model, doc, schema.paths);
	};

	Model.create = function(docs, callback) {
		var Class = this;
		var promise = new Promise(callback);
		var onResolve = promise.resolve.bind(promise);

		function create(doc, callback) {
			return new Class(doc).save(callback);
		}

		if(Array.isArray(docs)) {
			async.each(docs, create, onResolve);
		} else {
			create(docs, onResolve);
		}
		return promise;
	};

	Model.populate = function(docs, options, callback) {
		var promise = new Promise(callback);

		if(Array.isArray(options)) {
			options = options.map(function(option) {
				return Object.assign({ model: Model.modelName }, option);
			});
		} else {
			options = [ Object.assign({ model: Model.modelName }, options) ];
		}

		var singletons = Promise.all(
			options.reduce(function(promises, option) {
				var Reference = Model.model(option.model);
				var params = docs.reduce(function(params, doc) {
					if(doc[option.path]) {
						params.push(doc[option.path]);
					}
					return params;
				}, [ ]);

				if(params.length) {
					promises.push(
						Reference.find({ })
							.where({ $in: params })
							.exec()
					);
				} else {
					promises.push( new Promise().fulfill([ ]) );
				}

				return promises;
			}, [ ])
		).then(function(collections) {
			options.forEach(function(option, index) {
				docs.forEach(function(doc) {
					if(!Array.isArray(doc.schema.paths[option.path])) {
						doc[option.path] = collections[index].find(function(item) {
							return doc[option.path] == item.id;
						});
					}
				});
			});
		});

		var arrays = Promise.all(
			docs.reduce(function(promises, doc) {
				var promise = Promise.all(
					options.reduce(function(promises, option) {
						if(Array.isArray(doc.schema.paths[option.path])) {
							var Reference = Model.model(option.model);
							var path = Object.keys(Reference.schema.paths).find(function(path) {
								return Reference.schema.paths[path].ref == doc.modelName;
							}, this);

							if(path) {
								promises.push(
									Reference.find({ })
										.where(path, doc.id)
										.exec()
								);
							} else {
								var table = '__' + ( doc.modelName.localeCompare(Reference.modelName) > 0 ? Reference.modelName + '_' + doc.modelName : doc.modelName + '_' + Reference.modelName ) + '__';

								promises.push(
									Reference.find({ })
										.join(table).on('_id', Reference.modelName.toLowerCase() + '_id')
										.where(doc.modelName.toLowerCase() + '_id', doc.id, table)
										.exec()
								);
							}
						} else {
							promises.push( new Promise().fulfill([ ]) );
						}

						return promises;
					}, [ ])
				);

				promises.push(promise);
				return promises;
			}, [ ])
		).then(function(collections) {
			docs.forEach(function(doc, index) {
				options.forEach(function(option, opt) {
					if(Array.isArray(doc.schema.paths[option.path])) {
						doc[option.path] = collections[index][opt];
					}
				});
			});
		});

		Promise.all([
			singletons,
			arrays
		]).onResolve(function(err) {
			promise.resolve(err, docs);
		});

		return promise;
	};

	Model.find = function(params, callback) {
		var Class = this;
		var query = new Query.Select(Class);

		for(var column in schema.paths) {
			query.select(column);
		}
		for(var param in params) {
			switch(param) {
				case '$and':
					query.and(params[param]);
					break;
				case '$or':
					query.or(params[param]);
					break;
				default:
					query.where(param, params[param]);
					break;
			}
		}

		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};

	Model.findOne = function(params, callback) {
		var Class = this;
		var query = Class.find(params).limit(1);

		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};

	Model.findById = function(id, callback) {
		var Class = this;
		var params = { };
		params[primary] = id;
		return Class.findOne(params, callback);
	};

	Model.remove = function(params, callback) {
		var Class = this;
		var query = new Query.Delete(Class);

		for(var param in params) {
			switch(param) {
				case '$and':
					query.and(params[param]);
					break;
				case '$or':
					query.or(params[param]);
					break;
				default:
					query.where(param, params[param]);
					break;
			}
		}

		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
	};

	return Model;
}

module.exports = function(name, schema, db) {
	if(schema) {
		var Model = model(name, schema, db);
		models[name] = Model;
		return Model;
	} else {
		return models[name];
	}
};
