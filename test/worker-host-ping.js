const assert = require("assert");
const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.postMessage("ping").then(msg => {
  assert.equal(msg, "pong");

  return promiseWorker.postMessage(msg);
});
