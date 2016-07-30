var mime = require('mime'),
  tmp = require("tmp");

function Processor(file_or_stream) {
  if (!(this instanceof Processor)) {
    return new Processor(file_or_stream);
  }

  this.file_or_stream = file_or_stream;
  this.tickerCallback = function() {};
  this.log = function(message) {
    process.stderr.write(message);
    process.stderr.write("\n");
  };
  this.imagePreprocessors = [];
  this.textParsers = [];
  this.verbose = false;

  return this;
}

Processor.prototype.logger = function (log) {
  this.log = log;

  return this;
};

Processor.prototype.setVerbose = function (verbose) {
  this.verbose = verbose;

  return this;
};

Processor.prototype.ticker = function (callback) {
  this.tickerCallback = callback;

  return this;
};

Processor.prototype._tick = function (percent) {
  this.tickerCallback(percent);
};

Processor.prototype.imagePreprocessor = function (imagePreprocessor) {
  this.imagePreprocessors.push(imagePreprocessor);

  return this;
};

Processor.prototype._imageProcessor = require('./image_processor');
Processor.prototype._pdfProcessor = require('./pdf_processor');

Processor.prototype.parse = function (callback) {
  this.callback = callback || function() {};

  var mimetype = this._getMimetype();

  switch (true) {
    case mimetype == "application/pdf":
      return new this._pdfProcessor(this).process(this.file_or_stream);
    case /^image\/.*/.test(mimetype):
      return new this._imageProcessor(this).process(this.file_or_stream);
    default:
      return callback(new Error("Unsupported format: " + mimetype));
  }
};

Processor.prototype._callback = function(error, text) {
  this._tick(0.95);

  if (typeof text == "string") text = this.parseText(text);

  this._tick(1.0);

  this.callback(error, text);
};

Processor.prototype._getMimetype = function() {
  if (!this.file_or_stream) return "application/octet-stream";

  return mime.lookup(this.file_or_stream.path || this.file_or_stream);
};


Processor.prototype.textParser = function (textParser) {
  this.textParsers.push(textParser);

  return this;
};

Processor.prototype._TextParser = require('./text_parser');

Processor.prototype.parseText = function(text) {
  this._tick(0.99);
  return new this._TextParser(this).parse(text);
};

Processor.prototype._tmpName = function(extension) {
  if (extension) extension = '.' + extension;
  else extension = '';

  return tmp.tmpNameSync({ postfix: extension });
};

Processor.prototype._tmpDir = function() {
  return tmp.dirSync().name;
};

module.exports = exports = Processor;
