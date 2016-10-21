var chai = require('chai'),
  assert = chai.assert;

var scanner = require('../../../../lib/processor');

describe('#graphicsmagick()', function(done) {
  this.timeout(30000);

  it('should parse with graphicsmagick as preprocessor', function(done) {
    scanner(__dirname + '/../../../test_files/readable.jpg')
      .imagePreprocessor('graphicsmagick')
      .parse(function(error, results) {
        assert.equal(error, null);
        assert.equal(results.amount, '5,280.00');
        assert.equal(results.date, '2015-08-04');
        done();
      });
  });
});
