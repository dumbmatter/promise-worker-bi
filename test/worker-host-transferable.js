import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

(async () => {
  const buffer = new ArrayBuffer(1);

  await promiseWorker.postMessage(buffer);
  assert.equal(buffer.byteLength, 1);

  // byteLength goes to 0 when transfered https://developer.chrome.com/blog/transferable-objects-lightning-fast/
  await promiseWorker.postMessage(buffer, undefined, [buffer]);
  assert.equal(buffer.byteLength, 0);
})();
