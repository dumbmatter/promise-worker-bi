import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

const buffers = [];
promiseWorker.register((buffer) => {
  assert.equal(buffer.byteLength, 1);
  buffers.push(buffer);
  return {
    message: buffer,
    _PWB_TRANSFER: [buffer],
  };
});

// Not a great test, cause the setTimeout may not trigger until after the test has ended
setTimeout(() => {
  assert.equal(buffers.length, 2);
  for (const buffer of buffers) {
    assert.equal(buffer.byteLength, 0);
  }
}, 100);
