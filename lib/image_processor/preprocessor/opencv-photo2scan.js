var cv = require('opencv'),
  fs = require('fs');

function opencv(stream, outfile, callback, config) {
  if (typeof stream === 'string')
    stream = fs.createReadStream(stream);

  var s = new cv.ImageDataStream();
  s.on('load', function(im) {
    handleMatrix(im, outfile, callback, config);
  });
  stream.pipe(s);
}

function handleMatrix(im, outfile, callback, config) {
  try {
    // Remove alpha channel if any
    if (im.channels() === 4) {
      channels = im.split();
      channels.pop();
      im.merge(channels);
    }

    var paperMask = findPaperInPhoto(im, outfile, config),
      res = isolatePaper(paperMask, im, outfile, config),
      mask = res[1];
    im = res[0];
    im = warpPerspective(im, mask, outfile, config);
    im = rotate(paperMask, im, outfile, config);
    if (config.removeNoise)
      im = removeNoise(im, outfile, config);

    im.save(outfile);
  } catch(err) {
    return callback(err);
  }

  return callback(null, outfile);
}

/* istanbul ignore next */
function verboseDrawContour(im, contours, color, thickness) {
  color = color || [0, 255, 0];
  thickness = thickness || 5;
  for(var c = 0; c < contours.size(); ++c) {
    im.drawContour(contours, c, color, thickness);
  }
}

function getPaperThreshold(im, outfile) {
  mask = im.copy();

  if (mask.channels() === 3) {
    // Find the most common color
    mask.convertHSVscale();
    channels = mask.split();
    res = channels[2].meanStdDev();
    minHue = res.mean[2] - res.stddev[2]*3;
    maxHue = res.mean[2] + res.stddev[2]*3;
    mask = channels[2];
    mask.inRange(minHue, maxHue);
    mask = mask.threshold(10, 255, 'Binary', 'Otsu');
    mask.erode(5);
    mask.dilate(20);

    /* istanbul ignore if */
    if (config.verbose) {
      var filename = debugFilename(outfile);

      im = im.copy();
      contours = mask.findContours();
      verboseDrawContour(im, contours, color, thickness);
      im.save(filename);
      config.log('verbose[getPaperThreshold]: Saved possible paper contours in photo as ' + filename);
      config.log('verbose[getPaperThreshold]: Found ' + contours.size() + ' contours');
    }

  } else {
    // Highlight contours in grascale photo scan
    mask.medianBlur(5);
    mask = mask.adaptiveThreshold(255, ADAPTIVE_THRESH_GAUSSIAN_C = 1, THRESH_BINARY = 0, 21, 1);
    mask.canny(50, 150);
    structure = cv.imgproc.getStructuringElement(1, [6, 6]);
    mask.dilate(1, structure);

    /* istanbul ignore if */
    if (config.verbose) {
      var filename = debugFilename(outfile);

      im = im.copy();
      im.cvtColor('CV_GRAY2BGR');
      contours = mask.findContours();
      verboseDrawContour(im, contours, color, thickness);
      im.save(filename);
      config.log('verbose[getPaperThreshold]: Saved possible paper contours in photo as ' + filename);
      config.log('verbose[getPaperThreshold]: Found ' + contours.size() + ' contours');
    }
  }

  return mask;
}

function findPaperInPhoto(im, outfile, config) {
    // Find paper
    paperMask = getPaperThreshold(im, outfile);
    paperContours = paperMask.findContours();
    paperContoursList = getPossibleContours(paperContours, (im.width() - 5) * (im.height() - 5), (im.width()) * (im.height()) * 0.25);

    if (paperContoursList.length >= 1) {
      maskContourPoints = getContourPoints(paperContours, paperContoursList[0][0]);

      /* istanbul ignore if */
      if (config.verbose) {
        var filename = debugFilename(outfile);
        im = im.copy();
        if (im.channels() === 1) {
          im.cvtColor('CV_GRAY2BGR');
         }
        im.fillPoly([maskContourPoints.map(function(ps) { return [ps.x, ps.y]; })], [0, 255, 0]);
        im.save(filename);
        config.log('verbose[findPaperInPhoto]: Saved detected paper in photo as ' + filename);
        config.log('verbose[findPaperInPhoto]: The following countour points where detected: ' + maskContourPoints.map(function(ps) { return [ps.x, ps.y]; }));
      }

      if (maskContourPoints.length >= 4)
        return maskContourPoints;
    }

    return false;
}

function isolatePaper(paperMask, im, outfile, config) {
  if (paperMask) {
    /* Isolate paper in image */
    mask = new cv.Matrix(im.height(), im.width(), cv.Constants.CV_8UC1, [0]);
    mask.fillPoly([paperMask.map(function(ps) { return [ps.x, ps.y]; })], [255, 255, 255]);
    if (im.channels() < 3) {
      white = new cv.Matrix(im.height(), im.width(), cv.Constants.CV_8UC1, [255]);
    } else {
      white = new cv.Matrix(im.height(), im.width(), cv.Constants.CV_8UC3, [255, 255, 255]);
    }
    im.copyWithMask(white, mask);
    im = white;
  }

  return [im, mask];
}

