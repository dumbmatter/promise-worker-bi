var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function (msg) {
  return msg;
});

self.addEventListener('message', function (e) {
  if (!Array.isArray(e.data)) { // custom message
    self.postMessage(e.data);
  }
});