const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register(() => {
  return "pong";
});
