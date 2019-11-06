const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
  return Promise.resolve("pong");
});
