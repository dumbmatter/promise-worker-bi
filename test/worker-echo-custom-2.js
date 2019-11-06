const { PWBWorker } = require("..");

const promiseWorker = new PWBWorker();
promiseWorker.register(msg => {
  return msg;
});

self.addEventListener("message", e => {
  if (e.data === "[2]") {
    // custom message
    self.postMessage(e.data);
  }
});
