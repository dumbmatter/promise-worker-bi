// @flow

type ErrorCallback = Error => void;
type QueryCallback = (any[], number | void) => any;

type FakeError = {
  name: string,
  message: string,
  stack?: string,
  fileName?: string,
  columnNumber?: number,
  lineNumber?: number
};

let messageIDs = 0;

const MSGTYPE_QUERY = 0;
const MSGTYPE_RESPONSE = 1;
const MSGTYPE_HOST_ID = 2;
const MSGTYPE_HOST_CLOSE = 3;
const MSGTYPE_WORKER_ERROR = 4;
const MSGTYPES = [
  MSGTYPE_QUERY,
  MSGTYPE_RESPONSE,
  MSGTYPE_HOST_ID,
  MSGTYPE_HOST_CLOSE,
  MSGTYPE_WORKER_ERROR
];

// Inlined from https://github.com/then/is-promise
const isPromise = obj =>
  !!obj &&
  (typeof obj === "object" || typeof obj === "function") &&
  typeof obj.then === "function";

const toFakeError = (error: Error): FakeError => {
  const fakeError: FakeError = {
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
const fromFakeError = (fakeError: Object): Error => {
  const error = new Error();
  return Object.assign(error, fakeError);
};

const logError = (err: Error) => {
  // Logging in the console makes debugging in the worker easier
  /* eslint-disable no-console */
  console.error('Error in Worker:');
  console.error(err); // Safari needs it on new line
  /* eslint-enable no-console */
};

class PromiseWorker {
  _callbacks: Map<number, (Error | null, any) => void>;
  _errorCallback: ErrorCallback | void;
  _hostID: number | void; // Only defined on host
  _hostIDQueue: (() => void)[] | void; // Only defined on host
  _hosts: Map<number, { port: MessagePort }>; // Only defined on worker
  _maxHostID: number;
  _queryCallback: QueryCallback;
  _worker: SharedWorker | Worker | void;
  _workerType: "SharedWorker" | "Worker";

  constructor(worker?: Worker) {
    // console.log('constructor', worker);
    this._callbacks = new Map();

    // $FlowFixMe https://github.com/facebook/flow/issues/1517
    this._onMessage = this._onMessage.bind(this);

    if (worker === undefined) {
      if (
        typeof SharedWorkerGlobalScope !== "undefined" &&
        self instanceof SharedWorkerGlobalScope
      ) {
        this._workerType = "SharedWorker";

        this._hosts = new Map();
        this._maxHostID = -1;

        self.addEventListener("connect", e => {
          const port = e.ports[0];
          port.addEventListener("message", (e2: MessageEvent) =>
            this._onMessage(e2)
          ); // eslint-disable-line no-undef
          port.start();

          this._maxHostID += 1;
          const hostID = this._maxHostID;
          this._hosts.set(hostID, { port });

          // Send back hostID to this host, otherwise it has no way to know it
          this._postMessageBi([MSGTYPE_HOST_ID, -1, hostID], hostID);
        });

        self.addEventListener("error", (e: any) => {
          logError(e.error);

          // Just send to first host, so as to not duplicate error tracking
          const hostID = this._hosts.keys().next().value;

          if (hostID !== undefined) {
            this._postMessageBi(
              [MSGTYPE_WORKER_ERROR, -1, toFakeError(e.error)],
              hostID
            );
          }
        });
      } else {
        this._workerType = "Worker";

        self.addEventListener("message", this._onMessage);

        // Since this is not a Shared Worker, hostID is always 0 so it's not strictly required to
        // send this back, but it makes the API a bit more consistent if there is the same
        // initialization handshake in both cases.
        this._postMessageBi([MSGTYPE_HOST_ID, -1, 0], 0);

        self.addEventListener("error", (e: any) => {
          logError(e.error);

          this._postMessageBi([MSGTYPE_WORKER_ERROR, -1, toFakeError(e.error)]);
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
        window.addEventListener("beforeunload", () => {
          // Prevent firing if we don't know hostID yet
          if (this._hostID !== undefined) {
            this._postMessageBi([MSGTYPE_HOST_CLOSE, -1, this._hostID]);
          }
        });
      }

      this._worker = worker;
      this._hostIDQueue = [];
    }
  }

  register(cb: QueryCallback) {
    // console.log('register', cb);
    this._queryCallback = cb;
  }

  registerError(cb: ErrorCallback) {
    // console.log('registerError', cb);
    if (!this._worker) {
      throw new Error(
        "registerError can only be called from host, not inside Worker"
      );
    }

    this._errorCallback = cb;

    // Some browsers (Firefox) call onerror on every host, while others
    // (Chrome) do nothing. Let's disable that everywhere, for consistency.
    this._worker.addEventListener("error", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  _postMessageBi(obj: any[], targetHostID: number | void) {
    // console.log('_postMessageBi', obj, targetHostID);
    if (!this._worker && this._workerType === "SharedWorker") {
      // If targetHostID has been deleted, this will do nothing, which is fine I think
      this._hosts.forEach(({ port }, hostID) => {
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

  postMessage(userMessage: any, targetHostID: number | void): Promise<any> {
    // console.log('postMessage', userMessage, targetHostID);
    const actuallyPostMessage = (resolve, reject) => {
      const messageID = messageIDs;
      messageIDs += 1;

      const messageToSend = [
        MSGTYPE_QUERY,
        messageID,
        userMessage,
        this._hostID
      ];

      this._callbacks.set(messageID, (error: Error | null, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      this._postMessageBi(messageToSend, targetHostID);
    };

    return new Promise((resolve, reject) => {
      // Outside of worker, don't send a message until hostID is known, otherwise it's a race
      // condition and sometimes hostID will be undefined.
      if (this._hostIDQueue !== undefined && this._hostID === undefined) {
        this._hostIDQueue.push(() => {
          actuallyPostMessage(resolve, reject);
        });
      } else {
        actuallyPostMessage(resolve, reject);
      }
    });
  }

  _postResponse(
    messageID: number,
    error: Error | null,
    result: any,
    hostID: number | void
  ) {
    // console.log('_postResponse', messageID, error, result);
    if (error) {
      logError(error);

      this._postMessageBi(
        [MSGTYPE_RESPONSE, messageID, toFakeError(error)],
        hostID
      );
    } else {
      this._postMessageBi([MSGTYPE_RESPONSE, messageID, null, result], hostID);
    }
  }

  _handleQuery(messageID: number, query: any, hostID: number | void) {
    // console.log('_handleQuery', messageID, query);
    try {
      const result = this._queryCallback(query, hostID);

      if (!isPromise(result)) {
        this._postResponse(messageID, null, result, hostID);
      } else {
        result.then(
          finalResult => {
            this._postResponse(messageID, null, finalResult, hostID);
          },
          finalError => {
            this._postResponse(messageID, finalError, hostID);
          }
        );
      }
    } catch (err) {
      this._postResponse(messageID, err);
    }
  }

  _onMessage(e: MessageEvent) {
    // eslint-disable-line no-undef
    // console.log('_onMessage', e.data);
    const message = e.data;
    if (!Array.isArray(message) || message.length < 3 || message.length > 4) {
      return; // Ignore - this message is not for us
    }

    if (MSGTYPES.indexOf(message[0]) < 0) {
      throw new Error("Invalid messageID");
    }
    const type = message[0];

    if (typeof message[1] !== "number") {
      throw new Error("Invalid messageID");
    }
    const messageID: number = message[1];

    if (type === MSGTYPE_QUERY) {
      const query = message[2];
      if (typeof message[3] !== "number" && message[3] !== undefined) {
        throw new Error("Invalid hostID");
      }
      const hostID: number | void = message[3];

      this._handleQuery(messageID, query, hostID);
    } else if (type === MSGTYPE_RESPONSE) {
      if (message[2] !== null && typeof message[2] !== "object") {
        throw new Error("Invalid error");
      }
      const error: Error | null =
        message[2] === null ? null : fromFakeError(message[2]);
      const result = message[3];

      const callback = this._callbacks.get(messageID);

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
      const hostID: number | void = message[2];

      this._hostID = hostID;

      if (this._hostIDQueue !== undefined) {
        this._hostIDQueue.forEach(func => {
          // Not entirely sure why setTimeout is needed, might be just for unit tests
          setTimeout(() => {
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
      const hostID: number = message[2];

      this._hosts.delete(hostID);
    } else if (type === MSGTYPE_WORKER_ERROR) {
      if (this._worker === undefined) {
        throw new Error("MSGTYPE_WORKER_ERROR can only be sent to a host");
      }

      if (
        message[2] !== undefined &&
        message[2] !== null &&
        typeof message[2] === "object"
      ) {
        const error = fromFakeError(message[2]);
        if (this._errorCallback !== undefined) {
          this._errorCallback(error);
        }
      }
    }
  }
}

module.exports = PromiseWorker;
