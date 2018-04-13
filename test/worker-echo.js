var PromiseWorker = require("..");
var promiseWorker = new PromiseWorker();
promiseWorker.register(function(msg) {
  return msg;
});
