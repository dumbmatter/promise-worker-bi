'use strict';

var assert = require('assert');
var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();

promiseWorker.postMessage('foo').then(/* istanbul ignore next */ function () {
  throw new Error('expected an error here');
}, function (err) {
  assert.equal(err.message, 'oh noes');
  return promiseWorker.postMessage('done');
});