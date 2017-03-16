var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function () {
  return 'pong';
});