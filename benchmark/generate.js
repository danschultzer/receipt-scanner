#!/usr/bin/env node

var program = require('commander')
var screenshot = require('screenshot-stream')
var gm = require('gm').subClass({ imageMagick: true })
var fs = require('fs')
var path = require('path')

function generate (options) {
  var number = options.number || 20
  var index = 0
  var json = { data: [] }
  var imageOptions = randomizeOptions(number)
  var destDir = path.join(__dirname, 'testdata')

  try {
    fs.unlinkSync(destDir)
  } catch (e) {}

  try {
    fs.mkdirSync(destDir)
  } catch (e) {}

  for (var i = 0; i < number; i++) {
    var stream = renderHTMLPage(`file://${__dirname}/receipt.html`);
    (function (i, index) {
      processStream(stream, path.join(destDir, `receipt-${index}.jpg`), imageOptions[i], function (error) {
        if (error) throw error
        json.data.push({
          path: `receipt-${index}.jpg`,
          results: {
            amount: '698.00',
            date: '2016-04-25'
          }
        })
        if (json.data.length >= number) {
          fs.writeFile(path.join(destDir, 'data.json'), JSON.stringify(json, null, 2), 'utf8')
          console.log('All saved')
        }
      })
    })(i, index)
    index++
  }
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
  return biasedValue(-25, 25, 0)
}

function shouldAdd (bias) {
  bias = bias || 0.5
  return Math.random() < bias
}

function biasedWashout () {
  var blackPoint = biasedValue(-25, 25, 2)
  var whitePoint = biasedValue(75, 100, 90)
  var gamma = biasedValue(0.8, 2.3, 2.0)

  return [`${blackPoint}%`, `${whitePoint}%`, gamma]
}

function biasedImplode () {
  return biasedValue(-0.2, 0.2, 0)
}

// From http://stackoverflow.com/a/29325222/939535
function biasedValue (min, max, bias, influence) {
  influence = influence || 1
  var random = Math.random() * (max - min) + min
  var mix = Math.random() * influence
  return random * (1 - mix) + bias * mix
}

function renderHTMLPage (url, cb) {
  return screenshot(url, '772x1222', { crop: true, selector: '.receipt', scale: 2 })
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

program
  .usage('[options]')
  .option('-a, --amount <n>', 'Number of images')
  .parse(process.argv)

generate({ number: program.amount })
