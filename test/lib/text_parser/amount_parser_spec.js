var chai = require('chai'),
  assert = chai.assert;

var amount_parser = require('../../../lib/text_parser/amount_parser');

describe('AmountParser', function() {

  describe('#parser()', function() {
    it('should return total', function() {
      var text = 'total $100.00\nsubtotal $200.00\n$300.00';
      assert.equal(amount_parser.parser(text).match, '100.00');
    });

    describe('with no total', function() {
      it('should return highest amount', function() {
        var text = '$200.00\n$300.00\n$100.00';
        assert.equal(amount_parser.parser(text).match, '300.00');
      });
    });
  });

  describe('#allAmounts()', function() {

    describe('without currency symbol', function() {
      it('should return', function() {
        var text = '5,280.00';
        assert.equal(amount_parser.allAmounts(text)[0].currency, null);
        assert.equal(amount_parser.allAmounts(text)[0].amount, 5280.00);
        assert.equal(amount_parser.allAmounts(text)[0].text, '5,280.00');
      });
    });

    describe('with euro currency symbol', function() {
      it('should return', function() {
        var text = '€5.280,00';
        assert.equal(amount_parser.allAmounts(text)[0].currency, '€');
        assert.equal(amount_parser.allAmounts(text)[0].amount, 5280.00);
        assert.equal(amount_parser.allAmounts(text)[0].text, '5.280,00');
      });
    });

    describe('with 3 letter currency ISO', function() {
      it('should return', function() {
        var text = 'EUR5.280,00';
        assert.equal(amount_parser.allAmounts(text)[0].currency, 'EUR');
        assert.equal(amount_parser.allAmounts(text)[0].amount, 5280.00);
        assert.equal(amount_parser.allAmounts(text)[0].text, '5.280,00');
      });
    });

    describe('with invalid 3 letter currency ISO', function() {
      it('should not return', function() {
        var text = 'ZZZ5.280,00';
        assert.equal(amount_parser.allAmounts(text), false);
      });
    });

    describe('with only fractional', function() {
      it('should return', function() {
        var text = '$0.12';
        assert.equal(amount_parser.allAmounts(text)[0].currency, '$');
        assert.equal(amount_parser.allAmounts(text)[0].amount, 0.12);
        assert.equal(amount_parser.allAmounts(text)[0].text, '0.12');
      });
    });

    describe('in hundreds', function() {
      it('should return', function() {
        var text = '$100.12';
        assert.equal(amount_parser.allAmounts(text)[0].currency, '$');
        assert.equal(amount_parser.allAmounts(text)[0].amount, 100.12);
        assert.equal(amount_parser.allAmounts(text)[0].text, '100.12');
      });
    });


    describe('whole number', function() {
      it('should return', function() {
        var text = '$100';
        assert.equal(amount_parser.allAmounts(text)[0].currency, '$');
        assert.equal(amount_parser.allAmounts(text)[0].amount, 100);
        assert.equal(amount_parser.allAmounts(text)[0].text, '100');
      });
    });

    describe('in thousands', function() {
      describe('without thousand mark', function() {
        it('should handle us decimal mark', function() {
          var text = '$500.32 $5280.00 $6280.00\n$5280.00';
          assert.equal(amount_parser.allAmounts(text)[2].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[2].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[2].text, '6280.00');
        });

        it('should handle european decimal mark', function() {
          var text = '$500,32 $5280,00 $6280,00\n$5280,00';
          assert.equal(amount_parser.allAmounts(text)[2].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[2].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[2].text, '6280,00');
        });

        it('should use most prevalent decimal mark', function() {
          var text = '$500.32 $5280,00 $6280.00\n$5280.00';
          assert.equal(amount_parser.allAmounts(text).length, 3);
          assert.equal(amount_parser.allAmounts(text)[1].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[1].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[1].text, '6280.00');
        });

      });

      describe('with thousand mark', function() {
        it('should handle us decimal mark', function() {
          var text = '$500.32 $6,280.00\n$5,280.00';
          assert.equal(amount_parser.allAmounts(text)[1].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[1].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[1].text, '6,280.00');
        });

        it('should handle european decimal mark', function() {
          var text = '$500,32 $5.280,00 $6.280,00\n$5.280,00';
          assert.equal(amount_parser.allAmounts(text)[2].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[2].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[2].text, '6.280,00');
        });

        it('should use most prevalent decimal mark', function() {
          var text = '$500,32 $5,280.00 $6.280,00\n$5.280,00';
          assert.equal(amount_parser.allAmounts(text).length, 3);
          assert.equal(amount_parser.allAmounts(text)[1].currency, '$');
          assert.equal(amount_parser.allAmounts(text)[1].amount, 6280.00);
          assert.equal(amount_parser.allAmounts(text)[1].text, '6.280,00');
        });
      });

      it('should not get amount from phone number', function() {
        var text = '554.280.5434';
        assert.equal(amount_parser.allAmounts(text), false);
      });

      it('should not get amount from ip', function() {
        var text = '127.0.0.1';
        assert.equal(amount_parser.allAmounts(text), false);
      });

      it('should not get amount from date', function() {
        var text = '16.09.02';
        assert.equal(amount_parser.allAmounts(text), false);
      });

      it('should not get amount from time with ms', function() {
        var text = '12:10:30.45';
        assert.equal(amount_parser.allAmounts(text), false);
      });
    });

    describe('with prepared text', function() {
      describe('amount with paranthesis', function() {
        it('should return', function() {
          var text = amount_parser.prepareText('(5.280,00)');
          assert.equal(amount_parser.allAmounts(text)[0].amount, 5280.00);
          assert.equal(amount_parser.allAmounts(text)[0].text, '5.280,00');
        });
      });
    });
  });
});
