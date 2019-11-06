const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();

promiseWorker.register((msg, hostID) => {
  return hostID;
});
