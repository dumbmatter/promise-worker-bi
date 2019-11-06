const assert = require("assert");
const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();

promiseWorker.register(msg => {
  return msg;
});

promiseWorker.postMessage("ping").then(msg => {
  assert.equal(msg, "ping");

  return promiseWorker.postMessage(msg);
});
