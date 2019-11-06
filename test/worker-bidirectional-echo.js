import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

promiseWorker.register(msg => {
  return msg;
});

promiseWorker.postMessage("ping").then(msg => {
  assert.equal(msg, "ping");

  return promiseWorker.postMessage(msg);
});
