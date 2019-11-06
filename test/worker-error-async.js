import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
  return Promise.resolve().then(() => {
    throw new Error("oh noes");
  });
});
