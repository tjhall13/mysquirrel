var Document = require('./document.js');
var Promise = require('./promise.js');
var Query = require('./query.js');
var util = require('util');

var models = { };

function model(name, schema, db) {
  var primary = '_id';

	function Model(doc, fields) {
		Document.call(this, doc, fields || schema.paths);
	}
	util.inherits(Model, Document);
	Object.assign(Model.prototype, schema.methods);
	for(var virtual in schema.virtuals) {
		Object.defineProperty(Model.prototype, virtual, {
			get: schema.virtuals[virtual]._getter,
			set: schema.virtuals[virtual]._setter
		});
	}

	Model.prototype.save = function(callback) {
		var Class = this.constructor;

		var query;
		if(this.get(primary)) {
			query = new Query.Insert(Class);
		} else {
			query = new Query.Update(Class).where(primary, this.get(primary));
		}

    this.modifiedPaths().forEach(function(path) {
      if(path != primary) {
        query.column(path, this.get(path));
      }
    }, this);

		if(callback) {
			return query.exec(callback);
		} else {
			return query;
		}
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
