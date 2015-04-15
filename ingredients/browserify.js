var utilities = require('./commands/Utilities');
var source = require('vinyl-source-stream');
var parsePath = require('parse-filepath');
var browserify = require('browserify');
var elixir = require('laravel-elixir');
var factor = require('factor-bundle');
var babelify = require('babelify');
var gulp = require('gulp');

/**
 * Calculate the correct destination.
 *
 * @param {string} output
 */
var getDestination = function(output) {
    output = parsePath(output);

    var saveDir = output.extname
        ? output.dirname
        : (output.dirname + '/' + output.basename);

    var saveFile = output.extname ? output.basename : 'bundle.js';

    return {
        saveFile: saveFile,
        saveDir: saveDir
    }
};

/**
 * Build the Gulp task.
 *
 * @param {array}  src
 * @param {string} output
 * @param {object} options
 */
var buildTask = function(src, output, options) {
    var destination = getDestination(output);

    // log and pause
    var onError = function(e) {
      console.error('Browserify failed: '+ e);
      console.log(e.codeFrame);
      this.emit('end');
    };

    gulp.task('browserify', function() {
        var b = browserify(src, options);
        b.transform(babelify, { stage: 0 });

        // Split files in to seperate files with a common
        if(options.splitFiles) {
          options.splitFiles = options.splitFiles.map(function(file){
            return destination.saveDir +'/'+ file;
          });
          b.plugin(factor, {
              // File output order must match entry order
              output: options.splitFiles
            });
        }

        b.bundle()
          .on('error', onError)
          .pipe(source(destination.saveFile))
          .pipe(gulp.dest(destination.saveDir));
    });
};


/*
 |----------------------------------------------------------------
 | Browserify Task
 |----------------------------------------------------------------
 |
 | This task will manage your entire Browserify workflow, from
 | scratch! Also, it will channel all files through Babelify
 | so that you may use all the ES6 goodness you can stand.
 |
 */

elixir.extend('browserify', function(src, output, baseDir, options) {
    var search = '/**/*.+(js|jsx|babel)';

    baseDir = baseDir || 'resources/js';
    output = output || this.jsOutput;
    options = options || {};

    // If split files isset set the source as new files or user defined
    if(options.splitFiles) {
      options.splitFiles = (options.splitFiles === true) ? src : options.splitFiles;
    }
    src = utilities.buildGulpSrc(src, './' + baseDir, search);

    utilities.logTask('Running Browserify', src);

    buildTask(src, output, options);

    return this.registerWatcher('browserify', baseDir + search)
               .queueTask('browserify');
});
