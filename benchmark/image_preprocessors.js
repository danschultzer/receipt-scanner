#!/usr/bin/env node

var exec = require('child_process').exec
var fs = require('fs')
var chalk = require('chalk')
var scanner = require('../lib/processor')
var benchmarkDir = __dirname
var log = console.log

function benchmark (preprocessors, compareFiles) {
  var promises = []
  preprocessors.forEach(function (preprocessor) {
    log('Running testdata for ' + chalk.underline(preprocessor))

    var p = Promise.resolve([])

    compareFiles.forEach(function (file, index) {
      p = p.then(function (list) {
        return new Promise(function (resolve, reject) {
          scanner(benchmarkDir + '/receipt-scanner-testdata-master/' + file.path)
            .imagePreprocessor(preprocessor)
            .parse(function (error, results) {
              if (error) {
                reject()
                throw error
              }
              list.push({
                'index': index,
                'file': file.path,
                'results': results
              })
              resolve(list)
            })
        })
      })
    })

    promises.push(p)
  })

  return Promise.all(promises).then(function (results) {
    var resultsObj = {}
    preprocessors.forEach(function (preprocessor, index) {
      var success = results[index].filter(function (el) {
        return JSON.stringify(el.results) === JSON.stringify(compareFiles[el.index].results)
      })
      resultsObj[preprocessor] = {
        'results': results[index],
        'success': success.length,
        'total': results[index].length
      }
    })
    return resultsObj
  })
}

function extractTestData () {
  var saveAs = benchmarkDir + '/receipt-scanner-testdata-master.zip'
  return new Promise(function (resolve, reject) {
    log('Working in ' + chalk.underline(benchmarkDir))
    fs.access(saveAs, fs.F_OK, function (error) {
      if (!error) {
        return resolve(saveAs)
      }

      log('Downloading ' + chalk.underline('receipt-scanner-testdata-master.zip'), ' ...')
      var command = 'curl -o ' + saveAs + ' -z ' + saveAs + ' -L https://github.com/danschultzer/receipt-scanner-testdata/archive/master.zip'
      log('Running ' + chalk.bold(command))
      exec(command,
        {
          maxBuffer: 1024 * 1024 * 10
        },
        function (error, stdout, stderr) {
          console.log(stdout)
          console.log(stderr)
          if (error) {
            reject()
            throw error
          }
          resolve(saveAs)
        }
      )
    })
  }).then(function (saveAs) {
    return new Promise(function (resolve, reject) {
      log('Unzipping ' + chalk.underline(saveAs))
      var command = 'unzip -n ' + saveAs + ' -d ' + benchmarkDir
      log('Running ', chalk.bold(command))

      exec(command, function (error, stdout, stderr) {
        console.log(stdout)
        console.log(stderr)
        if (error) {
          reject()
          throw error
        }
        resolve()
      })
    })
  })
}

function processData () {
  return new Promise(function (resolve, reject) {
    log('Processing data')
    var imageProcessors = [
      'graphicsmagick',
      'sharp',
      'opencv',
      'imagemagick'
    ]

    fs.readFile(benchmarkDir + '/receipt-scanner-testdata-master/data.json', 'utf8', function (error, data) {
      if (error) {
        throw error
      }

      var files = JSON.parse(data).data
      benchmark(imageProcessors, files).then(function (results) {
        log('\n============================== Benchmark summary ===============================')
        imageProcessors.forEach(function (imageProcessor) {
          var padding = String('                        ').slice(0, imageProcessors.slice(0).sort(function (a, b) { return b.length - a.length })[0].length - imageProcessor.length)
          var success = results[imageProcessor].success
          var total = results[imageProcessor].total
          var rate = success / total
          var color = rate > 0.95 ? 'green' : rate > 0.85 ? 'yellow' : 'red'
          log(chalk[color](imageProcessor + padding + ': ' + (rate * 100).toFixed(1) + '% ( ' + success + '/' + total + ' )'))
        })
        log('=============================================================================\n')

        var minRate = 0.85
        var resultKeys = Object.keys(results)
        var resultValues = resultKeys.map(function (key) {
          return results[key]
        })
        var successRates = resultValues.map(function (value) {
          return value.success / value.total
        })
        var allSucceeded = successRates.every(function (rate) {
          return rate >= minRate
        })
        var avgRate = successRates.reduce(function (a, b) {
          return a + b
        }) / successRates.length
        var state = 'success'
        var description = 'Avg ' + (avgRate * 100).toFixed(1) + '%'

        if (!allSucceeded) {
          state = 'error'
          description += ', failed ' + successRates.filter(function (rate) {
            return rate < minRate
          }).map(function (rate, index) {
            return resultKeys[index] + ' (' + (rate * 100).toFixed(1) + '%)'
          }).join(', ')
        }
        fs.writeFileSync(benchmarkDir + '/github-commit-status.json', JSON.stringify({
          state: state,
          description: description.slice(0, 140),
          context: 'benchmark/image_preprocessors.js',
          target_url: 'https://travis-ci.org/danschultzer/receipt-scanner/builds/' + process.env.TRAVIS_BUILD_ID
        }))
      })
    })
  })
}

extractTestData().then(processData)
