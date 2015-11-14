module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			options: { },
			development: {
				src: ['index.js', 'lib/**/*.js', 'Gruntfile.js']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', ['jshint']);
};
