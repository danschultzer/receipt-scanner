#!/usr/bin/env node

var program = require('commander'),
  fs = require('fs'),
  progress = require('progress'),
  scanner = require('./main');

function action(paths, options) {
  var format = options.format || 'json',
    hideProgressBar = !options.progress,
    verbose = options.verbose,
    summary = options.summary,
    response = [],
    files = [],
    percentages = [],
    startTime = new Date();

  // https://gist.github.com/kethinov/6658166
  var walkSync = function(dir, filelist) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      if (fs.statSync(dir + '/' + file).isDirectory()) {
        filelist = walkSync(dir + '/' + file, filelist);
      } else {
        filelist.push(dir + '/' + file);
      }
    });
    return filelist;
  };

  paths = paths.filter(function(element, index, array) {
    try {
        fs.accessSync(element, fs.F_OK);
        return true;
    } catch (e) {
      console.log('Warning: File or directory "' + element + '" does not exist.');
    }
  });

  // Read all paths
  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (fs.lstatSync(path).isDirectory()) {
      files.push.apply(files, walkSync(path));
    } else {
      files.push(path);
    }
  }

  if (files.length === 0)
    throw new Error('No files were found.');

  files = files.filter(function(element, index, array) {
    return (['pdf', 'jpeg', 'jpg', 'gif', 'png', 'bmp'].indexOf(element.split('.').pop().toLowerCase()) !== -1);
  });

  if (files.length === 0) {
    throw new Error('No image or PDF files could be found.');
  }

  var stderr = process.stderr,
    bar = new progress('Parsing :current/:total |:bar| :elapseds', {
    complete: '\u2591',
    incomplete: ' ',
    width: 35,
    total: files.length,
    clear: !hideProgressBar,
    stream: hideProgressBar ? function() {} : stderr
  });

  function updateProgressBar() {
    bar.update(percentages.reduce(function(a, b) {
      return a + b;
    }, 0) / files.length);
  }

  var interval = setInterval(function() {
    updateProgressBar();

    if (bar.complete)
      clearInterval(interval);
  }, 300);

  var filesDone = [];

  for (var j = 0; j < files.length; j++) {
    var file = files[i],
      filename = file,
      stream = fs.createReadStream(file);

    filesDone[i] = false;

    (function(filename, index) {
      percentages[index] = 0;
      scanner(stream)
        .setVerbose(verbose)
        .logger(function(message) {
          stderr.clearLine();
          stderr.cursorTo(0);
          stderr.write(message);
          stderr.write('\n');
          bar.render();
        })
        .ticker(function(percent) {
          percentages[index] = percent;
          updateProgressBar();
        })
        .parse(function(error, details) {
          filesDone[index] = true;

          if (error) {
            response[filename] = {
              'error': error.message || error
            };
          } else {
            if (!verbose) delete details.verboseText;
            response[filename] = details;
          }

          if (filesDone.every(function(element) {
              return element;
            })) {
            if (format === 'json') {
              console.log(JSON.stringify(sortResponse(response), null, 4));
            } else {
              console.log(response);
            }

            if (summary) {
              statisticsObject = statistics(response);
              console.log('\n---------\nI was able to parse ' +
                (statisticsObject.total / files.length * 100).toFixed(1) +
                '% (' + statisticsObject.total + ') of the ' + files.length + ' file(s) in ' + ((new Date() - startTime) / 1000).toFixed(1) + 's.\n' +
                (statisticsObject.amount / files.length * 100).toFixed(1) +
                '% (' + statisticsObject.amount + ') amounts and ' +
                (statisticsObject.date / files.length * 100).toFixed(1) +
                '% (' + statisticsObject.date + ') dates could be parsed.\n---------\n');
            }
          }
        });

    }(filename, i));
  }
}

function sortResponse(response) {
  var keys = Object.keys(response);

  naturalSort(keys);

  var sorted = {};

  for (var i = 0; i < keys.length; i++) {
    sorted[keys[i]] = response[keys[i]];
  }

  return sorted;
}


// http://stackoverflow.com/a/2802804
function naturalSort(ar, index) {
  var L = ar.length,
    i, who, next,
    isi = typeof index === 'number',
    rx = /(\.\d+)|(\d+(\.\d+)?)|([^\d.]+)|(\.(\D+|$))/g;

  function nSort(aa, bb) {
    var a = aa[0],
      b = bb[0],
      a1, b1, i = 0,
      n, L = a.length;
    while (i < L) {
      if (!b[i])
        return 1;
      a1 = a[i];
      b1 = b[i++];
      if (a1 !== b1) {
        n = a1 - b1;
        if (!isNaN(n))
          return n;
        return a1 > b1 ? 1 : -1;
      }
    }
    return b[i] !== undefined ? -1 : 0;
  }
  for (i = 0; i < L; i++) {
    who = ar[i];
    next = isi ? ar[i][index] || '' : who;
    ar[i] = [String(next).toLowerCase().match(rx), who];
  }
  ar.sort(nSort);
  for (i = 0; i < L; i++) {
    ar[i] = ar[i][1];
  }
}

function statistics(objects) {
  var countTotal = 0,
    countAmount = 0,
    countDate = 0;
  for (var key in objects) {
    var object = objects[key];
    if (!object.error) {
      if (object.amount && object.date) {
        ++countTotal;
      }
      if (object.date) {
        ++countDate;
      }
      if (object.amount) {
        ++countAmount;
      }
    }
  }
  totalLength = Object.keys(objects).length;
  return {
    total: countTotal,
    amount: countAmount,
    date: countDate
  };
}

program
  .arguments('<path...>')
  .option('-f, --format <format>', 'format to return, json (default) or text')
  .option('-p, --progress', 'add a progress bar')
  .option('-s, --summary', 'show summary details')
  .option('-v, --verbose', 'show verbose information')
  .action(action)
  .parse(process.argv);
