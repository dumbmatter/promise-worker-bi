import path from 'path';

if (!process.browser) {
  global.Worker = require('pseudo-worker');
  global.XMLHttpRequest = require('./xhr-shim');
}

var pathPrefix = path.join(__dirname, 'bundle/bundle-');

var assert = require('assert');
var PromiseWorker = require('../');

// Only run in browser
const testOnlyInBrowser = typeof SharedWorker !== 'undefined' ? it : it.skip;

describe('host -> worker', function () {

  this.timeout(120000);

  it('sends a message back and forth', function () {
    var worker = new Worker(pathPrefix + 'worker-pong.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('ping').then(function (res) {
      assert.equal(res, 'pong');
    });
  });

  it('echoes a message', function () {
    var worker = new Worker(pathPrefix + 'worker-echo.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('ping').then(function (res) {
      assert.equal(res, 'ping');
    });
  });

  it('pongs a message with a promise', function () {
    var worker = new Worker(pathPrefix + 'worker-pong-promise.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('ping').then(function (res) {
      assert.equal(res, 'pong');
    });
  });

  it('pongs a message with a promise, again', function () {
    var worker = new Worker(pathPrefix + 'worker-pong-promise.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('ping').then(function (res) {
      assert.equal(res, 'pong');
    });
  });

  it('echoes a message multiple times', function () {
    var worker = new Worker(pathPrefix + 'worker-echo.js');
    var promiseWorker = new PromiseWorker(worker);

    var words = [
      'foo', 'bar', 'baz',
      'quux', 'toto', 'bongo', 'haha', 'flim',
      'foob', 'foobar', 'bazzy', 'fifi', 'kiki'
    ];

    return Promise.all(words.map(function (word) {
      return promiseWorker.postMessage(word).then(function (res) {
        assert.equal(res, word);
      });
    }));
  });

  it('can have multiple PromiseWorkers', function () {
    var worker = new Worker(pathPrefix + 'worker-echo.js');
    var promiseWorker1 = new PromiseWorker(worker);
    var promiseWorker2 = new PromiseWorker(worker);

    return promiseWorker1.postMessage('foo').then(function (res) {
      assert.equal(res, 'foo');
    }).then(function () {
      return promiseWorker2.postMessage('bar');
    }).then(function (res) {
      assert.equal(res, 'bar');
    });
  });


  it('can have multiple PromiseWorkers 2', function () {
    var worker = new Worker(pathPrefix + 'worker-echo.js');
    var promiseWorkers = [
      new PromiseWorker(worker),
      new PromiseWorker(worker),
      new PromiseWorker(worker),
      new PromiseWorker(worker),
      new PromiseWorker(worker)
    ];

    return Promise.all(promiseWorkers.map(function (promiseWorker, i) {
      return promiseWorker.postMessage('foo' + i).then(function (res) {
        assert.equal(res, 'foo' + i);
      }).then(function () {
        return promiseWorker.postMessage('bar' + i);
      }).then(function (res) {
        assert.equal(res, 'bar' + i);
      });
    }));
  });

  it('handles synchronous errors', function () {
    var worker = new Worker(pathPrefix + 'worker-error-sync.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('foo').then(function () {
      throw new Error('expected an error here');
    }, function (err) {
      assert.equal(err.message, 'busted!');
    });
  });

  it('handles asynchronous errors', function () {
    var worker = new Worker(pathPrefix + 'worker-error-async.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('foo').then(function () {
      throw new Error('expected an error here');
    }, function (err) {
      assert.equal(err.message, 'oh noes');
    });
  });

  it('handles unregistered callbacks', function () {
    var worker = new Worker(pathPrefix + 'worker-empty.js');
    var promiseWorker = new PromiseWorker(worker);

    return promiseWorker.postMessage('ping').then(function () {
      throw new Error('expected an error here');
    }, function (err) {
      assert(err);
    });
  });

  it('allows custom additional behavior', function () {
    var worker = new Worker(pathPrefix + 'worker-echo-custom.js');
    var promiseWorker = new PromiseWorker(worker);
    return Promise.all([
      promiseWorker.postMessage('ping'),
      new Promise(function (resolve, reject) {
        function cleanup() {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
        }
        function onMessage(e) {
          if (Array.isArray(e.data)) {
            return;
          }
          cleanup();
          resolve(e.data);
        }
        function onError(e) {
          cleanup();
          reject(e);
        }
        worker.addEventListener('error', onError);
        worker.addEventListener('message', onMessage);
        worker.postMessage({hello: 'world'});
      }).then(function (data) {
        assert.equal(data.hello, 'world');
      })
    ]);
  });

  it('allows custom additional behavior 2', function () {
    var worker = new Worker(pathPrefix + 'worker-echo-custom-2.js');
    var promiseWorker = new PromiseWorker(worker);
    return Promise.all([
      promiseWorker.postMessage('ping'),
      new Promise(function (resolve, reject) {
        function cleanup() {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
        }
        function onMessage(e) {
          if (e.data !== '[2]') {
            return;
          }
          cleanup();
          resolve(e.data);
        }
        function onError(e) {
          cleanup();
          reject(e);
        }
        worker.addEventListener('error', onError);
        worker.addEventListener('message', onMessage);
        worker.postMessage('[2]');
      }).then(function (data) {
        assert.equal(data, '[2]');
      })
    ]);
  });

});

