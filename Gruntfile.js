module.exports = function(grunt) {
	grunt.initConfig({
		env: {
			build: {
				MYSQUIRREL_COV: 1,
				COVERALLS_SERVICE_NAME: 'grunt',
				COVERALLS_REPO_TOKEN: 'bq0BlEPR7JMTSZlJs7eraNNvk3CSa4Res'
			}
		},
		jshint: {
			all: {
				src: ['Gruntfile.js', 'index.js', 'lib/**.js', 'test/**.js']
			}
		},
		instrument: {
			build: {
				expand: true,
				cwd: 'lib/',
				src: ['**.js'],
				dest: 'lib-cov/'
			}
		},
		nodeunit: {
			build: {
				options: {
					reporter: 'lcov',
					reporterOutput: '.tmp/mysquirrel.lcov'
				},
				src: ['test/lib/*.js']
			},
			development: {
				options: {
					reporter: 'default',
				},
				src: ['test/*.js', 'test/lib/*.js']
			}
		},
		coveralls: {
			build: {
				src: '.tmp/mysquirrel.lcov'
			}
		},
		sloc: {
			all: {
				options: {
					reportDetail: true
				},
				files: {
					'./': ['index.js', 'lib/**.js', 'test/**.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-instrument');
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-coveralls');
	grunt.loadNpmTasks('grunt-sloc');

	grunt.registerTask('default', [
		'jshint:all',
		'nodeunit:development',
		'sloc:all'
	]);
	grunt.registerTask('build', [
		'jshint:all',
		'instrument:build',
		'env:build',
//		'nodeunit:build',
//		'coveralls:build',
		'sloc:all'
	]);
};
