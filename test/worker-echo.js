import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();
promiseWorker.register(msg => {
  return msg;
});
