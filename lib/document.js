function Document(doc, fields) {
	this.init(doc, fields);

	Object.keys(fields).forEach(function(path) {
		this.markModified(path);
	}, this);
}

Document.prototype.init = function(doc, fields) {
	function getter(prop, self) {
		return function() {
			return this.__$columns[prop];
		};
	}

	function setter(prop, self) {
		return function(v) {
			self.__$columns[prop] = v;
			self.__$modified[prop] = true;
		};
	}

	this.__$modified =
		Object.keys(fields).filter(function(path) {
			return path in doc;
		}).reduce(function(modified, path) {
			modified[path] = false;
			return modified;
		}, { });

	if(fields) {
		this.__$columns =
			Object.keys(fields).filter(function(path) {
				return path in doc;
			}).reduce(function(columns, path) {
				columns[path] = doc[path];
				return columns;
			}, { });
	} else {
		this.__$columns = doc;
	}

	Object.defineProperty(this, 'id', {
		get: getter('_id', this),
		set: setter('_id', this)
	});

	for(var prop in fields) {
		Object.defineProperty(this, prop, {
			get: getter(prop, this),
			set: setter(prop, this)
		});
	}

	return this;
};

Document.prototype.get = function(path) {
	return this.__$columns[path];
};

Document.prototype.markModified = function(path) {
	if(path in this.__$modified) {
		this.__$modified[path] = true;
	}
};

Document.prototype.isModified = function(path) {
	if(path) {
		return this.__$modified[path];
	} else {
		for(path in this.__$modified) {
			if(this.__$modified[path]) {
				return true;
			}
		}
		return false;
	}
};

Document.prototype.modifiedPaths = function() {
	return Object.keys(this.__$modified).filter(function(path) {
		return this.__$modified[path];
	}, this);
};

module.exports = Document;
