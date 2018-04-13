const assert = require("assert");
const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.postMessage("ping").then((msg) => {
  assert.equal(msg, "ping");

  return promiseWorker.postMessage(msg);
});
