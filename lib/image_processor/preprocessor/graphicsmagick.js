var gm = require('gm');

function graphicsmagick(file_or_stream, outfile, cb) {
  gm(file_or_stream)
   .density(1200, 800)
   .units('PixelsPerInch')
   .colorspace('gray')
   .type('grayscale')
   .modulate(100,0)
   .level('25%', 1.5, '75%')
   .blur(0, 0.2)
   .sharpen(0, 0.5)
   .write(outfile, function(error) {
     cb(error, outfile);
   });
}

module.exports = graphicsmagick;
