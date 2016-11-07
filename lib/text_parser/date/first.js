var First = {
  'extract': function (values) {
    if (values.length > 0) {
      return values[0].start.date()
    }
  }
}
module.exports = First
