var PromiseWorker = require("..");
var promiseWorker = new PromiseWorker();

setTimeout(function() {
  throw new Error("error-outside-response");
}, 1000);
