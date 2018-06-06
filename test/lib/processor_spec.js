/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert
var sinon = require('sinon')
var tesseract = require('node-tesseract')
var path = require('path')

var scanner = require('../../lib/processor')
var preprocessor = require('../../lib/image_processor/preprocessor')

describe('Processor', function () {
  describe('#parse()', function () {
    describe('with pdf file', function () {
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readable.pdf'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, '6000.00')
            assert.equal(results.date, '2016-06-13')
            done()
          })
      })
    })

    describe('with multi page pdf file', function () {
      this.timeout(30000)
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readableMultiPagePDF.pdf'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, '6000.00')
            assert.equal(results.date, '2016-06-13')
            done()
          })
      })
    })

    describe('with pdf image file', function () {
      this.timeout(20000)
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readablePDFimage.pdf'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, '5,280.00')
            assert.equal(results.date, '2015-08-04')
            done()
          })
      })
    })

    describe('with empty pdf file', function () {
      it('should return error', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'empty.pdf'))
          .parse(function (error) {
            assert.equal(error.message, 'No images found in PDF')
            done()
          })
      })
    })

    describe('with image file', function () {
      this.timeout(20000)
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readable.jpg'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, '5,280.00')
            assert.equal(results.date, '2015-08-04')
            done()
          })
      })
    })

    describe('with empty image file', function () {
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'empty.jpg'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, false)
            assert.equal(results.date, false)
            done()
          })
      })
    })

    describe('with image file containing alpha channel', function () {
      it('should parse', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'alpha.png'))
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, false)
            assert.equal(results.date, false)
            done()
          })
      })
    })

    describe('with invalid file', function () {
      it('should return error', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readable.txt'))
          .parse(function (error) {
            assert.equal(error.message, 'Unsupported format: text/plain')
            done()
          })
      })
    })

    describe('with no file', function () {
      it('should return error', function (done) {
        scanner()
          .parse(function (error) {
            assert.equal(error.message, 'Unsupported format: application/octet-stream')
            done()
          })
      })
    })
  })

  describe('#parseText()', function () {
    it('should parse input text to JSON', function () {
      var results = scanner().parseText('text total 6,000.00 date 2016-08-13')
      assert.equal(results.amount, '6,000.00')
      assert.equal(results.date, '2016-08-13')
    })
  })

  describe('#setVerbose()', function () {
    it('shows verbose information', function () {
      var results = scanner().setVerbose(false).parseText('text total 6,000.00 date 2016-08-13')
      assert.isUndefined(results.verbose)

      results = scanner().setVerbose(true).parseText('text total 6,000.00 date 2016-08-13')
      assert.isDefined(results.verbose)
    })
  })

  describe('#ticker()', function () {
    it('does callback to ticker', function (done) {
      var tickerCallback = function (percent) {
        assert.isNumber(percent)
        done()
      }
      scanner().ticker(tickerCallback).parseText('text total 6,000.00 date 2016-08-13')
    })
  })

  describe('#imagePreprocessor()', function (done) {
    describe('with custom image processor', function () {
      it('uses custom image processor', function (done) {
        var gm = require('gm')
        var gmCalled = false

        function customPreprocessor (fileOrStream, outfile, cb) {
          gmCalled = true
          gm(fileOrStream)
            .resize(400, 200)
            .in('-level', '25%,75%')
            .write(outfile, function (error) {
              cb(error, outfile)
            })
        }

        scanner(path.join(__dirname, '..', 'test_files', 'readable.jpg'))
          .imagePreprocessor(customPreprocessor)
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.isTrue(gmCalled)
            done()
          })
      })
    })

    describe('with existing image processor', function () {
      this.timeout(30000)
      it('uses existing image processor', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readable.jpg'))
          .imagePreprocessor('sharp')
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.equal(results.amount, '5,280.00')
            assert.equal(results.date, '2015-08-04')
            done()
          })
      })
    })

    describe('with chained image processors', function () {
      this.timeout(30000)
      it('uses chained image processors', function (done) {
        var gm = require('gm')
        var chain1Called = false
        var chain2Called = false

        function customPreprocessor1 (fileOrStream, outfile, cb) {
          chain1Called = true
          gm(fileOrStream)
            .resize(400, 200)
            .write(outfile, function (error) {
              cb(error, outfile)
            })
        }

        function customPreprocessor2 (fileOrStream, outfile, cb) {
          chain2Called = true
          gm(fileOrStream)
            .in('-level', '25%,75%')
            .write(outfile, function (error) {
              cb(error, outfile)
            })
        }

        scanner(path.join(__dirname, '..', 'test_files', 'readable.jpg'))
          .imagePreprocessor(customPreprocessor1)
          .imagePreprocessor(customPreprocessor2)
          .parse(function (error, results) {
            assert.equal(error, null)
            assert.isTrue(chain1Called)
            assert.isTrue(chain2Called)
            done()
          })
      })
    })

    describe('when preprocessor fails', function () {
      var error = new Error('Test')

      beforeEach(function () {
        sinon.stub(preprocessor.prototype, 'process').callsFake(function (fileOrStream, outfile, callback) {
          callback(error)
        })
      })

      afterEach(function () {
        preprocessor.prototype.process.restore()
      })

      this.timeout(30000)
      it('should return error', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readablePDFimage.pdf'))
          .parse(function (err, results) {
            assert.equal(error, err)
            done()
          })
      })
    })

    describe('when tesseract returns error', function () {
      var error = new Error('Test')

      beforeEach(function () {
        sinon.stub(tesseract, 'process').callsFake(function (file, callback) {
          callback(error)
        })
      })

      afterEach(function () {
        tesseract.process.restore()
      })

      it('should return error', function (done) {
        scanner(path.join(__dirname, '..', 'test_files', 'readable.jpg'))
          .parse(function (err, results) {
            assert.equal(error, err)
            done()
          })
      })
    })
  })

  describe('#textParser()', function () {
    describe('with custom text parser with config', function () {
      it('uses custom text parser with config', function () {
        function customTextParser (text, config) {
          assert.equal('Test', config.option1)
          var regexp = new RegExp('Description: (.*)', 'ig')
          var matches
          var output = []
          var results = {}
          while ((matches = regexp.exec(text))) {
            output.push(matches[1])
          }
          results.matches = output
          results.match = output[0]
          return results
        }

        var results = scanner()
          .textParser([customTextParser, { option1: 'Test' }])
          .parseText('Description: Test Description\ntotal 6,000.00 date 2016-08-13')
        assert.equal(results.customTextParser, 'Test Description')
      })
    })
  })
})
