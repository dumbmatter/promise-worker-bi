import assert from "assert";
import { PWBWorker } from "../dist/esmodules";

const promiseWorker = new PWBWorker();

const words = [
  "foo",
  "bar",
  "baz",
  "quux",
  "toto",
  "bongo",
  "haha",
  "flim",
  "foob",
  "foobar",
  "bazzy",
  "fifi",
  "kiki"
];

words.forEach(word => {
  return promiseWorker.postMessage(word).then(res => {
    assert.equal(res, word);
    return promiseWorker.postMessage(res);
  });
});
