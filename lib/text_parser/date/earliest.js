var Earliest = {
  'extract': function (values) {
    var minFound = null

    for (var key in values) {
      if (!minFound || values[key].start.date() < minFound) {
        minFound = values[key].start.date()
      }
    }

    return minFound
  }
}
module.exports = Earliest
