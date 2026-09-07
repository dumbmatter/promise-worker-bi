type ErrorCallback = (a: Error) => void;
type QueryCallback = (a: unknown, b: number | undefined) => any;

type FakeError = {
	name: string;
	message: string;
	stack?: string;
	fileName?: string;
	columnNumber?: number;
	lineNumber?: number;
};

const isFakeError = (x: unknown): x is FakeError => {
	if (typeof x !== "object" || x === null) {
		return false;
	}

	const candidate = x as Record<string, unknown>;

	if (typeof candidate.name !== "string" || typeof candidate.message !== "string") {
		return false;
	}

	if (candidate.stack !== undefined && typeof candidate.stack !== "string") {
		return false;
	}
	if (candidate.fileName !== undefined && typeof candidate.fileName !== "string") {
		return false;
	}
	if (candidate.columnNumber !== undefined && typeof candidate.columnNumber !== "number") {
		return false;
	}
	if (candidate.lineNumber !== undefined && typeof candidate.lineNumber !== "number") {
		return false;
	}

	return true;
};

let messageIDs = 0;

const MSGTYPE_QUERY = 0;
const MSGTYPE_RESPONSE = 1;
const MSGTYPE_HOST_ID = 2;
const MSGTYPE_HOST_CLOSE = 3;
const MSGTYPE_WORKER_ERROR = 4;

type QueryMessage =
	| [typeof MSGTYPE_QUERY, number, unknown]
	| [typeof MSGTYPE_QUERY, number, unknown, number | undefined];
type ResponseMessage =
	| [typeof MSGTYPE_RESPONSE, number, FakeError]
	| [typeof MSGTYPE_RESPONSE, number, null, unknown];
type HostIdMessage = [typeof MSGTYPE_HOST_ID, number];
type HostCloseMessage = [typeof MSGTYPE_HOST_CLOSE, number];
type WorkerErrorMessage = [typeof MSGTYPE_WORKER_ERROR, FakeError];

type Message =
	| QueryMessage
	| ResponseMessage
	| HostIdMessage
	| HostCloseMessage
	| WorkerErrorMessage;

const parseMessage = (message: unknown) => {
	if (!Array.isArray(message) || message.length < 2 || message.length > 4) {
		return; // Ignore - this message is not for us
	}

	const type = message[0];

	if (type === MSGTYPE_QUERY) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid messageID");
		}
		if (typeof message[3] !== "number" && message[3] !== undefined) {
			throw new Error("Invalid hostID");
		}
		return message as QueryMessage;
	}

	if (type === MSGTYPE_RESPONSE) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid messageID");
		}
		if (message[2] !== null && !isFakeError(message[2])) {
			throw new Error("Invalid error");
		}
		return message as ResponseMessage;
	}

	if (type === MSGTYPE_HOST_ID) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid hostId");
		}
		return message as HostIdMessage;
	}

	if (type === MSGTYPE_HOST_CLOSE) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid hostId");
		}
		return message as HostCloseMessage;
	}

	if (type === MSGTYPE_WORKER_ERROR) {
		if (!isFakeError(message[1])) {
			throw new Error("Invalid error");
		}
		return message as WorkerErrorMessage;
	}

	throw new Error("Invalid message type");
};

// Inlined from https://github.com/then/is-promise
const isPromise = (obj: unknown) =>
	!!obj &&
	(typeof obj === "object" || typeof obj === "function") &&
	typeof (obj as any).then === "function";

const toFakeError = (error: Error): FakeError => {
	const fakeError: FakeError = {
		name: error.name,
		message: error.message,
	};

	if (typeof error.stack === "string") {
		fakeError.stack = error.stack;
	}

	// These are non-standard properties, I think only in some versions of Firefox
	// @ts-expect-error
	if (typeof error.fileName === "string") {
		// @ts-expect-error
		fakeError.fileName = error.fileName;
	}
	// @ts-expect-error
	if (typeof error.columnNumber === "number") {
		// @ts-expect-error
		fakeError.columnNumber = error.columnNumber;
	}
	// @ts-expect-error
	if (typeof error.lineNumber === "number") {
		// @ts-expect-error
		fakeError.lineNumber = error.lineNumber;
	}

	return fakeError;
};

// Object rather than FakeError for convenience
const fromFakeError = (fakeError: unknown): Error => {
	const error = new Error();
	return Object.assign(error, fakeError);
};

const logError = (err: Error) => {
	// Logging in the console makes debugging in the worker easier
	console.error("Error in Worker:");
	console.error(err); // Safari needs it on new line
};

abstract class PWBBase {
	_callbacks: Map<number, (a: Error | null, b: unknown) => void>;

	_queryCallback: QueryCallback;

	_workerType: "SharedWorker" | "Worker" | undefined;

