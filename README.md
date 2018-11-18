# receipt-scanner

Receipt scanner extracts information from your PDF or image receipts.

[![Travis](https://img.shields.io/travis/danschultzer/receipt-scanner/master.svg)](https://travis-ci.org/danschultzer/receipt-scanner/)
[![NPM version](https://img.shields.io/npm/v/receipt-scanner.svg)](https://www.npmjs.com/package/receipt-scanner)
[![Codecov](https://img.shields.io/codecov/c/github/danschultzer/receipt-scanner/master.svg)](https://codecov.io/gh/danschultzer/receipt-scanner)
[![David](https://img.shields.io/david/danschultzer/receipt-scanner/master.svg)](https://david-dm.org/danschultzer/receipt-scanner)

## Example

```
import scanner from 'receipt-scanner'

scanner(streamOrFilePath)
  .parse(function (err, results) {
    if (err) return console.error(err)
    else console.log(results)
  })
```

### CLI

```
receipt-scanner path/to/image.png
```

### Results

```
{
    "path/to/image.png": {
        "amount": "1,390.00",
        "date": "2016-06-19"
    }
}
```

## Getting started

`$ brew install opencv3 poppler tesseract --with-all-languages`

`$ brew link --force opencv3`

`$ npm install git+https://git@github.com/danschultzer/receipt-scanner.git -g`

Now run:

`receipt-scanner path/to/image.png`

### Command Line Interface

```
$ receipt-scanner --help

Usage: receipt-scanner [options] <path...>

Options:

  -h, --help             output usage information
  -f, --format <format>  format to return, json (default) or text
  -p, --progress         add a progress bar
  -s, --summary          show summary details
  -v, --verbose          show verbose information
```

## Optional dependencies

These dependencies are only necessary if you're going to use `imagemagick` or `graphicsmagick` image preprocessor.

| Preprocessor   | Install command                        |
| -------------- | -------------------------------------- |
| Graphicsmagick | `$ brew install graphicsmagick`        |
| Imagemagick    | `$ brew install imagemagick`           |

## API

### Custom image preprocessor

You can use, and chain, specific image preprocessors by using the `imagePreprocessor` method like so:

```
var gm = require('gm')

function customPreprocessor (fileOrStream, outfile, cb) {
  gm(fileOrStream)
   .resize(400, 200)
   .in('-level', '25%,75%')
   .write(outfile, function (error) {
     cb(error, outfile)
   })
}

import scanner from 'receipt-scanner'

scanner(streamOrFilePath)
  .imagePreprocessor(customPreprocessor)
  .parse(function (err, results) {
    if (err) return console.error(err)
    else console.log(results)
  })
```

The default preprocessor used is [`opencv`](lib/image_processor/preprocessor/opencv.js). It's also possible to add configuration settings by pushing an array to `imagePreprocessor` like so:

```
scanner(stream_or_file_path)
  .imagePreprocessor(['opencv', { verbose: true }])
```

### Custom text parser

You can add a custom text parser by using the `textParser` method like so:

```
function customTextParser (text) {
  var regexp = new RegExp('Description: (.*)', 'ig')
  var output = []
  while (var matches = regexp.exec(text)) {
    output.push(matches[1])
  }
  return { matches: output, match: output[0] }
}

import scanner from 'receipt-scanner'

scanner(streamOrFilePath)
  .textParser(customTextParser)
  .parse(function (err, results) {
    if (err) return console.error(err)
    else console.log(results)
  })
```

The value will be added to the response object for the `customTextParser` key.

### Customizing amount or date parser

You can customize either parser by setting config like so:

```
import scanner from 'receipt-scanner'

scanner(streamOrFilePath)
  .textParser(['date', { parser: 'first' }])
  .parse(function (err, results) {
    if (err) return console.error(err)
    else console.log(results)
  })
```

Date parser will by default find the [`earliest`](lib/text_parser/date/earliest.js) date, but as shown in the example you can also find the [`first`](lib/text_parser/date/first.js). The amount parser will find the total first, and if nothing is found, then find the biggest amount.

#### Date parser config options
`parser`: What parser to run, `earliest` or `first`

#### Amount parser config options
`parsers`: What parsers to run in order. Default is `['total', 'largest']`.

### Ticker

A ticker callback can be added with the `ticker` method.

```
import scanner from 'receipt-scanner'

scanner(streamOrFilePath)
  .ticker(function (percent) {
    // Update ticker with current percent amount
  })
  .parse(function (err, results) {
    if (err) return console.error(err)
    else console.log(results)
  })
```

### Parse text

If you've already extracted the text, and just want to parse it for the relevant information you can use `parseText`.

```
import scanner from 'receipt-scanner'

var results = scanner().parseText(text)
```

It'll return the same results as when you use `parse(callback)`.

## How is text parsed?

Receipt scanner takes an ambiguous approach to date and amounts. Amounts formatting is guessed from the number of amounts found with comma or with dots for decimal separation.

## What's the binaries for?

`poppler`: For pdftotext module and pdfimages binary (PDF processing)

`imagemagick`: For gm module (image preprocessing)

`graphicsmagick`: For gm module (image preprocessing)

`opencv3`: For node-opencv (image preprocessing)

`vips`: For sharp module (image preprocessing)

`tesseract --all-languages`: For node-tesseract module (OCR)

## Tests

`$ npm test`

You can use `npm test watch` to keep tests running, and `npm run cover` for coverage.

## Benchmark

Run `npm run benchmark` to get success rate using the [receipt-scanner-testdata](https://github.com/danschultzer/receipt-scanner-testdata) repository.

To generate random data set to benchmark run `npm run generate-benchmark-sample`.

## LICENSE

(The MIT License)

Copyright (c) 2016 Dan Schultzer, Benjamin Schultzer & the Contributors Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
