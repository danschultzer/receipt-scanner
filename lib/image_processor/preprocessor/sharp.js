var sh = require('sharp'),
  fs = require('fs');

function sharp(stream, outfile, cb) {
  if (typeof stream === 'string') stream = fs.createReadStream(stream);
  var transformer = sh()
    .greyscale()
    .threshold(130)
    .gamma(1.5)
    .blur()
    .sharpen(0.5)
    .toFormat('png')
    .toFile(outfile, function(error) {
      cb(error, outfile);
    });
  stream.pipe(transformer);
}

module.exports = sharp;
