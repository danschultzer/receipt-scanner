var Largest = {
  'extract': function(values) {
    var max_found = 0.0,
      max_found_result = false;

    for (var key in values) {
      if (values[key].amount > max_found) {
        max_found = values[key].amount;
        max_found_result = values[key].text;
      }
    }

    return max_found_result;
  },
};

module.exports = Largest;
