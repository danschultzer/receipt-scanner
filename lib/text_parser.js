Parser = require('./text_parser/parser');

function TextParser(processor) {
  this.processor = processor;

  this.parsers = processor.textParsers;
  if (this.parsers.length === 0)
    this.parsers = ['amount', 'date'];

  return this;
}

TextParser.prototype.parse = function(text) {
  var results = {},
    verbose = this.processor.verbose;

  if (verbose)
    results.verbose = {};

  for(var i = 0; i < this.parsers.length; i++) {
    parser = this.parsers[i];
    var parserConfig = {};

    if (this.parsers[i] instanceof Array)
      parser = this.parsers[i][0];
      parserConfig = this.parsers[i][1];

    var parserName = parser.name || parser;

    var parserResults = new Parser(parser, parserConfig).parse(text);
    results[parserName] = parserResults.match;
    if (verbose)
      results.verbose[parserName] = parserResults;
  }

  if (verbose)
    results.verbose.text = text;


  return results;
};

module.exports = exports = TextParser;
