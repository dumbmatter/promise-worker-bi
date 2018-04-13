const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();

promiseWorker.register((msg, hostID) => {
  return hostID;
});
