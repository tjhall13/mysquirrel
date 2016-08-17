var EventEmitter = require('events');
var mysql = require('mysql');
var async = require('async');
var util = require('util');
var url = require('url');

var Query = require('./query.js');
var model = require('./model.js');

function SchemaError(name) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = 'Schema mismatch: ' + name;
}
util.inherits(SchemaError, Error);

var queue = [];

function MySquirrel(arg) {
	EventEmitter.call(this);
	var db = mysql.createPool(arg);

	function attributes(desc) {
		var attr = {
			properties: []
		};

		switch(desc.type) {
			case String:
				attr.type = 'VARCHAR';
				break;
			case Number:
				attr.type = 'INTEGER';
				break;
			case Date:
				attr.type = 'DATETIME';
				break;
		}

		if(desc.default) {
			switch(desc.type) {
				case Date:
					if(desc.default == Date.now) {
						attr.default = 'CURRENT_TIMESTAMP';
					}
					break;
				default:
					attr.default = desc.default;
					break;
			}
		}

		if(desc.size) {
			attr.size = desc.size;
		} else {
			switch(desc.type) {
				case String:
					attr.size = 150;
					break;
			}
		}

		attr.required = desc.required ? true : false;

		if(desc.unique) {
			attr.properties.push('UNIQUE');
		}

		return attr;
	}

	function describe(attr) {
		var desc = {
			attributes: []
		};

		var definition = attr.Type.match(/([a-zA-Z]+)(?:\(([0-9]+)\))?/);
		var type = definition[1].toLowerCase();
		var size = definition[2];

		switch(type) {
			case 'varchar':
				desc.type = String;
				break;
			case 'integer':
			case 'int':
				desc.type = Number;
				break;
			case 'datetime':
				desc.type = Date;
				break;
		}

		switch(type) {
			case 'datetime':
				if(attr.Default == 'CURRENT_TIMESTAMP') {
					desc.default = Date.now;
				}
				break;
			default:
				desc.default = attr.Default;
				break;
		}

		desc.size = attr.Size;
		desc.required = attr.Null != 'YES';
		desc.unique = false;

		return desc;
	}

	function assert(name, model, database) {
		for(var path in model) {
			for(var property in model[path]) {
				if(Array.isArray(model[path][property]) && Array.isArray(database[path][property])) {
					if(model[path][property].length == database[path][property].length) {
						for(var i = 0; i < model[path][property].length; i++) {
							if(!database[path][property].includes(model[path][property][i])) {
								throw new SchemaError(name);
							}
						}
					} else {
						throw new SchemaError(name);
					}
				} else {
					if(model[path][property] != database[path][property]) {
						throw new SchemaError(name);
					}
				}
			}
		}
	}

	function done(err) {
		if(err) {
			this.emit('error', err);
			db.end();
		} else {
			var Model;

			while(queue.length) {
				Model = queue.pop();
				Model.db = db;
			}
			this.emit('open');
		}
	}

	function process(Model, callback) {
		db.query('SHOW TABLES LIKE ?;', [ Model.modelName ], function(err, result) {
			if(result.length) {
				// Import schema from db
				db.query('DESCRIBE ??;', [ Model.modelName ], function(err, result) {
					if(err) {
						callback(err);
					} else {
						var paths = result.reduce(function(desc, attr) {
							desc[attr.Field] = describe(attr);
							return desc;
						}, { });

						try {
							assert(Model.modelName, Model.schema.paths, paths);
							callback();
						} catch(e) {
							callback(e);
						}
					}
				});
			} else {
				// Export schema to db
				var query = new Query.Create(db, Model.modelName);
				for(var path in Model.schema.paths) {
					query.column(path, attributes(Model.schema.paths[path]));
				}
				query.exec(callback);
			}
		});
	}

//	async.eachSeries(queue, process.bind(this), done.bind(this));
	done.call(this);

	this.model = function(name, schema) {
		return model(name, schema, db);
	};

	this.end = function() {
		db.end(this.emit.bind(this, 'close'));
	};
}
util.inherits(MySquirrel, EventEmitter);

MySquirrel.model = function(name, schema) {
	var Model = model(name, schema);
	queue.push(Model);
	return Model;
};

module.exports = MySquirrel;
