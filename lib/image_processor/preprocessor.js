function Preprocessor(processor) {
  this.preprocessors = [];
  this.processor = processor;

  return this;
}

Preprocessor.prototype.run = function(preprocessor) {
  this.preprocessors.push(preprocessor);
};

Preprocessor.prototype.process = function(file_or_stream, outfile, callback) {
  this.preprocessors.reverse();

  this._runPreprocessor(file_or_stream, outfile, callback);
};

Preprocessor.prototype._runPreprocessor = function(file_or_stream, outfile, callback) {
  var self = this,
    preprocessor = self.preprocessors.pop();
    config = {};

  if (preprocessor instanceof Array) {
    config = preprocessor[1];
    preprocessor = preprocessor[0];
  }

  config.log = self.processor.log;

  if (typeof preprocessor === 'string') preprocessor = require('./preprocessor/' + preprocessor);

  preprocessor(file_or_stream, outfile, function(error, file_or_stream) {
    if (error || !self.preprocessors.length) return callback(error, outfile);
    self._runPreprocessor(file_or_stream, outfile, callback);
  }, config);
};

module.exports = exports = Preprocessor;
