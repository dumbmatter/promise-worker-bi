// @flow

type QueryCallback = (any[]) => any;

let messageIDs = 0;

const MSGTYPE_QUERY = 0;
const MSGTYPE_RESPONSE = 1;

// Inlined from https://github.com/then/is-promise
const isPromise = obj => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

class PromiseWorker {
  _callbacks: Map<number, (string | null, any) => void>;
  _queryCallback: QueryCallback;
  _worker: Worker | void;

  constructor(worker?: Worker) {
    this._callbacks = new Map();

    // $FlowFixMe https://github.com/facebook/flow/issues/1517
    this._onMessage = this._onMessage.bind(this);

    if (worker === undefined) {
      self.addEventListener('message', this._onMessage);
    } else {
      this._worker = worker;

      // $FlowFixMe Seems to not recognize 'message' as valid type, but it is
      worker.addEventListener('message', this._onMessage);
    }
  }

  register(cb: QueryCallback) {
    this._queryCallback = cb;
  }

  _postMessageBi(obj: any) {
    if (this._worker) {
      this._worker.postMessage(obj);
    } else {
      self.postMessage(obj);
    }
  }

  postMessage(userMessage: any) {
    return new Promise((resolve, reject) => {
      const messageID = messageIDs;
      messageIDs += 1;

      const messageToSend = [MSGTYPE_QUERY, messageID, userMessage];

      this._callbacks.set(messageID, (errorMsg: string | null, result: any) => {
        if (errorMsg) {
          reject(new Error(errorMsg));
        } else {
          resolve(result);
        }
      });
      this._postMessageBi(messageToSend);
    });
  }

  _postResponse(messageID: number, error: Error | null, result: any) {
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
      this._postMessageBi([MSGTYPE_RESPONSE, messageID, error.message]);
    } else {
      this._postMessageBi([MSGTYPE_RESPONSE, messageID, null, result]);
    }
  }

  _handleQuery(messageID: number, query: any) {
    try {
      const result = this._queryCallback(query);

      if (!isPromise(result)) {
        this._postResponse(messageID, null, result);
      } else {
        result.then((finalResult) => {
          this._postResponse(messageID, null, finalResult);
        }, (finalError) => {
          this._postResponse(messageID, finalError);
        });
      }
    } catch (err) {
      this._postResponse(messageID, err);
    }
  }

  _onMessage(e: MessageEvent) { // eslint-disable-line no-undef
    const message = e.data;
    if (!Array.isArray(message) || message.length < 3 || message.length > 4) {
      return; // Ignore - this message is not for us
    }

    if (message[0] !== MSGTYPE_QUERY && message[0] !== MSGTYPE_RESPONSE) {
      return; // Ignore - this message is not for us
    }
    const type = message[0];

    if (typeof message[1] !== 'number') {
      return; // Ignore - this message is not for us
    }
    const messageID: number = message[1];

    if (type === MSGTYPE_QUERY) {
      const query = message[2];

      this._handleQuery(messageID, query);
    } else if (type === MSGTYPE_RESPONSE) {
      if (message[2] !== null && typeof message[2] !== 'string') {
        return; // Ignore - this message is not for us
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
    }
  }
}

module.exports = PromiseWorker;
