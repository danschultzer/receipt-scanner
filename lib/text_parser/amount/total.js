var largest = require('./largest');

var Total = {
  'getOpts': function() {
    return { 'prepend': '(?:Total(?: due)?|Balance Due)[^a-z0-9]*' };
  },
  'extract': function(values) {
    return largest.extract(values);
  }
};

module.exports = Total;
