#!/usr/bin/env node

var program = require('commander')
var screenshot = require('screenshot-stream')
var gm = require('gm').subClass({ imageMagick: true })
var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var rand = require('random-seed').create()
var randSeed = null
var log = console.log
var destDir = path.join(__dirname, 'testdata')

function generate (options) {
  var number = options.number || 20
  randSeed = options.seed || parseInt(Math.random() * 2147483647)
  rand.seed(randSeed)
  var json = { data: [] }
  rmDir(destDir)
  fs.mkdir(destDir, function (error) {
    if (error) throw error
    randomizeOptions(number, function (err, imageOptions) {
      if (err) throw err

      for (var i = 0; i < number + 1; i++) {
        var stream = renderHTMLPage();
        (function (i) {
          var original = i >= number
          var fileName = original ? 'original.jpg' : `receipt-${i + 1}.jpg`
          var options = original ? {} : imageOptions[i]
          processStream(stream, path.join(destDir, fileName), options, function (error) {
            if (error) throw error

            if (!original) {
              json.data.push({
                path: fileName,
                results: {
                  amount: '698.00',
                  date: '2016-04-25'
                }
              })

              if (json.data.length >= number) {
                fs.writeFileSync(path.join(destDir, 'data.json'), JSON.stringify(json, null, 2), 'utf8')
                log(chalk.green('Success! ') + number + ' sample receipt(s) has been created in ' + chalk.underline(destDir))
                log('Generated with seed number: ' + chalk.bold(randSeed))
              }
            }
          })
        })(i)
      }
    })
  })
}

function randomizeOptions (number, cb) {
  var promises = []

  for (var i = 0; i < number; i++) {
    promises.push(new Promise(function (resolve, reject) {
      randomizeOption(i, function (err, result) {
        if (err) return reject(err)

        resolve(result)
      })
    }))
  }

  Promise.all(promises).then(function (results) {
    cb(null, results)
  }, function (err) {
    cb(err)
  })
}

function randomizeOption (i, cb) {
  var promises = []

  promises.push(Promise.resolve({
    // All receipts has a bit of rotation and washout/gamma
    rotate: biasedRotation(),
    paperWashout: biasedWashout(),
    photoGamma: biasedWashout(),
    // 20% has some degree of paper imposion bend
    implode: shouldAdd(0.2) ? biasedImplode() : null,
    // 30% has some degree if paper wave bend
    wave: shouldAdd(0.3) ? biasedWave() : null
  }))

  // 20% has some lightning gradient
  if (shouldAdd(0.2)) {
    promises.push(new Promise(function (resolve, reject) {
      randomGradientLightning(i + 1, function (err, filename) {
        if (err) return reject(err)

        resolve({
          gradient: filename
        })
      })
    }))
  }

  Promise.all(promises).then(function (array) {
    // Combine all the options together
    var options = array[0]
    for (var i = 1; i < array.length; i++) {
      Object.assign(options, array[i])
    }

    cb(null, options)
  }, function (err) {
    cb(err)
  })
}

function biasedRotation () {
  // It'll mostly be straight
  return biasedRandom(-25, 25, 0)
}

function shouldAdd (bias) {
  bias = bias || 0.5
  return rand.random() < bias
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

function biasedWave () {
  var minWidth = 772 * 2
  var maxWidth = 772 * 2
  var avgWidth = 772 * 2.5
  return [biasedRandom(10, 50, 10), biasedRandom(minWidth, maxWidth, avgWidth)]
}

function randomGradientLightning (number, cb) {
  var min = 0.4
  var max = 0.8
  var random = rand.random() * (max - min) + min
  var value = 255 * random
  var filename = path.join(destDir, `gradient-${number}.jpg`)

  gm(1500, 1500).in(`gradient:rgb(${value}, ${value}, ${value})-rgb(0, 0, 0)`).write(filename, function (err) {
    cb(err, filename)
  })
}

// From http://stackoverflow.com/a/29325222/939535
function biasedRandom (min, max, bias, influence) {
  influence = influence || 1
  var random = rand.random() * (max - min) + min
  var mix = rand.random() * influence
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
  if (options.wave) imagemagick.wave(options.wave[0], options.wave[1])
  if (options.rotate) imagemagick.rotate('green', options.rotate)

  // Rotated images will touch the border, so adding another 100px margin to clear
  imagemagick.borderColor('green').border(100, 100)

  // Add gradient lightning
  if (options.gradient) {
    var newStream = imagemagick.stream('jpg')
    imagemagick = gm(newStream)
    imagemagick.compose('hardlight').composite(options.gradient)
  }

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
  .option('-s, --seed <n>', 'Seed for psuedo random generation')
  .parse(process.argv)

generate({ number: program.amount, seed: program.seed })
