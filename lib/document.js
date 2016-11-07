function Document(doc, fields) {
	this.init(doc, fields);

	Object.keys(fields).forEach(function(path) {
		this.markModified(path);
	}, this);
}

Document.prototype.init = function(doc, fields) {
	function getter(prop, self) {
		return function() {
			return self.$__columns[prop];
		};
	}

	function setter(prop, self) {
		return function(v) {
			self.$__columns[prop] = v;
			self.$__modified[prop] = true;
		};
	}

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

	Object.defineProperty(this, 'id', {
		get: getter('_id', this),
		set: setter('_id', this)
	});

	for(var path in this.$__columns) {
		if(Array.isArray(fields[path])) {
			this.$__initial[path] = this.$__columns[path] ? this.$__columns[path].map(function(e) { return e.id; }) : null;
		} else {
			this.$__initial[path] = this.$__columns[path];
		}

		Object.defineProperty(this, path, {
			get: getter(path, this),
			set: setter(path, this)
		});
	}

	return this;
};

Document.prototype.get = function(path) {
	return this.$__columns[path];
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

Document.prototype.toString = function() {
	return this.$__columns.toString();
};

module.exports = Document;
