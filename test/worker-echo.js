var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function (hostID, msg) {
  return msg;
});