describe('worker -> host', function () {

  this.timeout(120000);

  it('sends a message from worker to host', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-ping.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'pong');
        done();
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return 'pong';
    });
  });

  it('echoes a message', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-echo.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'ping');
        done();
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return msg;
    });
  });

  it('pongs a message with a promise', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-ping.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'pong');
        done();
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return Promise.resolve('pong');
    });
  });

  it('pongs a message with a promise, again', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-ping.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'pong');
        done();
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return Promise.resolve('pong');
    });
  });

  it('echoes a message multiple times', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-echo-multiple.js');
    var promiseWorker = new PromiseWorker(worker);

    var words = [
      'foo', 'bar', 'baz',
      'quux', 'toto', 'bongo', 'haha', 'flim',
      'foob', 'foobar', 'bazzy', 'fifi', 'kiki'
    ];

    var i = 0;
    promiseWorker.register(function (msg) {
      assert.equal(msg, words[i % words.length]);
      i += 1;

      if (i === words.length * 2) {
        done();
      }

      return msg;
    });
  });

  it('can have multiple PromiseWorkers', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-echo.js');
    var promiseWorker1 = new PromiseWorker(worker);
    var promiseWorker2 = new PromiseWorker(worker);

    var i = 0;
    var j = 0;

    promiseWorker1.register(function (msg, hostID) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'ping');
      } else {
        throw new Error('Extra message');
      }

      if (i === 1 && j === 1) {
        done();
      }

      i += 1;
      return msg;
    });

    promiseWorker2.register(function (msg, hostID) {
      if (j === 0) {
        assert.equal(msg, 'ping');
      } else if (j === 1) {
        assert.equal(msg, 'ping');
      } else {
        throw new Error('Extra message');
      }

      if (i === 1 && j === 1) {
        done();
      }

      j += 1;
      return msg;
    });

  });

  it('handles synchronous errors', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-error-sync.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        i += 1;
        throw new Error('busted!');
      } else if (i === 1) {
        i += 1;
        assert.equal(msg, 'done');
        done();
      } else {
        throw new Error('Extra message');
      }
    });
  });

  it('handles asynchronous errors', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-error-async.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        i += 1;
        return Promise.resolve().then(function () {
          throw new Error('oh noes');
        });
      } else if (i === 1) {
        i += 1;
        assert.equal(msg, 'done');
        done();
      } else {
        throw new Error('Extra message');
      }
    });
  });

  testOnlyInBrowser('handles errors outside of responses', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-error-outside-response.js');
    var promiseWorker = new PromiseWorker(worker);

    promiseWorker.registerError(function (e) {
      assert(e.message.indexOf('error-outside-response') >= 0);
      assert(e.colno > 0);
      assert(e.lineno > 0);
      done();
    });
  });

  // This test is a little dicey, relies on setTimeout timing across host and worker
  it('handles unregistered callbacks', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-empty.js');
    var promiseWorker = new PromiseWorker(worker);

    promiseWorker.register('mistake!');

    setTimeout(function () {
      promiseWorker.register(function (msg) {
        assert.equal(msg, 'done');
        done();
      });
    }, 50);
  });

  it('allows custom additional behavior', function (done) {
    var worker = new Worker(pathPrefix + 'worker-host-echo-custom.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'done');
        done();
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return msg;
    });

    worker.addEventListener('message', function (e) {
      if (!Array.isArray(e.data)) { // custom message
        worker.postMessage(e.data);
      }
    });
  });

});

describe('bidirectional communication', function () {

  this.timeout(120000);

  it('echoes a message', function (done) {
    var worker = new Worker(pathPrefix + 'worker-bidirectional-echo.js');
    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    promiseWorker.register(function (msg) {
      if (i === 0) {
        assert.equal(msg, 'ping');
      } else if (i === 1) {
        assert.equal(msg, 'ping');

        promiseWorker.postMessage('pong').then(function (res) {
          assert.equal(res, 'pong');
          done();
        });
      } else {
        throw new Error('Extra message');
      }

      i += 1;
      return msg;
    });
  });

});

// This is a shitty test, not sure how to simulate a real multi-tab test
describe('Shared Worker', function () {

  this.timeout(120000);

  testOnlyInBrowser('works', function (done) {
    var worker = new SharedWorker(pathPrefix + 'worker-shared.js');

    var promiseWorker = new PromiseWorker(worker);

    var i = 0;
    var NUM_MESSAGES = 4; // 2 from broadcast, 1 from non-broadcast, and 2 from individual message responses
    function gotMessage() {
      i += 1;
      if (i === 4) {
        done();
      }
    }

    var expected = ['to all hosts', 'to just one host'];
    promiseWorker.register(function (msg) {
      var expectedMsg = expected.shift();
      assert.equal(msg, expectedMsg);
      gotMessage();
    });

    promiseWorker.postMessage('broadcast').then(function (res) {
      assert.equal(res, 'broadcast');
      gotMessage();
    }).then(function () {
      return promiseWorker.postMessage('foo').then(function (res) {
        assert.equal(res, 'foo');
        gotMessage();
      });
    });
  });

  testOnlyInBrowser('handles errors outside of responses', function (done) {
    var worker = new SharedWorker(pathPrefix + 'worker-host-error-outside-response.js');
    var promiseWorker = new PromiseWorker(worker);

    promiseWorker.registerError(function (e) {
      assert(e.message.indexOf('error-outside-response') >= 0);
      assert(e.colno > 0);
      assert(e.lineno > 0);
      done();
    });
  });

});