var mime = require('mime')
var tmp = require('tmp')
var ImageProcessor = require('./image_processor')
var PdfProcessor = require('./pdf_processor')
var TextParser = require('./text_parser')

function Processor (fileOrStream) {
  if (!(this instanceof Processor)) {
    return new Processor(fileOrStream)
  }

  this.fileOrStream = fileOrStream
  this.tickerCallback = function () {}
  this.log = function (message) {
    process.stderr.write(message)
    process.stderr.write('\n')
  }
  this.imagePreprocessors = []
  this.textParsers = []
  this.verbose = false

  return this
}

Processor.prototype.logger = function (log) {
  this.log = log

  return this
}

Processor.prototype.setVerbose = function (verbose) {
  this.verbose = verbose

  return this
}

Processor.prototype.ticker = function (callback) {
  this.tickerCallback = callback

  return this
}

Processor.prototype._tick = function (percent) {
  this.tickerCallback(percent)
}

Processor.prototype.imagePreprocessor = function (imagePreprocessor) {
  this.imagePreprocessors.push(imagePreprocessor)

  return this
}

Processor.prototype.parse = function (callback) {
  this.callback = callback || function () {}

  var mimetype = this._getMimetype()

  switch (true) {
    case mimetype === 'application/pdf':
      return new PdfProcessor(this).process(this.fileOrStream)
    case /^image\/.*/.test(mimetype):
      return new ImageProcessor(this).process(this.fileOrStream)
    default:
      return callback(new Error('Unsupported format: ' + mimetype))
  }
}

Processor.prototype._callback = function (error, text) {
  this._tick(0.95)

  if (typeof text === 'string') {
    text = this.parseText(text)
  }

  this._tick(1.0)

  return this.callback(error, text)
}

Processor.prototype._getMimetype = function () {
  if (!this.fileOrStream) return 'application/octet-stream'

  return mime.getType(this.fileOrStream.path || this.fileOrStream)
}

Processor.prototype.textParser = function (textParser) {
  this.textParsers.push(textParser)

  return this
}

Processor.prototype.parseText = function (text) {
  this._tick(0.99)

  return new TextParser(this).parse(text)
}

Processor.prototype._tmpName = function (extension) {
  extension = extension || ''

  if (extension.length) extension = '.' + extension

  return tmp.tmpNameSync({ postfix: extension })
}

Processor.prototype._tmpDir = function () {
  return tmp.dirSync().name
}

module.exports = exports = Processor
