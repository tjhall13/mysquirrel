var Model = require('./model');

var Types = {
	ObjectId: function() { },
	Mixed: function() { }
};

function describeField(param) {
	var output;
	if(typeof param == 'object') {
		if(Array.isArray(param)) {
			if(param.length == 1) {
				output = { type: 'array', table: describeField(param[0]) };
			} else {
				throw new Error('Unsupported type: ', param);
			}
		} else {
			output = describeField(param.type);
			output.default = 'default' in param ? param.default : output.default;
			output.required = 'required' in param ? param.required : output.required;
			output.unique = 'unique' in param ? param.unique : output.unique;
			// Type specific parameters
			switch(output.type) {
				case 'INTEGER':
					output.min = 'min' in param ? param.min : undefined;
					output.max = 'max' in param ? param.max : undefined;
					break;
				case 'VARCHAR':
					output.size = 'size' in param ? param.size : 100;
					break;
			}
		}
	} else if(typeof param == 'function') {
		output = {
			required: false,
			unique: false,
			properties: []
		};
		switch(param) {
			case Number:
				output.type = 'INTEGER';
				break;
			case String:
				output.type = 'VARCHAR';
				break;
			case Buffer:
				output.type = 'BLOB';
				break;
			case Boolean:
				output.type = 'BOOL';
				break;
			case Date:
				output.type = 'DATETIME';
				break;
			case Types.ObjectId:
				output.type = 'INTEGER';
				output.key = 'PRIMARY';
				output.unique = true;
				output.required = true;
				output.properties.push('AUTO_INCREMENT');
				break;
			case Object:
			case Types.Mixed:
				throw new Error('Unsupported type: ' + param);
			default:
				if(Model.isModel(param)) {
					output.key = 'FOREIGN';
					output.type = 'INTEGER';
					output.table = param.modelName;
				} else {
					throw new Error('Unsupported type: ' + param);
				}
				break;
		}
	} else {
		throw new Error('Unsupported type: ' + param);
	}
	return output;
}

function Schema(description) {
	this.describe = function() {
		var output = { };
		var id = null;
		for(var field in description) {
			output[field] = describeField(description[field]);
			if(output[field].key && output[field].key == 'PRIMARY') {
				id = field;
			}
		}
		if(!id) {
			output._id = { type: 'INTEGER', key: 'PRIMARY', unique: true, required: true, properties: ['AUTO_INCREMENT'] };
		}
		return output;
	};

	this.methods = { };
}

Schema.Types = Types;

module.exports = Schema;
