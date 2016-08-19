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

		Promise.all(
			options.map(function(option) {
				var Reference = Model.model(option.model);

				var params = docs.reduce(function(params, doc) {
					if(doc[option.path]) {
						params.push(doc[option.path]);
					}
					return params;
				}, [ ]);

				return Reference.find({ })
					.where('_id').in(params)
					.exec();
			})
		).then(function(collections) {
			collections.forEach(function(collection, index) {
				var path = options[index].path;

				docs.forEach(function(doc) {
					doc[path] = collection.find(function(item) {
						return doc[path] == item.id;
					});
				});
			});

			promise.fulfill(docs);
		}, function(err) {
			promise.error(err);
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
			query.where(param, params[param]);
		}

		if(callback) {	
			return query.exec(callback);
		} else {
			return query;
		}
	};

	Model.findOne = function(params, callback) {
		var Class = this;
		var query = Class.find(params);
		query.limit(1);

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
