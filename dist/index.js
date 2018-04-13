"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var messageIDs = 0;

var MSGTYPE_QUERY = 0;
var MSGTYPE_RESPONSE = 1;
var MSGTYPE_HOST_ID = 2;
var MSGTYPE_HOST_CLOSE = 3;
var MSGTYPE_WORKER_ERROR = 4;
var MSGTYPES = [MSGTYPE_QUERY, MSGTYPE_RESPONSE, MSGTYPE_HOST_ID, MSGTYPE_HOST_CLOSE, MSGTYPE_WORKER_ERROR];

// Inlined from https://github.com/then/is-promise
var isPromise = function isPromise(obj) {
  return !!obj && ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object" || typeof obj === "function") && typeof obj.then === "function";
};

var toFakeError = function toFakeError(error) {
  var fakeError = {
    name: error.name,
    message: error.message
  };

  if (typeof error.stack === "string") {
    fakeError.stack = error.stack;
  }

  // These are non-standard properties, I think only in some versions of Firefox
  if (typeof error.fileName === "string") {
    fakeError.fileName = error.fileName;
  }
  if (typeof error.columnNumber === "number") {
    fakeError.columnNumber = error.columnNumber;
  }
  if (typeof error.lineNumber === "number") {
    fakeError.lineNumber = error.lineNumber;
  }

  return fakeError;
};

// any rather than FakeError for convenience
var fromFakeError = function fromFakeError(fakeError) {
  var error = new Error();
  return Object.assign(error, fakeError);
};

