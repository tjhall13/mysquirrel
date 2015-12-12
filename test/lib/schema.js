var proxyquire	= require('proxyquire'),
	model		= require('../mock/model.js');

function PATH(file) {
	var folder = process.env.MYSQUIRREL_COV ? 'lib-cov/' : 'lib/';
	return '../../' + folder + file;
}

var Schema = proxyquire(PATH('schema.js'), {
	'./model.js': model.proxy
});

module.exports = {
	describe: {
		self: {
			auto: function(test) {
				var schema = new Schema({
					name: String,
					age: Number,
					email: { type: String, unique: true }
				});
				var description = schema._describe();
				test.deepEqual(
					description,
					{
						name: {
							required: false,
							unique: false,
							properties: [],
							type: 'VARCHAR'
						},
						age: {
							required: false,
							unique: false,
							properties: [],
							type: 'INTEGER'
						},
						email: {
							required: false,
							unique: true,
							properties: [],
							type: 'VARCHAR',
							size: 100
						},
						_id: {
							type: 'INTEGER',
							key: 'PRIMARY',
							unique: true,
							required: true,
							properties: [ 'AUTO_INCREMENT' ]
						} 
					}
				);
				test.done();
			},
			manual: function(test) {
				var schema = new Schema({
					num: Schema.Types.ObjectId,
					name: String,
					age: Number,
					email: { type: String, unique: true }
				});
				var description = schema._describe();
				test.deepEqual(
					description,
					{
						name: {
							required: false,
							unique: false,
							properties: [],
							type: 'VARCHAR'
						},
						age: {
							required: false,
							unique: false,
							properties: [],
							type: 'INTEGER'
						},
						email: {
							required: false,
							unique: true,
							properties: [],
							type: 'VARCHAR',
							size: 100
						},
						num: {
							type: 'INTEGER',
							key: 'PRIMARY',
							unique: true,
							required: true,
							properties: [ 'AUTO_INCREMENT' ]
						} 
					}
				);
				test.done();
			}
		}
	}
};
