import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

promiseWorker.register((msg, hostID) => {
  if (msg === "broadcast") {
    promiseWorker.postMessage("to all hosts");
  } else {
    promiseWorker.postMessage("to just one host", hostID);
  }

  // Also respond to the initial message with an echo
  return msg;
});
