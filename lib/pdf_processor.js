var pdftotext = require('pdf-text-extract'),
  fs = require('fs');

function PdfProcessor(processor) {
  this.processor = processor;

  return this;
}

PdfProcessor.prototype.process = function(file_or_stream) {
  var self = this;

  self.processor._tick(0.3);

  self._saveStreamToFile(file_or_stream, self.processor._tmpName('pdf'), function(filename) {
    pdftotext(filename, {
      layout: 'raw',
      splitPages: true
    }, function(error, text) {

      if (error) {
        return self.processor._callback(error);
      }

      // If we can't pass anything, last resort is to use tesseract
      var pages = 1;
      if (typeof pages !== 'string') pages = text.length;
      text = text.join(' ');
      if (/^\s*$/.test(text)) {
        self._processImagePDF(filename);
      } else {
        self.processor._tick(0.6);

        self.processor._callback(null, text);
      }
    });
  });
};

PdfProcessor.prototype._saveStreamToFile = function (stream, outfile, callback) {
  if (typeof stream === 'string') stream = fs.createReadStream(stream);
  outstream = fs.createWriteStream(outfile);
  outstream.on('finish', function() { callback(outfile); });
  stream.pipe(outstream);
};

PdfProcessor.prototype._processImagePDF = function(filename) {
  var self = this,
    images = self._extractImages(filename),
    finished = 0,
    imageText = [],
    hadError = false;

  if (images.length < 1) return self.processor._callback(new Error('No images found in PDF'));

  for(var i = 0; i < images.length; i++) {
    (function(i) {
      new self.processor._imageProcessor(self.processor)
        .process(images[i], function(error, text) {
          ++finished;

          if (error) {
            hadError = true;
            return self.processor._callback(error);
          }
          imageText[i] = text;

          if (!hadError && finished >= images.length) {
            return self.processor._callback(null, imageText.join('\n\n\n'));
          }
      });
    })(i);
  }
};

PdfProcessor.prototype._extractImages = function(filename) {
  var child = require('child_process');
  var tmpDir = this.processor._tmpDir();
  child.spawnSync('pdfimages', [filename, tmpDir + '/'], ['-j', '-png']);

  var files = fs.readdirSync(tmpDir);
  return files.map(function(file) { return tmpDir + '/' + file; });
};

module.exports = exports = PdfProcessor;
