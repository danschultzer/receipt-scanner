var tesseract = require('node-tesseract'),
  Preprocessor = require('./image_processor/preprocessor');

function ImageProcessor(processor) {
  this.processor = processor;
  this.verbose = processor.verbose;
  this.preprocessors = processor.imagePreprocessors;

  if (this.preprocessors.length === 0)
    this.preprocessors = [['opencv', { verbose: this.verbose }]];

  return this;
}

ImageProcessor.prototype.process = function(file_or_stream, callback) {
  var self = this,
    outfile = self.processor._tmpName('png');

  callback = callback || function(error, text) {
    self.processor._callback(error, text);
  };

  self.processor._tick(0.4);

  var preprocessor = new Preprocessor(self.processor);

  // Chain each preprocessor
  for(var i = 0; i < self.preprocessors.length; i++) {
    preprocessor.run(self.preprocessors[i]);
  }

  preprocessor.process(file_or_stream, outfile, function(error, outfile) {
    self.processor._tick(0.6);

    if (error)
      return callback(error);

    self._extractTextFromImage(outfile, function(error, text) {
      self.processor._tick(0.6); // From 50-80%

      if (error)
        return callback(error);

      return callback(null, text);
    });
  });
};

ImageProcessor.prototype._extractTextFromImage = function(file, callback) {
  tesseract.process(file, function(error, text) {
    if (error)
      return callback(error);

    callback(null, text);
  });
};

module.exports = exports = ImageProcessor;
