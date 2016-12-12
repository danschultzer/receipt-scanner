function dateParser (text, config) {
  config = config || {}
  var parser = config.parser || 'earliest'

  if (typeof parser === 'string') {
    parser = require('./date/' + parser)
  }

  text = prepareText(text)

  var result = {
    matches: allDates(text)
  }
  result.match = parser.extract(result.matches) || false

  // Post processing
  if (result.match) {
    result.actualMatch = result.match
    result.match = result.match.toISOString().slice(0, 10)
  }

  return result
}

function allDates (text) {
  return chrono().create().parse(text)
}

function monthNameRegexp () {
  return 'Jan(?:uary|\\.)?|Feb(?:ruary|\\.)?|Mar(?:ch|\\.)?|Apr(?:il|\\.)?|May|Jun(?:e|\\.)?|Jul(?:y|\\.)?|Aug(?:ust|\\.)?|Sep(?:tember|\\.)?|Oct(?:ober|\\.)?|Nov(?:ember|\\.)?|Dec(?:ember|\\.)?' +
    '|' +
    'Ene(?:ro|\\.)?|Feb(?:rero|\\.)?|Mar(?:zo|\\.)?|Abr(?:il|\\.)?|May(?:o|\\.)?|Jun(?:io|\\.)?|Jul(?:io|\\.)?|Ago(?:sto|\\.)?|Sep(?:tiembre|\\.)?|Oct(?:ubre|\\.)?|Nov(?:iembre|\\.)?|Dic(?:iembre|\\.)?'
}

function prepareText (text) {
  return text
    // Incorrectly scanned hyphens
    .replace(/[\u2013\u2014\u2012\uFE58/]{1}/ig, '-')
    // Incorrectly scanned dd/mm/yyyy date, e.g. dd\'mm\'yyyy
    // Example: 01\'01\'2016 -> 01/01/2016
    .replace(new RegExp('(^|\\s)' +
      // (d)d?(?)
      '(?:([0-3]{0,1}[0-9]{1})[^a-z0-9]{1,2})' +
      // (m)m?(?)
      '(?:([0-3]{0,1}[0-9]{1})[^a-z0-9]{1,2})' +
      // yyyy
      '([1-9]{1}[0-9]{3})' +
      '(?=$|\\s)', 'ig'), '$1$2/$3/$4')
    // Incorrect format MMM dd yyyy
    // Example: Jan01 2016 -> Jan 01 2016
    .replace(new RegExp('(^|\\s)' +
      // monthname?
      '(?:(' +
        monthNameRegexp() +
      ')[^a-z0-9]{0,2})' +
      // (d)d?(?)
      '(?:(' +
        '[0-3]{0,1}[0-9]{1}' +
      ')[^a-z0-9]{1,2})' +
      // yyyy
      '([1-9]{1}[0-9]{3})' +
      '(?=$|\\s)', 'ig'), '$1$2 $3 $4')
    // Incorrect format dd MMM yyyy
    // Example: 01Jan 2016 -> 01 Jan 2016
    .replace(new RegExp('(^|\\s)' +
      // (d)d?(?)
      '(?:(' +
        '[0-3]{0,1}[0-9]{1}' +
      ')[^a-z0-9]{1,2})' +
      // monthname?
      '(?:(' +
        monthNameRegexp() +
      ')[^a-z0-9]{1,2})' +
      // yyyy
      '([1-9]{1}[0-9]{3})' +
      '(?=$|\\s)', 'ig'), '$1$2 $3 $4')
    // Incorrectly scanned ..Thh;ii;ss
    // Example: T12;45;59 -> T12:45:59
    .replace(new RegExp(
      // Thh
      'T([0-1][0-9]|2[0-4])' +
      // seperator
      '[^a-z0-9]{1}' +
      // ii
      '([0-5][0-9])' +
      // seperator
      '[^a-z0-9]{1}' +
      // ss
      '([0-5][0-9])' +
      '(?=$|\\s)', 'ig'), 'T$1:$2:$3')
}

function chrono () {
  return {
    'create': function () {
      var filterRefiner = new this.class.Refiner()
      filterRefiner.refine = this.certainYearRefiner

      var custom = new this.class.Chrono(this.options())
      custom.refiners.push(filterRefiner)

      return custom
    },
    'class': require('chrono-node'),
    'parser': require('chrono-node').parser,
    'certainYearRefiner': function (text, results, opt) {
        // If there is no AM/PM (meridiem) specified,
        //  let all time between 1:00 - 4:00 be PM (13.00 - 16.00)
      var filteredResults = []
      results.forEach(function (result) {
        if (result.start.isCertain('month') &&
              result.start.isCertain('day') &&
              result.start.isCertain('year') &&
              // Weird bug in chrono 2016-06-18
              result.start.get('day') !== 0) {
          filteredResults.push(result)
        }
      })
      return filteredResults
    },
    'strictMode': false,
    'options': function () {
      var parser = this.parser
      var strictMode = this.strictMode

      return {
        parsers: [
          // EN
          new parser.ENISOFormatParser(strictMode),
          new parser.ENSlashDateFormatParser(strictMode),
          new parser.ENSlashDateFormatStartWithYearParser(strictMode),
          new parser.ENMonthNameMiddleEndianParser(strictMode),
          new parser.ENMonthNameLittleEndianParser(strictMode),

          // ES
          new parser.ESMonthNameLittleEndianParser(strictMode)
        ],

        refiners: []
      }
    }
  }
}

module.exports = exports = { parser: dateParser, allDates: allDates, prepareText: prepareText }
