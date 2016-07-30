function amountParser(text, config) {
  config = config || {};
  var parsers = config.parsers || ['total', 'largest'],
    match, parser,
    result = {};

  // Go through all parsers and match the first best
  for(var i = 0; i < parsers.length; i++) {
    parser = parsers[i];
    if (typeof parser === "string") parser = require('./amount/' + parser);
    result.matches = allAmounts(text, parser.getOpts ? parser.getOpts() : {});
    match = parser.extract(result.matches);
    if (match) break;
  }

  result.match = match;

  return result;
}

function allAmounts(text, opts) {
  // For 1,000.00 format
  matches = findAmounts(text, null, null, opts);

  // For 1.000,00 format
  matches_comma = findAmounts(text, ',', '.', opts);

  if (matches_comma.length > matches.length) {
    return matches_comma;
  } else {
    return matches;
  }
}

function findAmounts(text, decimal, thousand, opts) {
  decimal = decimal || '.';
  thousand = thousand || ',';
  var output = [];

  methods = [regexpFractional, regexpWhole];
  for (var k in methods) {
    var matches,
      regexp = methods[k](decimal, thousand, opts);

    text = prepareText(text, decimal, thousand);

    while ((matches = regexp.exec(text)) !== null) {
      output.push({
        currency: matches[1],
        amount: parseFloat(matches[2].replace(thousand, '').replace(decimal, '.')),
        text: matches[2]
      });
    }
  }

  return output;
}

function prepareText(text, decimal, thousand) {
  return text
    // Remove paranthesis around amounts
    // Example: (5,000.01) -> 5,000.01
    .replace(new RegExp('(^|\\s)' +
      // (d)d?(?)
      '\\((' +
        '(' +
          // Check for format (x)x(,xxx)
          '([1-9][0-9]{0,2}' +
            '(\\' + thousand + '[0-9]{3})*' +
          ')' +
          // Check for just 0
          '|0' +
        ')' +
        // Check for .x(x)
      '\\' + decimal + '[0-9]{1,2}' +
      ')\\)' +
      '(?=$|\\s)', 'ig'), '$1$2');
}

function regexpFractional(decimal, thousand, opts) {
  opts = opts || {};

  // Start of string or whitespace
  var regexp = '(?:^|\\s)' +
    (opts.prepend || '') +

    // Check if there's some currency symbol like $, £, etc
    '(' + regexp_pSc + '|' + regexpCurrencyCode + ')?' +
    // Capture amount group
    '((' +
      // Check for format (x)x(,xxx)
      '([1-9][0-9]{0,2}' +
        '(\\' + thousand + '[0-9]{3})*' +
      ')' +
      // Check for format x(xxx...)
      '|([1-9]{1}[0-9]*)' +
      // Check for just 0
      '|0)?' +
      // Check for .x(x)
    '\\' + decimal + '[0-9]{1,2})' +

    // Ending or whitespace
    '(?=$|\\s)';

  return new RegExp(regexp, 'ig');
}

function regexpWhole(decimal, thousand, opts) {
  opts = opts || {};

  // Start of string or whitespace
  var regexp = '(?:^|\\s)' +
    (opts.prepend || '') +

    // Check if there's some currency symbol like $, £, etc
    '(' + regexp_pSc + '|' + regexpCurrencyCode + ')' +
    // Capture amount group
    '(' +
      // Check for format (x)x(,xxx)
      '([1-9][0-9]{0,2}' +
        '(\\' + thousand + '[0-9]{3})*' +
      ')' +
      // Check for format x(xxx...)
      '|([1-9]{1}[0-9]*)' +

    ')' +

    // Ending or whitespace
    '(?=$|\\s)';

  return new RegExp(regexp, 'ig');
}

// Like \p{Sc} from http://stackoverflow.com/a/27175364/939535
var regexp_pSc = '[\\$\\xA2-\\xA5\\u058F\\u060B\\u09F2\\u09F3\\u09FB\\u0AF1\\u0BF9\\u0E3F\\u17DB\\u20A0-\\u20BD\\uA838\\uFDFC\\uFE69\\uFF04\\uFFE0\\uFFE1\\uFFE5\\uFFE6]';
var regexpCurrencyCode = ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD",
  "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB",
  "BOV", "BRL", "BSD", "BTN", "BWP", "BYR", "BZD", "CAD", "CDF", "CHE", "CHF",
  "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUC", "CUP", "CVE", "CZK",
  "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP",
  "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG",
  "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES",
  "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR",
  "LRD", "LSL", "LTL", "LVL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT",
  "MOP", "MRO", "MUR", "MVR", "MWK", "MXN", "MXV", "MYR", "MZN", "NAD", "NGN",
  "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN",
  "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK",
  "SGD", "SHP", "SLL", "SOS", "SRD", "SSP", "STD", "SYP", "SZL", "THB", "TJS",
  "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "USN",
  "USS", "UYI", "UYU", "UZS", "VEF", "VND", "VUV", "WST", "XAF", "XAG", "XAU",
  "XBA", "XBB", "XBC", "XBD", "XCD", "XDR", "XFU", "XOF", "XPD", "XPF", "XPT",
  "XTS", "XXX", "YER", "ZAR", "ZMW"].join('|');


module.exports = exports = { parser: amountParser, allAmounts: allAmounts, prepareText: prepareText };
