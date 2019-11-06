const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
  return "pong";
});