var PromiseWorker = function () {
  // Only defined on worker
  // Only defined on host
  function PromiseWorker(worker) {
    var _this = this;

    _classCallCheck(this, PromiseWorker);

    // console.log('constructor', worker);
    this._callbacks = new Map();

    // $FlowFixMe https://github.com/facebook/flow/issues/1517
    this._onMessage = this._onMessage.bind(this);

    if (worker === undefined) {
      if (typeof SharedWorkerGlobalScope !== "undefined" && self instanceof SharedWorkerGlobalScope) {
        this._workerType = "SharedWorker";

        this._hosts = new Map();
        this._maxHostID = -1;

        self.addEventListener("connect", function (e) {
          var port = e.ports[0];
          port.addEventListener("message", function (e2) {
            return _this._onMessage(e2);
          }); // eslint-disable-line no-undef
          port.start();

          _this._maxHostID += 1;
          var hostID = _this._maxHostID;
          _this._hosts.set(hostID, { port: port });

          // Send back hostID to this host, otherwise it has no way to know it
          _this._postMessageBi([MSGTYPE_HOST_ID, -1, hostID], hostID);
        });

        self.addEventListener("error", function (e) {
          // Just send to first host, so as to not duplicate error tracking
          var hostID = _this._hosts.keys().next().value;

          if (hostID !== undefined) {
            _this._postMessageBi([MSGTYPE_WORKER_ERROR, -1, toFakeError(e.error)], hostID);
          }
        });
      } else {
        this._workerType = "Worker";

        self.addEventListener("message", this._onMessage);

        // Since this is not a Shared Worker, hostID is always 0 so it's not strictly required to
        // send this back, but it makes the API a bit more consistent if there is the same
        // initialization handshake in both cases.
        this._postMessageBi([MSGTYPE_HOST_ID, -1, 0], 0);

        self.addEventListener("error", function (e) {
          _this._postMessageBi([MSGTYPE_WORKER_ERROR, -1, toFakeError(e.error)]);
        });
      }
    } else {
      if (worker instanceof Worker) {
        this._workerType = "Worker";

        // $FlowFixMe Seems to not recognize 'message' as valid type, but it is
        worker.addEventListener("message", this._onMessage);
      } else {
        this._workerType = "SharedWorker";

        worker.port.addEventListener("message", this._onMessage);
        worker.port.start();

        // Handle tab close. This isn't perfect, but there is no perfect method
        // http://stackoverflow.com/q/13662089/786644 and this should work like
        // 99% of the time. It is a memory leak if it fails, but for most use
        // cases, it shouldn't be noticeable.
        window.addEventListener("beforeunload", function () {
          // Prevent firing if we don't know hostID yet
          if (_this._hostID !== undefined) {
            _this._postMessageBi([MSGTYPE_HOST_CLOSE, -1, _this._hostID]);
          }
        });
      }

      this._worker = worker;
      this._hostIDQueue = [];
    }
  } // Only defined on host


  _createClass(PromiseWorker, [{
    key: "register",
    value: function register(cb) {
      // console.log('register', cb);
      this._queryCallback = cb;
    }
  }, {
    key: "registerError",
    value: function registerError(cb) {
      // console.log('registerError', cb);
      if (!this._worker) {
        throw new Error("registerError can only be called from host, not inside Worker");
      }

      this._errorCallback = cb;

      // Some browsers (Firefox) call onerror on every host, while others
      // (Chrome) do nothing. Let's disable that everywhere, for consistency.
      this._worker.addEventListener("error", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  }, {
    key: "_postMessageBi",
    value: function _postMessageBi(obj, targetHostID) {
      // console.log('_postMessageBi', obj, targetHostID);
      if (!this._worker && this._workerType === "SharedWorker") {
        // If targetHostID has been deleted, this will do nothing, which is fine I think
        this._hosts.forEach(function (_ref, hostID) {
          var port = _ref.port;

          if (targetHostID === undefined || targetHostID === hostID) {
            port.postMessage(obj);
          }
        });
      } else if (!this._worker && this._workerType === "Worker") {
        self.postMessage(obj);
      } else if (this._worker instanceof Worker) {
        this._worker.postMessage(obj);
      } else if (this._worker instanceof SharedWorker) {
        this._worker.port.postMessage(obj);
      } else {
        throw new Error("WTF");
      }
    }
  }, {
    key: "postMessage",
    value: function postMessage(userMessage, targetHostID) {
      var _this2 = this;

      // console.log('postMessage', userMessage, targetHostID);
      var actuallyPostMessage = function actuallyPostMessage(resolve, reject) {
        var messageID = messageIDs;
        messageIDs += 1;

        var messageToSend = [MSGTYPE_QUERY, messageID, userMessage, _this2._hostID];

        _this2._callbacks.set(messageID, function (error, result) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
        _this2._postMessageBi(messageToSend, targetHostID);
      };

      return new Promise(function (resolve, reject) {
        // Outside of worker, don't send a message until hostID is known, otherwise it's a race
        // condition and sometimes hostID will be undefined.
        if (_this2._hostIDQueue !== undefined && _this2._hostID === undefined) {
          _this2._hostIDQueue.push(function () {
            actuallyPostMessage(resolve, reject);
          });
        } else {
          actuallyPostMessage(resolve, reject);
        }
      });
    }
  }, {
    key: "_postResponse",
    value: function _postResponse(messageID, error, result, hostID) {
      // console.log('_postResponse', messageID, error, result);
      if (error) {
        this._postMessageBi([MSGTYPE_RESPONSE, messageID, toFakeError(error)], hostID);
      } else {
        this._postMessageBi([MSGTYPE_RESPONSE, messageID, null, result], hostID);
      }
    }
  }, {
    key: "_handleQuery",
    value: function _handleQuery(messageID, query, hostID) {
      var _this3 = this;

      // console.log('_handleQuery', messageID, query);
      try {
        var result = this._queryCallback(query, hostID);

        if (!isPromise(result)) {
          this._postResponse(messageID, null, result, hostID);
        } else {
          result.then(function (finalResult) {
            _this3._postResponse(messageID, null, finalResult, hostID);
          }, function (finalError) {
            _this3._postResponse(messageID, finalError, hostID);
          });
        }
      } catch (err) {
        this._postResponse(messageID, err);
      }
    }
  }, {
    key: "_onMessage",
    value: function _onMessage(e) {
      // eslint-disable-line no-undef
      // console.log('_onMessage', e.data);
      var message = e.data;
      if (!Array.isArray(message) || message.length < 3 || message.length > 4) {
        return; // Ignore - this message is not for us
      }

      if (MSGTYPES.indexOf(message[0]) < 0) {
        throw new Error("Invalid messageID");
      }
      var type = message[0];

      if (typeof message[1] !== "number") {
        throw new Error("Invalid messageID");
      }
      var messageID = message[1];

      if (type === MSGTYPE_QUERY) {
        var query = message[2];
        if (typeof message[3] !== "number" && message[3] !== undefined) {
          throw new Error("Invalid hostID");
        }
        var hostID = message[3];

        this._handleQuery(messageID, query, hostID);
      } else if (type === MSGTYPE_RESPONSE) {
        if (message[2] !== null && _typeof(message[2]) !== "object") {
          throw new Error("Invalid error");
        }
        var error = message[2] === null ? null : fromFakeError(message[2]);
        var result = message[3];

        var callback = this._callbacks.get(messageID);

        if (callback === undefined) {
          // Ignore - user might have created multiple PromiseWorkers.
          // This message is not for us.
          return;
        }

        this._callbacks.delete(messageID);
        callback(error, result);
      } else if (type === MSGTYPE_HOST_ID) {
        if (this._worker === undefined) {
          throw new Error("MSGTYPE_HOST_ID can only be sent to a host");
        }

        if (message[2] !== undefined && typeof message[2] !== "number") {
          throw new Error("Invalid hostID");
        }
        var _hostID = message[2];

        this._hostID = _hostID;

        if (this._hostIDQueue !== undefined) {
          this._hostIDQueue.forEach(function (func) {
            // Not entirely sure why setTimeout is needed, might be just for unit tests
            setTimeout(function () {
              func();
            }, 0);
          });
          this._hostIDQueue = undefined; // Never needed again after initial setup
        }
      } else if (type === MSGTYPE_HOST_CLOSE) {
        if (this._worker !== undefined) {
          throw new Error("MSGTYPE_HOST_CLOSE can only be sent to a worker");
        }

        if (typeof message[2] !== "number") {
          throw new Error("Invalid hostID");
        }
        var _hostID2 = message[2];

        this._hosts.delete(_hostID2);
      } else if (type === MSGTYPE_WORKER_ERROR) {
        if (this._worker === undefined) {
          throw new Error("MSGTYPE_WORKER_ERROR can only be sent to a host");
        }

        if (message[2] !== undefined && message[2] !== null && _typeof(message[2]) === "object") {
          var _error = fromFakeError(message[2]);
          if (this._errorCallback !== undefined) {
            this._errorCallback(_error);
          }
        }
      }
    }
  }]);

  return PromiseWorker;
}();

module.exports = PromiseWorker;
