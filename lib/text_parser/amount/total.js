var Total = {
  'getOpts': function() {
    return { 'prepend': '(?:Total(?: due)?|Balance Due)[^a-z0-9]*' };
  },
  'extract': function(values) {
    return require('./largest').extract(values);
  }
};

module.exports = Total;
