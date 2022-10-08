import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

const buffer = new ArrayBuffer(1);

promiseWorker.postMessage(buffer);
assert.equal(buffer.byteLength, 1);

// byteLength goes to 0 when transfered https://developer.chrome.com/blog/transferable-objects-lightning-fast/
promiseWorker.postMessage(buffer, undefined, [buffer]);
assert.equal(buffer.byteLength, 0);
