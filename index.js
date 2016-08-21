var MySquirrel = require('./lib/mysquirrel.js');
var Schema = require('./lib/schema.js');
var Promise = require('./lib/promise.js');
var async = require('async');

exports.createConnection = function(arg, options) {
	return new MySquirrel(arg).init(options);
};

exports.connect = function(arg, options, callback) {
	if(typeof options == 'function') {
		callback = options;
		options = { };
	}
	var connection = new MySquirrel(arg);
	connection.on('open', function() {
		exports.connection = connection;
		if(callback) callback(null);
	});
	connection.on('error', function(err) {
		if(callback) callback(err);
		callback = null;
	});
	connection.init(options);
};

exports.end = function() {
	if(exports.connection) {
		exports.connection.end();
	}
};

exports.model = function(name, schema) {
	if(exports.connection) {
		return exports.connection.model(name, schema);
	} else {
		return MySquirrel.model(name, schema);
	}
};

exports.Schema = Schema;
exports.Promise = Promise;
