import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
  throw new Error("busted!");
});
