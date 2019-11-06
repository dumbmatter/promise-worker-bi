const { PWBWorker } = require("..");

// eslint-disable-next-line no-unused-vars
const promiseWorker = new PWBWorker();

setTimeout(() => {
  throw new Error("error-outside-response");
}, 1000);
