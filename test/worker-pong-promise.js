'use strict';

var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.register(function () {
  return Promise.resolve('pong');
});