/* eslint-env mocha */
var chai = require('chai')
var assert = chai.assert

var dateParser = require('../../../lib/text_parser/date_parser')

var extractValue = function (results) {
  if (results.length > 0) {
    return results[0].start.date().toISOString().slice(0, 10)
  }
}

describe('DateParser', function () {
  describe('#parser()', function () {
    it('should find earliest date', function () {
      var text = 'Mar/05/2016\nMar/04/2016\nMar/06/2016'

      assert.equal(dateParser.parser(text).match, '2016-03-04')
    })

    it('should return nil when day is 0 (chrono bug 2016-06-18)', function () {
      // Weird bug in chrono
      var text = '00\n                                                                                                      Feb 15'
      assert.equal(dateParser.parser(text).match, false)
    })
  })

  describe('#allDates()', function () {
    describe('with prepared text', function () {
      it('should handle (month name)/dd/yyyy', function () {
        var text = dateParser.prepareText('Mar/05/2016')
        assert.equal(extractValue(dateParser.allDates(text)), '2016-03-05')
      })

      it('should handle dd-MM-yyyy', function () {
        var text = dateParser.prepareText('30-June-2016')
        assert.equal(extractValue(dateParser.allDates(text)), '2016-06-30')
      })

      it('should handle with non standard hyphen', function () {
        var text = dateParser.prepareText('2016\u201302\u201304T20:25:01') // (\u2013 = – en dash)
        assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
        text = dateParser.prepareText('2016\u201402\u201404T20:25:01') // (\u2014 = — em dash)
        assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
        text = dateParser.prepareText('2016\u201202\u201204T20:25:01') // (\u2012 = ‒ figure dash)
        assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
        text = dateParser.prepareText('2016\uFE5802\uFE5804T20:25:01') // (\uFE58 = ﹘ small em dash)
        assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
      })

      it('should handle (d)d??(m)m??yyyy', function () {
        var text = dateParser.prepareText("04\\'30\\'2016")
        assert.equal(extractValue(dateParser.allDates(text)), '2016-04-30')
        text = dateParser.prepareText("4'06'2016")
        assert.equal(extractValue(dateParser.allDates(text)), '2016-04-06')
        text = dateParser.prepareText('04|06|2016')
        assert.equal(extractValue(dateParser.allDates(text)), '2016-04-06')
      })

      it('should handle (month name)dd(?)yyyy', function () {
        var text = dateParser.prepareText("Mar30'2016")
        assert.equal(extractValue(dateParser.allDates(text)), '2016-03-30')
      })

      it('should handle YYYY-MM-DDThh?ii?ss', function () {
        var text = dateParser.prepareText('2016-02-01T23;59|41')
        assert.equal(extractValue(dateParser.allDates(text)), '2016-02-01')
      })
    })

    it('should handle (month name)/dd/yyyy', function () {
      var text = 'Mar 30 2016'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-03-30')
    })

    it('should handle (d)d/(m)m/yyyy', function () {
      var text = '4/6/2016'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-04-06')
      text = '4/06/2016'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-04-06')
      text = '04/06/2016'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-04-06')
    })

    it('should handle yyyy-mm-dd(T)hh:ii:ss', function () {
      var text = '2016-02-04T20:25:01'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
      text = '2016-02-04 20:25:01'
      assert.equal(extractValue(dateParser.allDates(text)), '2016-02-04')
    })

    it('should handle EN dayname mm-dd-yy/dd-mm-yy', function () {
      assert.equal(extractValue(dateParser.allDates('12-30-16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30-12-16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('Friday 12-30-16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('Friday 30-12-16')), '2016-12-30')
    })

    it('should handle EN dayname, mm-dd-yy,/dd-mm-yy,', function () {
      assert.equal(extractValue(dateParser.allDates('12-30-16,')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30-12-16,')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('Friday, 12-30-16,')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('Friday, 30-12-16,')), '2016-12-30')
    })

    it('should handle ES dayname dd-mm-yy', function () {
      assert.equal(extractValue(dateParser.allDates('Viernes 30-12-16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30-12-16')), '2016-12-30')
    })

    it('should handle ES dayname, dd-mm-yy,', function () {
      assert.equal(extractValue(dateParser.allDates('Viernes, 30-12-16,')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30-12-16,')), '2016-12-30')
    })

    it('should handle mm.dd.yy/dd.mm.yy', function () {
      assert.equal(extractValue(dateParser.allDates('12.30.16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30.12.16')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('12.30.2016')), '2016-12-30')
      assert.equal(extractValue(dateParser.allDates('30.12.2016')), '2016-12-30')
    })

    it('should return false if no dates', function () {
      assert.equal(dateParser.allDates(''), false)
      assert.equal(dateParser.allDates('date'), false)
    })

    it('should return false if not full date', function () {
      assert.equal(dateParser.allDates('06-13'), false)
      assert.equal(dateParser.allDates('2016-06'), false)
      assert.equal(dateParser.allDates('2016'), false)
      assert.equal(dateParser.allDates('Pay in 60 days'), false)
    })

    it('should return false if invalid read date', function () {
      assert.equal(dateParser.allDates('2016-OB-13'), false)
    })

    it('should return false with euro style phone number', function () {
      assert.equal(dateParser.allDates('53-26-90-00'), false)
    })
  })
})
