function Document(doc, fields) {
	this.init(doc, fields);

	Object.keys(fields).forEach(function(path) {
		this.markModified(path);
	}, this);
}

Document.prototype.init = function(doc, fields) {
	var modified, columns;

	function getter(prop) {
		return function() {
			return columns[prop];
		};
	}

	function setter(prop) {
		return function(v) {
			columns[prop] = v;
			modified[prop] = true;
		};
	}

	modified =
		Object.keys(fields).filter(function(path) {
			return path in doc;
		}).reduce(function(modified, path) {
			modified[path] = false;
			return modified;
		}, { });

	if(fields) {
		columns =
			Object.keys(fields).filter(function(path) {
				return path in doc;
			}).reduce(function(columns, path) {
				columns[path] = doc[path];
				return columns;
			}, { });
	} else {
		columns = doc;
	}

	for(var prop in fields) {
		Object.defineProperty(this, prop, {
			get: getter(prop),
			set: setter(prop)
		});
	}

	this.get = function(path) {
		return columns[path];
	};

	this.markModified = function(path) {
		if(path in modified) {
			modified[path] = true;
		}
	};

	this.isModified = function(path) {
		return modified[path];
	};

	this.modifiedPaths = function() {
		return Object.keys(modified).filter(function(path) {
			return modified[path];
		});
	};

	return this;
};

module.exports = Document;
