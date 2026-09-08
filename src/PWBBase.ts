import { fromFakeError, toFakeError } from "./fakeError.ts";
import {
	MSGTYPE_QUERY,
	MSGTYPE_RESPONSE,
	parseMessage,
	type Message,
	type QueryMessage,
} from "./message.ts";

type QueryCallback = (a: unknown, b: number | undefined) => any;

// Inlined from https://github.com/then/is-promise
const isPromise = (obj: unknown) =>
	!!obj &&
	(typeof obj === "object" || typeof obj === "function") &&
	typeof (obj as any).then === "function";

export const logError = (err: Error) => {
	// Logging in the console makes debugging in the worker easier
	console.error("Error in Worker:");
	console.error(err); // Safari needs it on new line
};

// This used to be `worker instanceof Worker` but I have recieved reports that in some weird cases, Safari will
// inappropriately return false for that, even in obvious cases like:
//
//     blob = new Blob(["self.onmessage = function() {};"], { type: "text/javascript" });
//     worker = new Worker(window.URL.createObjectURL(blob));
//     console.log(worker instanceof Worker);
//
// So instead, let's do this test for worker.port which only exists on shared workers.
export const isSharedWorker = (worker: SharedWorker | Worker): worker is SharedWorker => {
	return (worker as SharedWorker).port !== undefined;
};

export abstract class PWBBase {
	protected _callbacks: Map<number, (a: Error | null, b: unknown) => void>;
	protected _queryCallback: QueryCallback;

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
	protected abstract _postMessage(
		obj: Message,
		hostID?: number | undefined,
		transfer?: Transferable[] | undefined,
	): void;

	private _postResponse(
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

	private _handleQuery(message: QueryMessage) {
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

	protected _onMessageCommon(e: MessageEvent) {
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