function getTextElementsContours(im) {
  mask = im.copy();
  if (mask.channels() > 1) {
    mask.convertGrayscale();
    mask.canny(50, 150);
    structure = cv.imgproc.getStructuringElement(1, [6, 6]);
    mask.dilate(2, structure);
  }

  var mask = mask.threshold(0, 255, 'Binary', 'Otsu'),
    contours = mask.findContours(),
    contoursList = [];

  for(var c = 0; c < contours.size(); ++c) {
    contoursList[c] = [c, contours.minAreaRect(c), contours.area(c)];
  }

  // Remove all text elements that doesn't look like proper word rectangles
  contoursList = contoursList.filter(function(c) {
    sides = [c[1].size.height, c[1].size.width];
    if (typeof sides[0] < 10 && typeof sides[1] < 10)
      return false;

    if (Math.min(...sides) === 0)
      return false;

    ratio = Math.max(...sides) / Math.min(...sides);
    return ratio >= 5;
  });

  return { contours: contours, list: contoursList };
}

function rotate(paperMask, im, outfile, config) {
  contours = getTextElementsContours(im);
  contoursList = contours.list;

  if(config.onlyFindTextInsidePaperContour) {
    // This is not necessary unless the paper haven't been deteced
    if (paperMask) {
      var contoursListCountPrevious = contoursList.length;
      // Remove all not inside the paper polygon
      contoursList = contoursList.filter(function(c) {
        points = getContourPoints(contours.contours, c[0]);
        return polygonInPolygon(points, paperMask);
      });
      /* istanbul ignore if */
      if (config.verbose) {
        var removedContoursCount = contoursListCountPrevious - contoursList.length;
        config.log('onlyFindTextInsidePaperContour: Removed ' + removedContoursCount + ' contours.');
      }
    }
  }

  if(contoursList.length === 0)
    return im;

  // Sort by highest to lowest angle, remove outliers and find median
  contoursList = contoursList.sort(function(a, b) {
    return a[1].angle - b[1].angle;
  });
  var middle = Math.floor((contoursList.length - 1) / 2),
    median;
  if (contoursList.length % 2) {
    median = contoursList[middle][1].angle;
  } else {
    median = (contoursList[middle][1].angle + contoursList[middle + 1][1].angle) / 2.0;
  }
  noOfItems = Math.floor(contoursList.length * 0.15);
  contoursList = contoursList.slice(noOfItems, contoursList.length - noOfItems);
  maxDif = 1.0;
  if (Math.abs(median - contoursList[contoursList.length - 1][1].angle) > maxDif || Math.abs(contoursList[0][1].angle - median) > maxDif)
    return im;

  // Rotate if most word elements have certain direction
  if (contoursList.length > 0) {
    var counts = {};

    var rotMat = cv.Matrix.getRotationMatrix2D(median, im.width() / 2, im.height() / 2, 1.0);
    var rotBox = fitRect(im.width(), im.height(), median * Math.PI / 180);

    // There's a OpenCV node bug, if you use warpAffine with noa rgs it'll mix up
    // height and width, always set them.
    im.warpAffine(rotMat, rotBox[0], rotBox[1]);
  }

  return im;
}

function warpPerspective(im, mask, outfile) {
  if (mask) {
    paperContours = mask.findContours();
    paperContoursList = getPossibleContours(paperContours, (mask.width() - 5) * (mask.height() - 5), (mask.width()) * (mask.height()) * 0.25);
    if (paperContoursList.length >= 1) {
      // Find rough contours
      contour = getContourPoints(paperContours, paperContoursList[0][0], 0.1);
      if (contour.length === 4) {
        var maskContourRectPoints = contour;

        /* Find paper size and warp */
        var approx = maskContourRectPoints.map(function(ps) { return [ps.x, ps.y]; });
        var rect = [[0,0], [0,0], [0,0], [0,0]],
          sums = approx.map(function(el) { return el[0] + el[1]; }),
          diffs = approx.map(function(el) { return el[1] - el[0]; });
        tl = rect[0] = approx[sums.indexOf(Math.min.apply(Math, sums))];
        br = rect[2] = approx[sums.indexOf(Math.max.apply(Math, sums))];
        tr = rect[1] = approx[diffs.indexOf(Math.min.apply(Math, diffs))];
        bl = rect[3] = approx[diffs.indexOf(Math.max.apply(Math, diffs))];

        widthA = Math.sqrt(Math.pow(br[0] - bl[0], 2) + Math.pow(br[1] - bl[1], 2));
        widthB = Math.sqrt(Math.pow(tr[0] - tl[0], 2) + Math.pow(tr[1] - tl[1], 2));
        maxWidth = parseInt(Math.max(widthA, widthB));

        heightA = Math.sqrt(Math.pow(tr[0] - br[0], 2) + Math.pow(tr[1] - br[1], 2));
        heightB = Math.sqrt(Math.pow(tl[0] - bl[0], 2) + Math.pow(tl[1] - bl[1], 2));
        maxHeight = parseInt(Math.max(heightA, heightB));

        var flat = [].concat(...rect);
        var src = flat.some(Array.isArray) ? flatten(flat) : flat;
        var dst = [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1];
        var M = im.getPerspectiveTransform(src, dst);
        im.warpPerspective(M, maxWidth, maxHeight, [255, 255, 255]);
      }
    }
  }

  return im;
}

