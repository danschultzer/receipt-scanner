/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert

var amountParser = require('../../../../lib/text_parser/amount_parser')
var total = require('../../../../lib/text_parser/amount/total')

describe('Total', function () {
  describe('#extract()', function () {
    describe('with total', function () {
      it('should get the total before subtotal', function () {
        var text = 'subtotal $2,000.43\ndiscount $1,000.00\ntotal $1,000.43'
        var values = amountParser.allAmounts(text, total.getOpts())

        assert.equal(total.extract(values), '1,000.43')
      })

      it('should get the total:', function () {
        var text = 'total:  $1,000.43'
        var values = amountParser.allAmounts(text, total.getOpts())

        assert.equal(total.extract(values), '1,000.43')
      })

      it('should get the total due', function () {
        var text = 'total due  $1,000.43'
        var values = amountParser.allAmounts(text, total.getOpts())

        assert.equal(total.extract(values), '1,000.43')
      })

      it('should get the balance due', function () {
        var text = 'balance due $1,000.43'
        var values = amountParser.allAmounts(text, total.getOpts())

        assert.equal(total.extract(values), '1,000.43')
      })

      it('should get the highest amount', function () {
        var text = 'balance due $1,000.43 total $2,000.43'
        var values = amountParser.allAmounts(text, total.getOpts())

        assert.equal(total.extract(values), '2,000.43')
      })
    })
  })
})
