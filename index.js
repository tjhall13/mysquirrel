var url			= require('url'),
	util		= require('util'),
	EventEmitter= require('events'),
	mysql		= require('mysql'),
	Schema		= require('./lib/schema'),
	Model		= require('./lib/model');

var queue = [];

function MySquirrel(arg, callback) {
	var self = this;
	var _connection;

	params = url.parse(arg);
	if(params.protocol == 'mysql:') {
		_connection = mysql.createConnection(arg);
		if(_connection) {
			_connection.connect(function(err) {
				if(callback) {
					if(err) {
						callback.call(null);
					} else {
						callback.call(self);
					}
				}
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

	function importModel(name) {
		
	}

	this.model = function(name, schema) {
		return Model(_connection, name, schema);
	};

	this.end = function() {
		_connection.end(function(err) {
			self.emit('close', err);
		});
	};
}
util.inherits(MySquirrel, EventEmitter);

MySquirrel.createConnection = function(arg) {
	return new MySquirrel(arg);
};

MySquirrel.connect = function(arg) {
	MySquirrel.connection = new MySquirrel(arg, function() {
		if(this) {
			queue.forEach(function(callback) {
				this[callback.func].apply(this, callback.args);
			});
		}
	});
};

MySquirrel.end = function() {
	if(MySquirrel.connection) {
		MySquirrel.connection.end();
	} else {
		queue.push({
			func: 'end',
			args: []
		});
	}
};

MySquirrel.Schema = Schema;

MySquirrel.model = function() {
	if(MySquirrel.connection) {
		return MySquirrel.connection.model.apply(MySquirrel.connection, arguments);
	} else {
		queue.push({
			func: 'model',
			args: arguments
		});
	}
};

module.exports = MySquirrel;
