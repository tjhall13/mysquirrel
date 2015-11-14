var url			= require('url'),
	util		= require('util'),
	EventEmitter= require('events'),
	mysql		= require('mysql'),
	Schema		= require('./lib/schema'),
	Model		= require('./lib/model');

function MySquirrel(arg) {
	var self = this;
	var _connection;

	params = url.parse(arg);
	if(params.protocol == 'mysql:') {
		_connection = mysql.createConnection(arg);
		if(_connection) {
			_connection.connect(function(err) {
				if(err) {
					self.emit('error', err);
				} else {
					self.emit('open');
				}
			});
		}
	} else {
		throw new Error('Unknown protocol:' + params.protocol.substr(0, params.protocol.length - 1));
	}

	function exportModel() {
		
	}

	function importModel() {
		
	}

	this.model = function(name, schema) {
		if(schema) {
			return exportModel(name, schema);
		} else {
			return importModel(name);
		}
	};
}

util.inherits(MySquirrel, EventEmitter);

MySquirrel.createConnection = function(arg) {
	return new MySquirrel(arg);
};

MySquirrel.connect = function(arg) {
	MySquirrel.connection = new MySquirrel(arg);
};

MySquirrel.Schema = Schema;

MySquirrel.model = function() {
	return MySquirrel.connection.model.apply(MySquirrel.connection, arguments);
};

module.exports = MySquirrel;
