const PromiseWorker = require("..");

// eslint-disable-next-line no-unused-vars
const promiseWorker = new PromiseWorker();

setTimeout(() => {
  throw new Error("error-outside-response");
}, 1000);
