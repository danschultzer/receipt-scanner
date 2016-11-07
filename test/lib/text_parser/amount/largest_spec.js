/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert

var amountParser = require('../../../../lib/text_parser/amount_parser')
var largest = require('../../../../lib/text_parser/amount/largest')

describe('Largest', function () {
  describe('#extract()', function () {
    describe('with largest', function () {
      it('should get largest amount', function () {
        var text = '$500.32 $6,280.00\n$5,280.00'
        var values = amountParser.allAmounts(text)

        assert.equal(largest.extract(values), '6,280.00')
      })
    })
  })
})
