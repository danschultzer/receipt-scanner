/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert

var dateParser = require('../../../../lib/text_parser/date_parser')
var first = require('../../../../lib/text_parser/date/first')

describe('First', function () {
  describe('#extract()', function () {
    describe('with first', function () {
      it('should get the first date', function () {
        var text = 'Date: 02/05/2016 Purchased: Feb/01/2016\nAnother date: Feb/07/2016'
        text = dateParser.prepareText(text)
        var values = dateParser.allDates(text)

        assert.equal(first.extract(values).toISOString().slice(0, 10), '2016-02-05')
      })
    })
  })
})
