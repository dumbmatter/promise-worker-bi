import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();
promiseWorker.register(msg => {
  return msg;
});

self.addEventListener("message", e => {
  if (!Array.isArray(e.data)) {
    // custom message
    self.postMessage(e.data);
  }
});
