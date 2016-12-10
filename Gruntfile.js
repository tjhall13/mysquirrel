module.exports = function(grunt) {
	grunt.initConfig({
	  jshint: {
			options: {
				jshintrc: true
			},
	    dev: {
	      src: ['index.js', 'lib/*.js', 'lib/**/*.js', 'test/*.js', 'test/**/*.js']
      }
    },
		nodeunit: {
			all: ['test/*.js', 'test/**/*.js', '!test/mock/*.js']
		},
		sloc: {
			all: {
				options: {
					reportDetail: true
				},
				files: {
					'./': ['index.js', 'lib/*.js', 'lib/**/*.js'],
					'test/': ['*.js', '**/*.js']
				}
			}
		}
	});

  grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-sloc');


	grunt.registerTask('default', [
	  'jshint',
	  'nodeunit',
	  'sloc:all'
  ]);
};
