var MySquirrel = require('./lib/mysquirrel.js');
var Schema = require('./lib/schema.js');
var async = require('async');

exports.createConnection = function(arg) {
	return new MySquirrel(arg);
};

exports.connect = function(arg, callback) {
	var connection = new MySquirrel(arg);
	connection.on('open', function() {
		exports.connection = connection;
		if(callback) callback(null);
	});
	connection.on('error', function(err) {
		if(callback) callback(err);
		callback = null;
	});
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
