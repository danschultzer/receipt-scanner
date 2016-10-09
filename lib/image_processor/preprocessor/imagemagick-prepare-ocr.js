var gm = require('gm').subClass({ imageMagick: true });

function imagemagick(file_or_stream, outfile, cb) {
  gm(file_or_stream)
   .treeDepth(8)
   .density(400)
   .in('-colorspace', 'gray').in('-type', 'grayscale').in('-modulate', '100,0')
   .in('-gamma', '1.5')
   .in('-level', '25%,75%')
   .in('-blur', '0x0.2').in('-sharpen', '0x0.5')
   .in('-trim') // Remove all fluff
   .write(outfile, function(error) {
     cb(error, outfile);
   });
}

module.exports = imagemagick;
