const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register(() => {
  throw new Error("busted!");
});
