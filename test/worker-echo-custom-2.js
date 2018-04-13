const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();
promiseWorker.register(msg => {
  return msg;
});

self.addEventListener("message", e => {
  if (e.data === "[2]") {
    // custom message
    self.postMessage(e.data);
  }
});
