var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function (hostID, msg) {
  return msg;
});

self.addEventListener('message', function (e) {
  if (e.data === '[2]') { // custom message
    self.postMessage(e.data);
  }
});