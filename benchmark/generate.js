#!/usr/bin/env node

var program = require('commander')
var screenshot = require('screenshot-stream')
var gm = require('gm').subClass({ imageMagick: true })
var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var log = console.log

function generate (options) {
  var number = options.number || 20
  var json = { data: [] }
  var imageOptions = randomizeOptions(number)
  var destDir = path.join(__dirname, 'testdata')

  rmDir(destDir)
  fs.mkdir(destDir, function (error) {
    if (error) throw error

    for (var i = 0; i < number; i++) {
      var stream = renderHTMLPage();
      (function (i) {
        var fileName = `receipt-${i + 1}.jpg`
        processStream(stream, path.join(destDir, fileName), imageOptions[i], function (error) {
          if (error) throw error

          json.data.push({
            path: fileName,
            results: {
              amount: '698.00',
              date: '2016-04-25'
            }
          })

          if (json.data.length >= number) {
            fs.writeFile(path.join(destDir, 'data.json'), JSON.stringify(json, null, 2), 'utf8')
            log(chalk.green('Success! ') + number + ' sample receipt(s) has been created in ' + chalk.underline(destDir))
          }
        })
      })(i)
    }
  })
}

function randomizeOptions (number) {
  var options = []
  for (var i = 0; i < number; i++) {
    options.push({
      // All receipts has a bit of rotation and washout/gamma
      rotate: biasedRotation(),
      paperWashout: biasedWashout(),
      photoGamma: biasedWashout(),
       // 20% has some degree of paper bend
      implode: shouldAdd(0.2) ? biasedImplode() : null
    })
  }

  return options
}

function biasedRotation () {
  // It'll mostly be straight
  return biasedRandom(-25, 25, 0)
}

function shouldAdd (bias) {
  bias = bias || 0.5
  return Math.random() < bias
}

function biasedWashout () {
  var blackPoint = biasedRandom(-25, 25, 2)
  var whitePoint = biasedRandom(75, 100, 90)
  var gamma = biasedRandom(0.8, 2.3, 2.0)

  return [`${blackPoint}%`, `${whitePoint}%`, gamma]
}

function biasedImplode () {
  return biasedRandom(-0.2, 0.2, 0)
}

// From http://stackoverflow.com/a/29325222/939535
function biasedRandom (min, max, bias, influence) {
  influence = influence || 1
  var random = Math.random() * (max - min) + min
  var mix = Math.random() * influence
  return random * (1 - mix) + bias * mix
}

function renderHTMLPage () {
  return screenshot(`file://${__dirname}/receipt.html`, '772x1222', { crop: true, selector: '.receipt', scale: 2 })
}

function processStream (stream, out, options, cb) {
  var imagemagick = gm(stream)
  // Setting up green as the transparent color
  imagemagick.transparent('green').background('green')

  if (options.paperWashout) imagemagick.level(options.paperWashout.join(',')) // Washout the paper
  if (options.photoGamma) imagemagick.level(options.photoGamma.join(',')) // Washout the photo
  if (options.implode) imagemagick.implode(options.implode)
  if (options.rotate) imagemagick.rotate('green', options.rotate)

  // Rotated images will touch the border, so adding another 100px margin to clear
  imagemagick.borderColor('green').border(100, 100)

  imagemagick.write(out, function (error) {
    cb(error)
  })
}

function rmDir (dirPath) {
  try {
    var files = fs.readdirSync(dirPath)
  } catch (e) { return }
  if (files.length > 0) {
    for (var i = 0; i < files.length; i++) {
      var filePath = path.join(dirPath, files[i])
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath)
      } else {
        rmDir(filePath)
      }
    }
  }
  fs.rmdirSync(dirPath)
};

program
  .usage('[options]')
  .option('-a, --amount <n>', 'Number of images')
  .parse(process.argv)

generate({ number: program.amount })
