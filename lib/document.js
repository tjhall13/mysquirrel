function Document(doc, fields) {
	this.init(doc, fields);

	Object.keys(fields).forEach(function(path) {
		this.markModified(path);
	}, this);
}

Document.prototype.init = function(doc, fields) {
	this.$__modified =
		Object.keys(fields).filter(function(path) {
			return path in doc;
		}).reduce(function(modified, path) {
			modified[path] = false;
			return modified;
		}, { });

	if(fields) {
		this.$__columns =
			Object.keys(fields).filter(function(path) {
				return path in doc;
			}).reduce(function(columns, path) {
				columns[path] = doc[path];
				return columns;
			}, { });
	} else {
		this.$__columns = doc;
	}

	this.$__initial = { };

	for(var path in this.$__columns) {
		if(Array.isArray(fields[path])) {
			this.$__initial[path] = this.$__columns[path] ? this.$__columns[path].map(function(e) { return e.id; }) : null;
		} else {
			this.$__initial[path] = this.$__columns[path];
		}
	}

	return this;
};

Document.prototype.get = function(path) {
	return this.$__columns[path];
};

Document.prototype.set = function(path, value) {
  this.$__columns[path] = value;
  this.$__modified[path] = true;
};

Document.prototype.markModified = function(path) {
	if(path in this.$__modified) {
		this.$__modified[path] = true;
	}
};

Document.prototype.isModified = function(path) {
	if(path) {
		return this.$__modified[path];
	} else {
		for(path in this.$__modified) {
			if(this.$__modified[path]) {
				return true;
			}
		}
		return false;
	}
};

Document.prototype.modifiedPaths = function() {
	return Object.keys(this.$__modified).filter(function(path) {
		return this.$__modified[path];
	}, this);
};

Document.prototype.toObject = function() {
  return Object.assign({ }, this.$__columns);
};

Document.prototype.toString = function() {
	return this.$__columns.toString();
};

module.exports = Document;
