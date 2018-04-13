const assert = require("assert");
const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();

promiseWorker.postMessage("foo").then(
  /* istanbul ignore next */ () => {
    throw new Error("expected an error here");
  },
  (err) => {
    assert(err);

    setTimeout(() => {
      promiseWorker.postMessage("done");
    }, 100);
  }
);
