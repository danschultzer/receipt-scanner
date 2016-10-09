function Parser(parser, config) {
  if (typeof parser === 'string') parser = require('./' + parser + '_parser').parser;

  this.parser = parser;
  this.config = config || {};

  return this;
}

Parser.prototype.parse = function(text) {
  return this.parser(text, this.config);
};

module.exports = exports = Parser;
