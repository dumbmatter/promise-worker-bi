'use strict';

var assert = require('assert');
var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();
promiseWorker.postMessage('ping').then(function (msg) {
    assert.equal(msg, 'pong');

    return promiseWorker.postMessage(msg);
})