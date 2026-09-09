import {
	MSGTYPE_HOST_ID,
	MSGTYPE_HOST_LOCK,
	MSGTYPE_QUERY,
	MSGTYPE_WORKER_ERROR,
	MSGTYPE_WORKER_LOCK,
	type HostLockMessage,
	type QueryMessage,
	type ResponseMessage,
} from "./message.ts";
import { isSharedWorker, PWBBase } from "./PWBBase.ts";

let nextMessageID = 0;

type HostEvents = {
	close: Event;
	error: ErrorEvent;
};

export class PWBHost extends PWBBase<HostEvents> {
	private _hostID: number | undefined; // Only defined on host
	private _hostIDQueue: (() => void)[] | undefined;
	private _worker: SharedWorker | Worker;

	constructor(worker: SharedWorker | Worker) {
		super();

		if (!isSharedWorker(worker)) {
			worker.addEventListener("message", this._onMessage);
		} else {
			worker.port.addEventListener("message", this._onMessage);
			worker.port.start();
		}

		this._worker = worker;
		this._hostIDQueue = [];
	}

	protected _postMessage(
		obj: QueryMessage | ResponseMessage | HostLockMessage,
		_hostID?: unknown,
		transfer?: Transferable[] | undefined,
	) {
		// console.log('_postMessage', obj, _hostID, transfer);
		if (isSharedWorker(this._worker)) {
			if (transfer) {
				this._worker.port.postMessage(obj, transfer);
			} else {
				this._worker.port.postMessage(obj);
			}
		} else {
			if (transfer) {
				this._worker.postMessage(obj, transfer);
			} else {
				this._worker.postMessage(obj);
			}
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

	private handleWorkerLock(workerLockId: string) {
		// Worker already has this lock, so if we ever get it, that means the worker has died somehow. Request shared so all tabs get it at once
		navigator.locks.request(
			workerLockId,
			{
				mode: "shared",
			},
			async () => {
				// console.log(`Lock ${workerLockId} acquired from worker`);

				this.dispatchEvent(new Event("close"));
			},
		);
	}

	private _onMessage(e: MessageEvent) {
		const message = this._onMessageCommon(e);
		if (!message) {
			return;
		}

		if (message[0] === MSGTYPE_HOST_ID) {
			if (this._hostID !== undefined) {
				throw new Error("Received duplicate hostID message");
			}

			const hostID = message[1];
			this._hostID = hostID;

			if (this._hostIDQueue !== undefined) {
				for (const cb of this._hostIDQueue) {
					// Not entirely sure why setTimeout is needed, might be just for unit tests
					setTimeout(() => {
						cb();
					}, 0);
				}
				this._hostIDQueue = undefined; // Never needed again after initial setup
			}

			if (message[2] !== undefined) {
				this.handleWorkerLock(message[2]);
			}

			// Use Web Locks API to work around the lack of a native way for the worker to know when the tab has closed. Worker will request a lock, and only get it when the tab is closed. Previously this used the "beforeunload" event but that is not guaranteed to fire and also caused problems when an app using promise-worker-bi wanted to use "beforeunload" to let the user cancel closing the tab.

			// Don't assume hostID is unique, could be two instances of this library with different workers
			const hostLockId = `pwb-host-${Math.random()}`;

			navigator.locks.request(hostLockId, async () => {
				// console.log(`Lock ${hostLockId} acquired on host ${hostID}`);

				this._postMessage([MSGTYPE_HOST_LOCK, hostID, hostLockId]);

				// Hold this lock until this tab closes
				return new Promise(() => {});
			});
		} else if (message[0] === MSGTYPE_WORKER_ERROR) {
			// Why all this complicated error stuff rather than adding a listener on this._worker for the "error" event? Some browsers (Firefox) call  on every host, while others (Chrome) don't. So for consistency, handle it on my own.
			const error = message[1];
			this.dispatchEvent(new ErrorEvent("error", { error }));
		} else if (message[0] === MSGTYPE_WORKER_LOCK) {
			this.handleWorkerLock(message[1]);
		}
	}
}
