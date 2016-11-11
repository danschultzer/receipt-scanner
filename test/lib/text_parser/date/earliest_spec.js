/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert

var dateParser = require('../../../../lib/text_parser/date_parser')
var earliest = require('../../../../lib/text_parser/date/earliest')

describe('Earliest', function () {
  describe('#extract()', function () {
    describe('with earliest', function () {
      it('should get the earliest date', function () {
        var text = 'Date: 02/05/2016 Purchased: Feb/01/2016\nAnother date: 2016-02-07'
        text = dateParser.prepareText(text)
        var values = dateParser.allDates(text)

        assert.equal(earliest.extract(values).toISOString().slice(0, 10), '2016-02-01')
      })
    })
  })
})
