const assert = require("assert");
const PromiseWorker = require("..");

const promiseWorker = new PromiseWorker();

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
