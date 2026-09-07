import { fromFakeError } from "./fakeError.ts";
import {
	MSGTYPE_HOST_CLOSE,
	MSGTYPE_HOST_ID,
	MSGTYPE_QUERY,
	MSGTYPE_WORKER_ERROR,
	type HostCloseMessage,
	type QueryMessage,
	type ResponseMessage,
} from "./message.ts";
import { PWBBase } from "./PWBBase.ts";

type ErrorCallback = (a: Error) => void;

// This used to be `worker instanceof Worker` but I have recieved reports that in some weird cases, Safari will
// inappropriately return false for that, even in obvious cases like:
//
//     blob = new Blob(["self.onmessage = function() {};"], { type: "text/javascript" });
//     worker = new Worker(window.URL.createObjectURL(blob));
//     console.log(worker instanceof Worker);
//
// So instead, let's do this test for worker.port which only exists on shared workers.
const isSharedWorker = (worker: SharedWorker | Worker): worker is SharedWorker => {
	return (worker as SharedWorker).port !== undefined;
};

let nextMessageID = 0;

export class PWBHost extends PWBBase {
	private _errorCallback: ErrorCallback | undefined;
	private _hostID: number | undefined; // Only defined on host
	private _hostIDQueue: (() => void)[] | undefined;
	private _worker: SharedWorker | Worker;

	constructor(worker: SharedWorker | Worker) {
		super();

		if (!isSharedWorker(worker)) {
			this._workerType = "Worker";

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
					this._postMessage([MSGTYPE_HOST_CLOSE, this._hostID]);
				}
			});
		}

		this._worker = worker;
		this._hostIDQueue = [];
	}

	registerError(cb: ErrorCallback) {
		// console.log('registerError', cb);
		this._errorCallback = cb;

		// Some browsers (Firefox) call onerror on every host, while others
		// (Chrome) do nothing. Let's disable that everywhere, for consistency.
		this._worker.addEventListener("error", (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		});
	}

	protected _postMessage(
		obj: QueryMessage | ResponseMessage | HostCloseMessage,
		_hostID?: unknown,
		transfer?: Transferable[] | undefined,
	) {
		// console.log('_postMessage', obj, _hostID, transfer);
		if (this._workerType === "Worker") {
			// @ts-expect-error - it doesn't know if _worker is Worker or SharedWorker, but I do
			this._worker.postMessage(obj, transfer);
		} else if (this._workerType === "SharedWorker") {
			// @ts-expect-error - it doesn't know if _worker is Worker or SharedWorker, but I do
			this._worker.port.postMessage(obj, transfer);
		} else {
			throw new Error("WTF");
		}
	}

	postMessage(
		userMessage: unknown,
		_hostID?: undefined,
		transfer?: Transferable[] | undefined,
	): Promise<any> {
		// console.log('postMessage', userMessage, _hostID, transfer);
		const actuallyPostMessage = (
			resolve: (value?: unknown) => void,
			reject: (reason?: unknown) => void,
		) => {
			const messageID = nextMessageID;
			nextMessageID += 1;

			const messageToSend: QueryMessage = [MSGTYPE_QUERY, messageID, userMessage, this._hostID];

			this._callbacks.set(messageID, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
			this._postMessage(messageToSend, undefined, transfer);
		};

		return new Promise((resolve, reject) => {
			// Don't send a message until hostID is known, otherwise it's a race
			// condition and sometimes hostID will be undefined.
			if (this._hostIDQueue !== undefined) {
				this._hostIDQueue.push(() => {
					actuallyPostMessage(resolve, reject);
				});
			} else {
				actuallyPostMessage(resolve, reject);
			}
		});
	}

	private _onMessage(e: MessageEvent) {
		const message = this._onMessageCommon(e);
		if (!message) {
			return;
		}

		if (message[0] === MSGTYPE_HOST_ID) {
			this._hostID = message[1];

			if (this._hostIDQueue !== undefined) {
				this._hostIDQueue.forEach((func) => {
					// Not entirely sure why setTimeout is needed, might be just for unit tests
					setTimeout(() => {
						func();
					}, 0);
				});
				this._hostIDQueue = undefined; // Never needed again after initial setup
			}
		} else if (message[0] === MSGTYPE_WORKER_ERROR) {
			if (message[1] !== null) {
				const error = fromFakeError(message[1]);
				if (this._errorCallback !== undefined) {
					this._errorCallback(error);
				}
			}
		}
	}
}
