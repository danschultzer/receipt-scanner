var Earliest = {
  'extract': function(values) {
    var min_found = null;

    for(var key in values) {
      if (!min_found || values[key].start.date() < min_found) {
        min_found = values[key].start.date();
      }
    }

    return min_found;
  },
};
module.exports = Earliest;
