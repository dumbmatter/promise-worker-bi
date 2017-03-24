// @flow

type QueryCallback = (any[], number | void) => any;

let messageIDs = 0;

const MSGTYPE_QUERY = 0;
const MSGTYPE_RESPONSE = 1;
const MSGTYPE_HOST_ID = 2;
const MSGTYPES = [MSGTYPE_QUERY, MSGTYPE_RESPONSE, MSGTYPE_HOST_ID];

// Inlined from https://github.com/then/is-promise
const isPromise = obj => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

class PromiseWorker {
  _callbacks: Map<number, (string | null, any) => void>;
  _hostID: number | void; // Only defined on host
  _hosts: Map<number, { port: MessagePort }>; // Only defined on worker
  _maxHostID: number;
  _queryCallback: QueryCallback;
  _worker: SharedWorker | Worker | void;
  _workerType: 'SharedWorker' | 'Worker';

  constructor(worker?: Worker) {
// console.log('constructor', worker);
    this._callbacks = new Map();

    // $FlowFixMe https://github.com/facebook/flow/issues/1517
    this._onMessage = this._onMessage.bind(this);

    if (worker === undefined) {
      if (typeof SharedWorkerGlobalScope !== 'undefined' && self instanceof SharedWorkerGlobalScope) {
        this._workerType = 'SharedWorker';

        this._hosts = new Map();
        this._maxHostID = -1;

        self.addEventListener('connect', (e) => {
          const port = e.ports[0];
          port.addEventListener('message', (e2: MessageEvent) => this._onMessage(e2)); // eslint-disable-line no-undef
          port.start();

          this._maxHostID += 1;
          const hostID = this._maxHostID;
          this._hosts.set(hostID, { port });

          // Send back hostID to this host, otherwise it has no way to know it
          this._postMessageBi([MSGTYPE_HOST_ID, -1, hostID], hostID);
        });
      } else {
        this._workerType = 'Worker';

        self.addEventListener('message', this._onMessage);
      }
    } else {
      if (worker instanceof Worker) {
        this._workerType = 'Worker';

        // $FlowFixMe Seems to not recognize 'message' as valid type, but it is
        worker.addEventListener('message', this._onMessage);
      } else {
        this._workerType = 'SharedWorker';

        worker.port.addEventListener('message', this._onMessage);
        worker.port.start();
      }

      this._worker = worker;
    }
  }

  register(cb: QueryCallback) {
// console.log('register', cb);
    this._queryCallback = cb;
  }

  _postMessageBi(obj: any[], targetHostID: number | void) {
// console.log('_postMessageBi', obj, targetHostID);
    if (!this._worker && this._workerType === 'SharedWorker') {
      this._hosts.forEach(({ port }, hostID) => {
        if (targetHostID === undefined || targetHostID === hostID) {
          port.postMessage(obj);
        }
      });
    } else if (!this._worker && this._workerType === 'Worker') {
      self.postMessage(obj);
    } else if (this._worker instanceof Worker) {
      this._worker.postMessage(obj);
    } else if (this._worker instanceof SharedWorker) {
      this._worker.port.postMessage(obj);
    } else {
      throw new Error('WTF');
    }
  }

  postMessage(userMessage: any, targetHostID: number | void) {
// console.log('postMessage', userMessage, targetHostID);
    return new Promise((resolve, reject) => {
      const messageID = messageIDs;
      messageIDs += 1;

      const messageToSend = [MSGTYPE_QUERY, messageID, userMessage, this._hostID];

      this._callbacks.set(messageID, (errorMsg: string | null, result: any) => {
        if (errorMsg) {
          reject(new Error(errorMsg));
        } else {
          resolve(result);
        }
      });
      this._postMessageBi(messageToSend, targetHostID);
    });
  }

  _postResponse(messageID: number, error: Error | null, result: any, hostID: number | void) {
// console.log('_postResponse', messageID, error, result);
    if (error) {
      /* istanbul ignore else */
      if (typeof console !== 'undefined' && 'error' in console) {
        // This is to make errors easier to debug. I think it's important
        // enough to just leave here without giving the user an option
        // to silence it.

        /* eslint-disable no-console */
        console.error('Error when generating response:');
        console.error(error); // Safari needs it on new line
        /* eslint-enable no-console */
      }
      this._postMessageBi([MSGTYPE_RESPONSE, messageID, error.message], hostID);
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
        result.then((finalResult) => {
          this._postResponse(messageID, null, finalResult, hostID);
        }, (finalError) => {
          this._postResponse(messageID, finalError, hostID);
        });
      }
    } catch (err) {
      this._postResponse(messageID, err);
    }
  }

  _onMessage(e: MessageEvent) { // eslint-disable-line no-undef
// console.log('_onMessage', e.data);
    const message = e.data;
    if (!Array.isArray(message) || message.length < 3 || message.length > 4) {
      return; // Ignore - this message is not for us
    }

    if (MSGTYPES.indexOf(message[0]) < 0) {
      throw new Error('Invalid messageID');
    }
    const type = message[0];

    if (typeof message[1] !== 'number') {
      throw new Error('Invalid messageID');
    }
    const messageID: number = message[1];

    if (type === MSGTYPE_QUERY) {
      const query = message[2];
      if (typeof message[3] !== 'number' && message[3] !== undefined) {
        throw new Error('Invalid hostID');
      }
      const hostID: number | void = message[3];

      this._handleQuery(messageID, query, hostID);
    } else if (type === MSGTYPE_RESPONSE) {
      if (message[2] !== null && typeof message[2] !== 'string') {
        throw new Error('Invalid errorMsg');
      }
      const errorMsg: string | null = message[2];
      const result = message[3];

      const callback = this._callbacks.get(messageID);

      if (callback === undefined) {
        // Ignore - user might have created multiple PromiseWorkers.
        // This message is not for us.
        return;
      }

      this._callbacks.delete(messageID);
      callback(errorMsg, result);
    } else if (type === MSGTYPE_HOST_ID) {
      if (this._worker === undefined) {
        throw new Error('hostID can only be sent to a host');
      }

      if (typeof message[2] !== 'number') {
        throw new Error('Invalid hostID');
      }
      const hostID: number | void = message[2];

      this._hostID = hostID;
    }
  }
}

module.exports = PromiseWorker;
