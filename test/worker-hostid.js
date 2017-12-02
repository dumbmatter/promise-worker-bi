var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
console.log('hi');
promiseWorker.register(function (msg, hostID) {
  return hostID;
});