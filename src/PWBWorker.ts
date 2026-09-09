/// <reference lib="webworker" />

import {
	MSGTYPE_HOST_ID,
	MSGTYPE_HOST_LOCK,
	MSGTYPE_QUERY,
	MSGTYPE_WORKER_ERROR,
	MSGTYPE_WORKER_LOCK,
	type HostIdMessage,
	type QueryMessage,
	type ResponseMessage,
	type WorkerErrorMessage,
	type WorkerLockMessage,
} from "./message.ts";
import { logError, PWBBase } from "./PWBBase.ts";

let nextMessageID = 0;

type WorkerEvents = Record<string, Event>;

export class PWBWorker extends PWBBase<WorkerEvents> {
	private _hosts = new Map<number, { port: MessagePort }>();
	private _maxHostID = -1;
	private _sharedWorker: boolean;
	private _workerLockAcquired = false;

	constructor() {
		super();

		const workerLockId = `pwb-worker-${Math.random()}`;

		navigator.locks.request(workerLockId, async () => {
			// console.log(`Lock ${workerLockId} acquired on worker`);

			this._workerLockAcquired = true;

			// Any hosts that exist at the time the lock is acquired need to be told about it, so they can start listening
			this._postMessage([MSGTYPE_WORKER_LOCK, workerLockId]);

			// Hold this lock until this worker closes
			return new Promise(() => {});
		});

		if (typeof SharedWorkerGlobalScope !== "undefined" && self instanceof SharedWorkerGlobalScope) {
			this._sharedWorker = true;
			const _self = self as SharedWorkerGlobalScope;

			_self.addEventListener("connect", (e) => {
				const port = e.ports[0]!;
				port.addEventListener("message", (e2: MessageEvent) => this._onMessage(e2));
				port.start();

				this._maxHostID += 1;
				const hostID = this._maxHostID;
				this._hosts.set(hostID, { port });

				// Send back hostID to this host, otherwise it has no way to know it
				let message: HostIdMessage;
				if (this._workerLockAcquired) {
					// Worker lock is already acquired, so no need for a separate message to tell the host about it
					message = [MSGTYPE_HOST_ID, hostID, workerLockId];
				} else {
					message = [MSGTYPE_HOST_ID, hostID];
				}
				this._postMessage(message, hostID);
			});

			_self.addEventListener("error", (e) => {
				logError(e.error);
				e.preventDefault();

				// Just send to first host, so as to not duplicate error tracking
				const hostID = this._hosts.keys().next().value;

				if (hostID !== undefined) {
					this._postMessage([MSGTYPE_WORKER_ERROR, e.error], hostID);
				}
			});
		} else {
			this._sharedWorker = false;
			const _self = self as DedicatedWorkerGlobalScope;

			_self.addEventListener("message", this._onMessage);

			// Since this is not a Shared Worker, hostID is always 0 so it's not strictly required to
			// send this back, but it makes the API a bit more consistent if there is the same
			// initialization handshake in both cases.
			this._postMessage([MSGTYPE_HOST_ID, 0], 0);

			_self.addEventListener("error", (e) => {
				logError(e.error);
				e.preventDefault();

				this._postMessage([MSGTYPE_WORKER_ERROR, e.error]);
			});
		}
	}

	protected _postMessage(
		message:
			| QueryMessage
			| ResponseMessage
			| HostIdMessage
			| WorkerLockMessage
			| WorkerErrorMessage,
		targetHostID?: number | undefined,
		transfer?: Transferable[] | undefined,
	) {
		// console.log('_postMessage', obj, targetHostID);
		if (this._sharedWorker) {
			// If targetHostID has been deleted, this will do nothing, which is fine I think
			for (const [hostID, { port }] of this._hosts) {
				if (targetHostID === undefined || targetHostID === hostID) {
					if (transfer) {
						port.postMessage(message, transfer);
					} else {
						port.postMessage(message);
					}
				}
			}
		} else {
			const _self = self as DedicatedWorkerGlobalScope;
			if (transfer) {
				_self.postMessage(message, transfer);
			} else {
				_self.postMessage(message);
			}
		}
	}

	postMessage(
		userMessage: unknown,
		targetHostID?: number | undefined,
		transfer?: Transferable[] | undefined,
	): Promise<unknown> {
		// console.log('postMessage', userMessage, targetHostID);
		const actuallyPostMessage = (
			resolve: (value?: unknown) => void,
			reject: (reason?: unknown) => void,
		) => {
			const messageID = nextMessageID;
			nextMessageID += 1;

			const messageToSend: QueryMessage = [MSGTYPE_QUERY, messageID, userMessage];

			this._callbacks.set(messageID, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
			this._postMessage(messageToSend, targetHostID, transfer);
		};

		return new Promise((resolve, reject) => {
			actuallyPostMessage(resolve, reject);
		});
	}

	private _onMessage(e: MessageEvent) {
		const message = this._onMessageCommon(e);
		if (!message) {
			return;
		}

		if (message[0] === MSGTYPE_HOST_LOCK) {
			navigator.locks.request(message[2], () => {
				// console.log(`Lock ${message[2]} acquired from host ${message[1]}`);

				// If hosts.size is ever 1  here, that means there are no tabs left, so either something went horribly wrong (would rather not delete the last host then, in case it's still alive) or the last tab is closing (and the worker will automatically be killed soon)
				if (this._hosts.size > 1) {
					this._hosts.delete(message[1]);
				}
			});
		}
	}
}
