/* global module */
module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		jshint: {
			src: [
				"**/*.js", "!{node_modules,dev}/**"
			],
			options: {
				jshintrc: ".jshintrc"
			}
		}
	});

	// Load plugins
	grunt.loadNpmTasks("grunt-contrib-jshint");

	// Aliases
	grunt.registerTask("default", ["jshint"]);
};