var chai = require('chai'),
  assert = chai.assert;

var amount_parser = require('../../../../lib/text_parser/amount_parser'),
  total = require('../../../../lib/text_parser/amount/total');

describe('Total', function() {

  describe('#extract()', function() {

    describe('with total', function() {
      it('should get the total before subtotal', function() {
        text = "subtotal $2,000.43\ndiscount $1,000.00\ntotal $1,000.43";
        values = amount_parser.allAmounts(text, total.getOpts());

        assert.equal(total.extract(values), "1,000.43");
      });

      it('should get the total:', function() {
        text = "total:  $1,000.43";
        values = amount_parser.allAmounts(text, total.getOpts());

        assert.equal(total.extract(values), "1,000.43");
      });

      it('should get the total due', function() {
        text = "total due  $1,000.43";
        values = amount_parser.allAmounts(text, total.getOpts());

        assert.equal(total.extract(values), "1,000.43");
      });

      it('should get the balance due', function() {
        text = "balance due $1,000.43";
        values = amount_parser.allAmounts(text, total.getOpts());

        assert.equal(total.extract(values), "1,000.43");
      });

      it('should get the highest amount', function() {
        text = "balance due $1,000.43 total $2,000.43";
        values = amount_parser.allAmounts(text, total.getOpts());

        assert.equal(total.extract(values), "2,000.43");
      });
    });
  });
});
