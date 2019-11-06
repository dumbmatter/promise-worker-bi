const assert = require("assert");
const { PWBHost } = require("../dist/commonjs");

const pathPrefix = "/base/dist/test/bundle/bundle-";

// Only run in browser
const testSharedWorker = typeof SharedWorker !== "undefined" ? it : it.skip;

describe("host -> worker", function() {
  this.timeout(120000);

  it("sends a message back and forth", () => {
    const worker = new Worker(`${pathPrefix}worker-pong.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("ping").then(res => {
      assert.equal(res, "pong");
    });
  });

  it("echoes a message", () => {
    const worker = new Worker(`${pathPrefix}worker-echo.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("ping").then(res => {
      assert.equal(res, "ping");
    });
  });

  it("pongs a message with a promise", () => {
    const worker = new Worker(`${pathPrefix}worker-pong-promise.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("ping").then(res => {
      assert.equal(res, "pong");
    });
  });

  it("pongs a message with a promise, again", () => {
    const worker = new Worker(`${pathPrefix}worker-pong-promise.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("ping").then(res => {
      assert.equal(res, "pong");
    });
  });

  it("echoes a message multiple times", () => {
    const worker = new Worker(`${pathPrefix}worker-echo.js`);
    const promiseWorker = new PWBHost(worker);

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

    return Promise.all(
      words.map(word => {
        return promiseWorker.postMessage(word).then(res => {
          assert.equal(res, word);
        });
      })
    );
  });

  it("can have multiple PromiseWorkers", () => {
    const worker = new Worker(`${pathPrefix}worker-echo.js`);
    const promiseWorker1 = new PWBHost(worker);
    const promiseWorker2 = new PWBHost(worker);

    return promiseWorker1
      .postMessage("foo")
      .then(res => {
        assert.equal(res, "foo");
      })
      .then(() => {
        return promiseWorker2.postMessage("bar");
      })
      .then(res => {
        assert.equal(res, "bar");
      });
  });

  it("can have multiple PromiseWorkers 2", () => {
    const worker = new Worker(`${pathPrefix}worker-echo.js`);
    const promiseWorkers = [
      new PWBHost(worker),
      new PWBHost(worker),
      new PWBHost(worker),
      new PWBHost(worker),
      new PWBHost(worker)
    ];

    return Promise.all(
      promiseWorkers.map((promiseWorker, i) => {
        return promiseWorker
          .postMessage(`foo${i}`)
          .then(res => {
            assert.equal(res, `foo${i}`);
          })
          .then(() => {
            return promiseWorker.postMessage(`bar${i}`);
          })
          .then(res => {
            assert.equal(res, `bar${i}`);
          });
      })
    );
  });

  it("handles synchronous errors", () => {
    const worker = new Worker(`${pathPrefix}worker-error-sync.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("foo").then(
      () => {
        throw new Error("expected an error here");
      },
      err => {
        assert.equal(err.message, "busted!");

        // Either have the file name or error message in the stack. Chrome has both, Firefox has just the file name, Node has just the error message.
        assert(
          err.stack.includes("worker-error-sync") ||
            err.stack.includes("busted!")
        );
      }
    );
  });

  it("handles asynchronous errors", () => {
    const worker = new Worker(`${pathPrefix}worker-error-async.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("foo").then(
      () => {
        throw new Error("expected an error here");
      },
      err => {
        assert.equal(err.message, "oh noes");
        // Firefox stack does not include the error message here, for some reason
        if (!navigator || !navigator.userAgent.includes("Firefox")) {
          assert(err.stack.indexOf("oh noes") >= 0);
        }
      }
    );
  });

  it("handles unregistered callbacks", () => {
    const worker = new Worker(`${pathPrefix}worker-empty.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker.postMessage("ping").then(
      () => {
        throw new Error("expected an error here");
      },
      err => {
        assert(err);
      }
    );
  });

  it("allows custom additional behavior", () => {
    const worker = new Worker(`${pathPrefix}worker-echo-custom.js`);
    const promiseWorker = new PWBHost(worker);
    return Promise.all([
      promiseWorker.postMessage("ping"),
      new Promise((resolve, reject) => {
        function cleanup() {
          // eslint-disable-next-line no-use-before-define
          worker.removeEventListener("message", onMessage);
          // eslint-disable-next-line no-use-before-define
          worker.removeEventListener("error", onError);
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
        worker.addEventListener("error", onError);
        worker.addEventListener("message", onMessage);
        worker.postMessage({ hello: "world" });
      }).then(data => {
        assert.equal(data.hello, "world");
      })
    ]);
  });

  it("allows custom additional behavior 2", () => {
    const worker = new Worker(`${pathPrefix}worker-echo-custom-2.js`);
    const promiseWorker = new PWBHost(worker);
    return Promise.all([
      promiseWorker.postMessage("ping"),
      new Promise((resolve, reject) => {
        function cleanup() {
          // eslint-disable-next-line no-use-before-define
          worker.removeEventListener("message", onMessage);
          // eslint-disable-next-line no-use-before-define
          worker.removeEventListener("error", onError);
        }
        function onMessage(e) {
          if (e.data !== "[2]") {
            return;
          }
          cleanup();
          resolve(e.data);
        }
        function onError(e) {
          cleanup();
          reject(e);
        }
        worker.addEventListener("error", onError);
        worker.addEventListener("message", onMessage);
        worker.postMessage("[2]");
      }).then(data => {
        assert.equal(data, "[2]");
      })
    ]);
  });

  it("makes hostID immediately available", () => {
    const worker = new Worker(`${pathPrefix}worker-hostid.js`);
    const promiseWorker = new PWBHost(worker);

    return promiseWorker
      .postMessage("ping")
      .then(res => {
        assert.equal(res, 0);
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            return promiseWorker
              .postMessage("ping")
              .then(res => {
                assert.equal(res, 0);
                resolve();
              })
              .catch(reject);
          }, 500);
        });
      });
  });
});

describe("worker -> host", function() {
  this.timeout(120000);

  it("sends a message from worker to host", done => {
    const worker = new Worker(`${pathPrefix}worker-host-ping.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "pong");
        done();
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return "pong";
    });
  });

  it("echoes a message", done => {
    const worker = new Worker(`${pathPrefix}worker-host-echo.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "ping");
        done();
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return msg;
    });
  });

  it("pongs a message with a promise", done => {
    const worker = new Worker(`${pathPrefix}worker-host-ping.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "pong");
        done();
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return Promise.resolve("pong");
    });
  });

  it("pongs a message with a promise, again", done => {
    const worker = new Worker(`${pathPrefix}worker-host-ping.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "pong");
        done();
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return Promise.resolve("pong");
    });
  });

  it("echoes a message multiple times", done => {
    const worker = new Worker(`${pathPrefix}worker-host-echo-multiple.js`);
    const promiseWorker = new PWBHost(worker);

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

    let i = 0;
    promiseWorker.register(msg => {
      assert.equal(msg, words[i % words.length]);
      i += 1;

      if (i === words.length * 2) {
        done();
      }

      return msg;
    });
  });

  it("can have multiple PromiseWorkers", done => {
    const worker = new Worker(`${pathPrefix}worker-host-echo.js`);
    const promiseWorker1 = new PWBHost(worker);
    const promiseWorker2 = new PWBHost(worker);

    let i = 0;
    let j = 0;

    promiseWorker1.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "ping");
      } else {
        throw new Error("Extra message");
      }

      if (i === 1 && j === 1) {
        done();
      }

      i += 1;
      return msg;
    });

    promiseWorker2.register(msg => {
      if (j === 0) {
        assert.equal(msg, "ping");
      } else if (j === 1) {
        assert.equal(msg, "ping");
      } else {
        throw new Error("Extra message");
      }

      if (i === 1 && j === 1) {
        done();
      }

      j += 1;
      return msg;
    });
  });

  it("handles synchronous errors", done => {
    const worker = new Worker(`${pathPrefix}worker-host-error-sync.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        i += 1;
        throw new Error("busted!");
      } else if (i === 1) {
        i += 1;
        assert.equal(msg, "done");
        done();
      } else {
        throw new Error("Extra message");
      }
    });
  });

  it("handles asynchronous errors", done => {
    const worker = new Worker(`${pathPrefix}worker-host-error-async.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    // eslint-disable-next-line consistent-return
    promiseWorker.register(msg => {
      if (i === 0) {
        i += 1;
        return Promise.resolve().then(() => {
          throw new Error("oh noes");
        });
      }

      if (i === 1) {
        i += 1;
        assert.equal(msg, "done");
        done();
      } else {
        throw new Error("Extra message");
      }
    });
  });

  testSharedWorker("handles errors outside of responses", done => {
    const worker = new Worker(
      `${pathPrefix}worker-host-error-outside-response.js`
    );
    const promiseWorker = new PWBHost(worker);

    promiseWorker.registerError(e => {
      assert(e.message.indexOf("error-outside-response") >= 0);
      assert(e.stack.indexOf("error-outside-response") >= 0);
      done();
    });
  });

  // This test is a little dicey, relies on setTimeout timing across host and worker
  it("handles unregistered callbacks", done => {
    const worker = new Worker(`${pathPrefix}worker-host-empty.js`);
    const promiseWorker = new PWBHost(worker);

    promiseWorker.register("mistake!");

    setTimeout(() => {
      promiseWorker.register(msg => {
        assert.equal(msg, "done");
        done();
      });
    }, 50);
  });

  it("allows custom additional behavior", done => {
    const worker = new Worker(`${pathPrefix}worker-host-echo-custom.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "done");
        done();
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return msg;
    });

    worker.addEventListener("message", e => {
      if (!Array.isArray(e.data)) {
        // custom message
        worker.postMessage(e.data);
      }
    });
  });
});

