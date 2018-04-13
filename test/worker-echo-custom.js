const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register((msg) => {
  return msg;
});

self.addEventListener("message", (e) => {
  if (!Array.isArray(e.data)) {
    // custom message
    self.postMessage(e.data);
  }
});
