import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

const buffers = [];
promiseWorker.register((buffer) => {
  assert.equal(buffer.byteLength, 1);
  buffers.push(buffer);
  return buffer;
});

setTimeout(() => {
  assert.equal(buffers.length, 2);
  for (const buffer of buffers) {
    assert.equal(buffer.byteLength, 0);
  }
}, 500);
