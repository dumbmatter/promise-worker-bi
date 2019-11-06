import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();
promiseWorker.postMessage("ping").then(msg => {
  assert.equal(msg, "pong");

  return promiseWorker.postMessage(msg);
});