describe("bidirectional communication", function() {
  this.timeout(120000);

  it("echoes a message", done => {
    const worker = new Worker(`${pathPrefix}worker-bidirectional-echo.js`);
    const promiseWorker = new PWBHost(worker);

    let i = 0;
    promiseWorker.register(msg => {
      if (i === 0) {
        assert.equal(msg, "ping");
      } else if (i === 1) {
        assert.equal(msg, "ping");

        promiseWorker.postMessage("pong").then(res => {
          assert.equal(res, "pong");
          done();
        });
      } else {
        throw new Error("Extra message");
      }

      i += 1;
      return msg;
    });
  });
});

// This is a shitty test, not sure how to simulate a real multi-tab test
describe("Shared Worker", function() {
  this.timeout(120000);

  testSharedWorker("works", done => {
    const worker = new SharedWorker(`${pathPrefix}worker-shared.js`);

    const promiseWorker = new PWBHost(worker);

    let i = 0;
    const NUM_MESSAGES = 4; // 2 from broadcast, 1 from non-broadcast, and 2 from individual message responses
    function gotMessage() {
      i += 1;
      if (i === NUM_MESSAGES) {
        done();
      }
    }

    const expected = ["to all hosts", "to just one host"];
    promiseWorker.register(msg => {
      const expectedMsg = expected.shift();
      assert.equal(msg, expectedMsg);
      gotMessage();
    });

    promiseWorker
      .postMessage("broadcast")
      .then(res => {
        assert.equal(res, "broadcast");
        gotMessage();
      })
      .then(() => {
        return promiseWorker.postMessage("foo").then(res => {
          assert.equal(res, "foo");
          gotMessage();
        });
      });
  });

  testSharedWorker("handles errors outside of responses", done => {
    const worker = new SharedWorker(
      `${pathPrefix}worker-host-error-outside-response.js`
    );
    const promiseWorker = new PWBHost(worker);

    promiseWorker.registerError(e => {
      assert(e.message.indexOf("error-outside-response") >= 0);
      assert(e.stack.indexOf("error-outside-response") >= 0);
      done();
    });
  });
});