	constructor() {
		// console.log('constructor', worker);
		this._callbacks = new Map();

		this._queryCallback = () => {};

		// @ts-expect-error
		this._onMessage = this._onMessage.bind(this);
	}

	register(cb: QueryCallback) {
		// console.log('register', cb);
		this._queryCallback = cb;
	}

	// From worker, 2nd param could be hostID if sending to specific host. From either, 3rd param could be an array of transferable objects
	abstract _postMessage(
		obj: Message,
		hostID?: number | undefined,
		transfer?: Transferable[] | undefined,
	): void;

	_postResponse(
		messageID: number,
		error: Error | null,
		result?: unknown,
		hostID?: number | undefined,
	) {
		// console.log('_postResponse', messageID, error, result);
		if (error) {
			logError(error);

			this._postMessage([MSGTYPE_RESPONSE, messageID, toFakeError(error)], hostID);
		} else {
			// Hackily identify when message contains transferable objects
			if (
				typeof result === "object" &&
				result !== null &&
				Object.hasOwn(result, "message") &&
				Object.hasOwn(result, "_PWB_TRANSFER")
			) {
				this._postMessage(
					[MSGTYPE_RESPONSE, messageID, null, (result as any).message],
					hostID,
					(result as any)._PWB_TRANSFER,
				);
			} else {
				this._postMessage([MSGTYPE_RESPONSE, messageID, null, result], hostID);
			}
		}
	}

	_handleQuery(message: QueryMessage) {
		const messageID = message[1];
		const query = message[2];
		const hostID = message[3];

		try {
			const result = this._queryCallback(query, hostID);

			if (!isPromise(result)) {
				this._postResponse(messageID, null, result, hostID);
			} else {
				result.then(
					(finalResult: unknown) => {
						this._postResponse(messageID, null, finalResult, hostID);
					},
					(finalError: Error) => {
						this._postResponse(messageID, finalError, hostID);
					},
				);
			}
		} catch (err) {
			this._postResponse(messageID, err as Error);
		}
	}

	// Either return messageID and type if further processing is needed, or undefined otherwise
	_onMessageCommon(e: MessageEvent) {
		// console.log('_onMessageCommon', e.data);
		const message = parseMessage(e.data);
		if (!message) {
			return; // Ignore - this message is not for us
		}

		if (message[0] === MSGTYPE_QUERY) {
			this._handleQuery(message);
			return;
		}
		if (message[0] === MSGTYPE_RESPONSE) {
			const messageID = message[1];
			const error: Error | null = message[2] === null ? null : fromFakeError(message[2]);

			const callback = this._callbacks.get(messageID);

			if (callback === undefined) {
				// Ignore - user might have created multiple PromiseWorkers.
				// This message is not for us.
				return;
			}

			this._callbacks.delete(messageID);
			callback(error, message[3]);
			return;
		}

		return message;
	}
}

class PWBHost extends PWBBase {
	_errorCallback: ErrorCallback | undefined;

	_hostID: number | undefined; // Only defined on host

	_hostIDQueue: (() => void)[] | undefined;

	_worker: SharedWorker | Worker;

	constructor(worker: SharedWorker | Worker) {
		super();

		// The following if statement used to check `worker instanceof Worker` but I have recieved
		// reports that in some weird cases, Safari will inappropriately return false for that, even
		// in obvious cases like:
		//
		//     blob = new Blob(["self.onmessage = function() {};"], { type: "text/javascript" });
		//     worker = new Worker(window.URL.createObjectURL(blob));
		//     console.log(worker instanceof Worker);
		//
		// So instead, let's do this test for worker.port which only exists on shared workers.
		// @ts-expect-error
		if (worker.port === undefined) {
			this._workerType = "Worker";

			// @ts-expect-error
			worker.addEventListener("message", this._onMessage);
		} else {
			this._workerType = "SharedWorker";

			// @ts-expect-error - it doesn't know if _worker is Worker or SharedWorker, but I do
			worker.port.addEventListener("message", this._onMessage);
			// @ts-expect-error - it doesn't know if _worker is Worker or SharedWorker, but I do
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

	_postMessage(
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
			const messageID = messageIDs;
			messageIDs += 1;

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

	_onMessage(e: MessageEvent) {
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

class PWBWorker extends PWBBase {
	_hosts: Map<number, { port: MessagePort }>;

	_maxHostID: number;

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

	_postMessage(
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
			const messageID = messageIDs;
			messageIDs += 1;

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

	_onMessage(e: MessageEvent) {
		const message = this._onMessageCommon(e);
		if (!message) {
			return;
		}

		if (message[0] === MSGTYPE_HOST_CLOSE) {
			this._hosts.delete(message[1]);
		}
	}
}

export { PWBHost, PWBWorker };
