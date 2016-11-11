function Preprocessor (processor) {
  this.preprocessors = []
  this.processor = processor

  return this
}

Preprocessor.prototype.run = function (preprocessor) {
  this.preprocessors.push(preprocessor)
}

Preprocessor.prototype.process = function (fileOrStream, outfile, callback) {
  this.preprocessors.reverse()

  this._runPreprocessor(fileOrStream, outfile, callback)
}

Preprocessor.prototype._runPreprocessor = function (fileOrStream, outfile, callback) {
  var self = this
  var preprocessor = self.preprocessors.pop()
  var config = {}

  if (preprocessor instanceof Array) {
    config = preprocessor[1] // Before we override preprocessor
    preprocessor = preprocessor[0]
  }

  config.log = self.processor.log

  if (typeof preprocessor === 'string') {
    preprocessor = require('./preprocessor/' + preprocessor)
  }

  preprocessor(fileOrStream, outfile, function (error, fileOrStream) {
    if (error || !self.preprocessors.length) {
      return callback(error, outfile)
    }

    self._runPreprocessor(fileOrStream, outfile, callback)
  }, config)
}

module.exports = exports = Preprocessor
