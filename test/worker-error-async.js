const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register(() => {
  return Promise.resolve().then(() => {
    throw new Error("oh noes");
  });
});
