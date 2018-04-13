var PromiseWorker = require("..");
var promiseWorker = new PromiseWorker();
promiseWorker.register(function() {
  throw new Error("busted!");
});
