'use strict';

var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function (msg) {
  return msg;
});

self.addEventListener('message', function (e) {
  if (typeof e.data !== 'string') { // custom message
    self.postMessage(e.data);
  }
});