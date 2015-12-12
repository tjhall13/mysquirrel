module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			options: { },
			development: {
				src: ['index.js', 'lib/**.js', 'Gruntfile.js', 'test/**.js']
			}
		},
		nodeunit: {
			options: { },
			development: {
				src: ['test/*.js', 'test/lib/*.js']
			}
		},
		sloc: {
			options: {
				reportDetail: true
			},
			development: {
				files: {
					'./': ['index.js', 'lib/**.js', 'test/**.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-sloc');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');

	grunt.registerTask('default', ['jshint', 'nodeunit', 'sloc']);
};
