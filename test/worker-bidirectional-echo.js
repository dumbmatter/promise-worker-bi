var assert = require('assert');
var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();

promiseWorker.register(function (hostID, msg) {
  return msg;
});

promiseWorker.postMessage('ping').then(function (msg) {
    assert.equal(msg, 'ping');

    return promiseWorker.postMessage(msg);
});