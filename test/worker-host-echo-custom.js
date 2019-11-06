import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

promiseWorker.postMessage("ping");

new Promise((resolve, reject) => {
  function onMessage(e) {
    if (Array.isArray(e.data)) {
      return;
    }
    resolve(e.data);
  }

  /* istanbul ignore next */
  function onError(e) {
    reject(e);
  }

  self.addEventListener("error", onError);
  self.addEventListener("message", onMessage);

  self.postMessage({ hello: "world" });
}).then(data => {
  assert.equal(data.hello, "world");
  promiseWorker.postMessage("done");
});
