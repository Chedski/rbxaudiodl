/*
Copyright (c) 2018 Ivan Gabriele

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

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