// http://stackoverflow.com/a/29915728
function polygonInPolygon(points1, points2) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    for (var p = 0; p < points1.length; p++) {
      var inside = false,
        points = points1[p];

      for (var i = 0, j = points2.length - 1; i < points2.length; j = i++) {
          var xi = points2[i].x, yi = points2[i].y;
          var xj = points2[j].x, yj = points2[j].y;

          var intersect = ((yi > points.y) !== (yj > points.y)) &&
            (points.x < (xj - xi) * (points.y - yi) / (yj - yi) + xi);
          if (intersect) {
            inside = !inside;
          }
      }

      if (!inside)
        return false;
    }

    return true;
}

function getContourPoints(contours, index, precision) {
  precision = precision || 0.008;
  var epsilon = precision * contours.arcLength(index, true),
    maskContourPoly = contours.approxPolyDP(index, epsilon, true),
    points = [];

  for(i = 0; i < contours.cornerCount(index); i++) {
    points.push(contours.point(index, i));
  }

  return points;
}

// http://stackoverflow.com/a/3869160
function fitRect(rw,rh,radians) {
    var x1 = -rw/2,
        x2 = rw/2,
        x3 = rw/2,
        x4 = -rw/2,
        y1 = rh/2,
        y2 = rh/2,
        y3 = -rh/2,
        y4 = -rh/2;

    var x11 = x1 * Math.cos(radians) + y1 * Math.sin(radians),
        y11 = -x1 * Math.sin(radians) + y1 * Math.cos(radians),
        x21 = x2 * Math.cos(radians) + y2 * Math.sin(radians),
        y21 = -x2 * Math.sin(radians) + y2 * Math.cos(radians),
        x31 = x3 * Math.cos(radians) + y3 * Math.sin(radians),
        y31 = -x3 * Math.sin(radians) + y3 * Math.cos(radians),
        x41 = x4 * Math.cos(radians) + y4 * Math.sin(radians),
        y41 = -x4 * Math.sin(radians) + y4 * Math.cos(radians);

    var x_min = Math.min(x11,x21,x31,x41),
        x_max = Math.max(x11,x21,x31,x41);

    var y_min = Math.min(y11,y21,y31,y41);
        y_max = Math.max(y11,y21,y31,y41);

    return [x_max-x_min,y_max-y_min];
}

function removeNoise(im, outfile, config) {
    if (im.channels() === 3) {
      im.convertGrayscale();
    }

    ratio = Math.min(im.width(), im.height()) / 2500;
    blurKernel = Math.round(5 * ratio);
    blurKernel -= blurKernel % 2 - 1;

    im.medianBlur(blurKernel);
    im = im.adaptiveThreshold(255, ADAPTIVE_THRESH_GAUSSIAN_C = 1, THRESH_BINARY = 0, 21, 3);

    /* istanbul ignore if */
    if (config.verbose) {
      var filename = debugFilename(outfile);
      config.log('verbose[removeNoise]: Saved removed noise image as ' + filename);
      im.save(filename);
    }

    return im;
}

function getPossibleContours(contours, maxArea, minArea) {
  contoursList = [];

  for(var c = 0; c < contours.size(); ++c) {
    contoursList[c] = [c, paperContours.minAreaRect(c), paperContours.area(c)];
  }
  contoursList = contoursList.sort(function(c1, c2) { return c2[2] - c1[2]; });

  return contoursList.filter(function(c) {
    var minAreaRectArea = c[1].size.height * c[1].size.width;

    return minAreaRectArea < maxArea &&
      minAreaRectArea > minArea &&

      // We want a polygon that has an area of at least 50% of the minimum area rect. This prevents very small polygons that doesn't actually cover the full paper due to problematic lightning.
      c[2] >= minAreaRectArea * 0.5;
  });
}

var debugFileId = 0;
/* istanbul ignore next */
function debugFilename(outfile) {
  outfile = outfile.split('.');
  extension = outfile.pop();
  outfile = outfile.join('.');
  return outfile + '-' + debugFileId++ + '.' + extension;
}

module.exports = opencv;
