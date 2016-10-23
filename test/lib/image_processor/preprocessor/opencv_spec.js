var chai = require('chai'),
  assert = chai.assert;

var scanner = require('../../../../lib/processor');

describe('#opencv()', function(done) {
  this.timeout(30000);

  it('should parse with onlyFindTextInsidePaperContour', function(done) {
    scanner(__dirname + '/../../../test_files/readableRotatedGrayscale.png')
      .imagePreprocessor(['opencv', {
        onlyFindTextInsidePaperContour: true,
      }])
      .parse(function(error, results) {
        assert.equal(error, null);
        assert.equal(results.amount, '5,280.00');
        assert.equal(results.date, '2015-08-04');
        done();
      });
  });

  it('should parse with removeNoise', function(done) {
    scanner(__dirname + '/../../../test_files/readableRotatedColor.png')
      .imagePreprocessor(['opencv', {
        removeNoise: true,
      }])
      .parse(function(error, results) {
        assert.equal(error, null);
        assert.equal(results.amount, '5,280.00');
        assert.equal(results.date, '2015-08-04');
        done();
      });
  });
});
