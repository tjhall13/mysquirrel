var SchemaTypes = {
	String: String,
	Number: Number,
	Date: Date,
	Buffer: Buffer,
	Boolean: Boolean,
	ObjectId: function() { Number.apply(this, arguments); }
};

function VirtualType() {
	this._setter = undefined;
	this._getter = undefined;
}
VirtualType.prototype.get = function(getter) {
	this._getter = getter;
	return this;
};
VirtualType.prototype.set = function(setter) {
	this._setter = setter;
	return this;
};

function Schema(definition) {
	this.keys = { };
	this.paths = { };
	this.methods = { };
	this.virtuals = { };
	this.defaults = {
		required: false,
		default: null,
		unique: false,
		attributes: []
	};

	this.add = function(obj, prefix) {
		prefix = prefix || '';
		for(var key in obj) {
			if(!obj[key]) {
				throw new TypeError('Invalid value for schema path `' + prefix + key + '`');
			}

			if(Array.isArray(obj[key])) {
				if(Array.length && obj[key][0]) {
					this.path(prefix + key, obj[key]);
				} else {
					throw new TypeError('Invalid value for schema Array path `' + prefix + key + '`');
				}
			} else if(typeof obj[key] == 'object') {
				if(obj[key].type) {
					this.path(prefix + key, obj[key]);
				} else {
					for(var subkey in obj[key]) {
						this.add(obj[key], prefix + key + '.');
					}
				}
			} else {
				this.path(prefix + key, obj[key]);
			}
		}
	};

	this.path = function(name, constructor) {
		this.paths[name] = Schema.path(constructor);
	};

	this.method = function(method, fn) {
		if(typeof method == 'object') {
			for(var name in method) {
				this.methods[name] = method[name];
			}
		} else {
			this.methods[method] = fn;
		}
	};

	this.virtual = function(path) {
		var virtual = new VirtualType();
		this.virtuals[path] = virtual;
		return virtual;
	};

	this.add(definition);
}

Schema.Types = SchemaTypes;

Schema.path = function(constructor) {
	var type;
	if(Array.isArray(constructor)) {
		return [ Schema.path(constructor[0]) ];
	} else if(typeof constructor == 'object') {
		return Object.assign({ }, this.defaults, constructor);
	} else if(typeof constructor == 'string') {
		switch(constructor) {
			case 'number':
				type = Number;
				break;
			case 'string':
				type = String;
				break;
			case 'boolean':
				type = Boolean;
				break;
			case 'buffer':
				type = Buffer;
				break;
		}
		return Object.assign({ }, this.defaults, { type: type });
	} else if(typeof constructor == 'function') {
		type = Object.keys(SchemaTypes).find(function(func) {
			return SchemaTypes[func] == constructor;
		});
		if(type) {
			return Object.assign({ }, this.defaults, { type: type });
		} else {
			throw new TypeError('Unknown type `' + constructor.name + '`');
		}
	} else {
		throw new TypeError('Argument `constructor` must be an object, string, or function');
	}
};

module.exports = Schema;
