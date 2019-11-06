const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
  throw new Error("busted!");
});
