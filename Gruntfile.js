module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			options: { },
			development: {
				src: ['index.js', 'lib/**/*.js', 'Gruntfile.js', 'test/**/*.js']
			}
		},
		nodeunit: {
			options: { },
			development: {
				src: ['test/**/*.js', '!test/mock/**/*.js']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');

	grunt.registerTask('default', ['jshint', 'nodeunit']);
};
