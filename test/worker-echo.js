const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.register(msg => {
  return msg;
});
