const assert = require("assert");
const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();

promiseWorker.postMessage("foo").then(
  /* istanbul ignore next */ () => {
    throw new Error("expected an error here");
  },
  err => {
    assert.equal(err.message, "oh noes");
    return promiseWorker.postMessage("done");
  }
);
