const cursor = require('ansi')(process.stdout);
const readline = require('readline');

var loadingSpinner = (function() {
  var index = 0,
      sequence = ['|', '/', '-', '\\'],
      settings = {},
      spinnerTimer;

  function start(interval, options) {
    // interval = interval || 75;
    options = options || {};

    settings = {
      clearChar:  !!options.clearChar,
      clearLine:  !!options.clearLine,
      doNotBlock: !!options.doNotBlock,
      hideCursor: !!options.hideCursor
    };

    if (settings.hideCursor) {
      cursor.hide();
    }

    index = 0;
    process.stdout.write(sequence[index]);
    spinnerTimer = function() {
      process.stdout.write(sequence[index].replace(/./g, '\b'));
      index = (index < sequence.length - 1) ? index + 1 : 0;
      process.stdout.write(sequence[index]);
    };

    // if (settings.doNotBlock) {
    //   spinnerTimer.unref();
    // }
  }

  function stop() {
    spinnerTimer = undefined

    if (settings.clearChar) {
      readline.moveCursor(process.stdout, -1, 0);
      readline.clearLine(process.stdout, 1);
    }

    if (settings.clearLine) {
      readline.clearLine(process.stdout, 0);
    }

    if (settings.hideCursor) {
      cursor.show();
    }
  }

  function setSequence(customSequence) {
    if (customSequence.constructor === Array) {
      sequence = customSequence;
    }
  }

  var si = setInterval(() => {
    if (typeof spinnerTimer === "function") {
      spinnerTimer()
    }
  },75)
  si.unref()

  return {
    start:       start,
    stop:        stop,
    setSequence: setSequence
  };
})();

module.exports = loadingSpinner;
