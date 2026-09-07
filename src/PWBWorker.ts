import { toFakeError } from "./fakeError.ts";
import {
	MSGTYPE_HOST_CLOSE,
	MSGTYPE_HOST_ID,
	MSGTYPE_QUERY,
	MSGTYPE_WORKER_ERROR,
	type HostIdMessage,
	type QueryMessage,
	type ResponseMessage,
	type WorkerErrorMessage,
} from "./message.ts";
import { logError, PWBBase } from "./PWBBase.ts";

let nextMessageID = 0;

export class PWBWorker extends PWBBase {
	private _hosts: Map<number, { port: MessagePort }>;
	private _maxHostID: number;

	constructor() {
		super();

		// Only actually used for SharedWorker
		this._hosts = new Map();
		this._maxHostID = -1;

		if (
			// @ts-expect-error
			typeof SharedWorkerGlobalScope !== "undefined" &&
			// @ts-expect-error
			self instanceof SharedWorkerGlobalScope
		) {
			this._workerType = "SharedWorker";

			self.addEventListener("connect", (e) => {
				// @ts-expect-error
				const port = e.ports[0];
				port.addEventListener("message", (e2: MessageEvent) => this._onMessage(e2));
				port.start();

				this._maxHostID += 1;
				const hostID = this._maxHostID;
				this._hosts.set(hostID, { port });

				// Send back hostID to this host, otherwise it has no way to know it
				this._postMessage([MSGTYPE_HOST_ID, hostID], hostID);
			});

			self.addEventListener("error", (e) => {
				logError(e.error);

				// Just send to first host, so as to not duplicate error tracking
				const hostID = this._hosts.keys().next().value;

				if (hostID !== undefined) {
					this._postMessage([MSGTYPE_WORKER_ERROR, toFakeError(e.error)], hostID);
				}
			});
		} else {
			this._workerType = "Worker";

			self.addEventListener("message", this._onMessage);

			// Since this is not a Shared Worker, hostID is always 0 so it's not strictly required to
			// send this back, but it makes the API a bit more consistent if there is the same
			// initialization handshake in both cases.
			this._postMessage([MSGTYPE_HOST_ID, 0], 0);

			self.addEventListener("error", (e) => {
				logError(e.error);

				this._postMessage([MSGTYPE_WORKER_ERROR, toFakeError(e.error)]);
			});
		}
	}

	protected _postMessage(
		message: QueryMessage | ResponseMessage | HostIdMessage | WorkerErrorMessage,
		targetHostID?: number | undefined,
		transfer?: Transferable[] | undefined,
	) {
		// console.log('_postMessage', obj, targetHostID);
		if (this._workerType === "SharedWorker") {
			// If targetHostID has been deleted, this will do nothing, which is fine I think
			this._hosts.forEach(({ port }, hostID) => {
				if (targetHostID === undefined || targetHostID === hostID) {
					// @ts-expect-error TypeScript thinks transfer can't be undefined
					port.postMessage(message, transfer);
				}
			});
		} else if (this._workerType === "Worker") {
			// @ts-expect-error TypeScript thinks self is window, which has a different postMessage call signature. In a worker, this is correct.
			self.postMessage(message, transfer);
		} else {
			throw new Error("WTF");
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

		if (message[0] === MSGTYPE_HOST_CLOSE) {
			this._hosts.delete(message[1]);
		}
	}
}
