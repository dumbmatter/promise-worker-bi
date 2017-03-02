'use strict';

var assert = require('assert');
var PromiseWorker = require('..');
var promiseWorker = new PromiseWorker();

promiseWorker.postMessage('ping'),

new Promise(function (resolve, reject) {
    function onMessage(e) {
      if (typeof e.data === 'string') {
        return;
      }
      resolve(e.data);
    }

    /* istanbul ignore next */
    function onError(e) {
      reject(e);
    }

    self.addEventListener('error', onError);
    self.addEventListener('message', onMessage);

    self.postMessage({hello: 'world'});
}).then(function (data) {
    assert.equal(data.hello, 'world');
    promiseWorker.postMessage('done');
});
