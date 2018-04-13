const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();

setTimeout(() => {
  throw new Error("error-outside-response");
}, 1000);
