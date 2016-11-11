var Largest = {
  'extract': function (values) {
    var maxFound = 0.0
    var maxFoundResult = false

    for (var key in values) {
      if (values[key].amount > maxFound) {
        maxFound = values[key].amount
        maxFoundResult = values[key].text
      }
    }

    return maxFoundResult
  }
}

module.exports = Largest
