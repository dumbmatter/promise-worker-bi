var assert = require("assert");
var PromiseWorker = require("..");
var promiseWorker = new PromiseWorker();

var words = [
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

words.forEach(function(word) {
  return promiseWorker.postMessage(word).then(function(res) {
    assert.equal(res, word);
    return promiseWorker.postMessage(res);
  });
});
