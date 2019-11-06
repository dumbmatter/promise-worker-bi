import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

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
