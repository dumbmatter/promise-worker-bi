const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register(msg => {
  return msg;
});
