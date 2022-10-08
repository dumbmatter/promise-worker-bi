import { PWBWorker } from "../dist/esmodules";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const promiseWorker = new PWBWorker();

setTimeout(() => {
  throw new Error("error-outside-response");
}, 1000);
