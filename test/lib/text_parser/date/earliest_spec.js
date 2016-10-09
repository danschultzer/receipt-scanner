var chai = require('chai'),
  assert = chai.assert;

var date_parser = require('../../../../lib/text_parser/date_parser'),
  earliest = require('../../../../lib/text_parser/date/earliest');

describe('Earliest', function() {

  describe('#extract()', function() {

    describe('with earliest', function() {
      it('should get the earliest date', function() {
        var text = 'Date: 02/05/2016 Purchased: Feb/01/2016\nAnother date: 2016-02-07';
        text = date_parser.prepareText(text);
        values = date_parser.allDates(text);

        assert.equal(earliest.extract(values).toISOString().slice(0, 10), '2016-02-01');
      });
    });
  });
});
