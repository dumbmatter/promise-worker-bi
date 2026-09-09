export const MSGTYPE_QUERY = 0;
export const MSGTYPE_RESPONSE = 1;
export const MSGTYPE_HOST_ID = 2;
export const MSGTYPE_HOST_LOCK = 3;
export const MSGTYPE_WORKER_LOCK = 4;
export const MSGTYPE_WORKER_ERROR = 5;

export type QueryMessage =
	| [type: typeof MSGTYPE_QUERY, messageId: number, query: unknown]
	| [type: typeof MSGTYPE_QUERY, messageId: number, query: unknown, hostId: number | undefined];
export type ResponseMessage =
	| [type: typeof MSGTYPE_RESPONSE, messageId: number, error: Error]
	| [type: typeof MSGTYPE_RESPONSE, messageId: number, error: null, result: unknown];
export type HostIdMessage =
	| [type: typeof MSGTYPE_HOST_ID, hostId: number]
	| [type: typeof MSGTYPE_HOST_ID, hostId: number, workerLockId: string];
export type HostLockMessage = [type: typeof MSGTYPE_HOST_LOCK, hostID: number, hostLockId: string];
export type WorkerLockMessage = [type: typeof MSGTYPE_WORKER_LOCK, workerLockId: string];
export type WorkerErrorMessage = [type: typeof MSGTYPE_WORKER_ERROR, error: Error];

export type Message =
	| QueryMessage
	| ResponseMessage
	| HostIdMessage
	| HostLockMessage
	| WorkerLockMessage
	| WorkerErrorMessage;

const isError = (error: unknown): error is Error => {
	if (Error.isError) {
		return Error.isError(error);
	}

	return true;
};

export const parseMessage = (message: unknown) => {
	if (!Array.isArray(message) || message.length < 2 || message.length > 4) {
		return; // Ignore - this message is not for us
	}

	const type = message[0];

	if (type === MSGTYPE_QUERY) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid messageID");
		}
		if (message[3] !== undefined && typeof message[3] !== "number") {
			throw new Error("Invalid hostID");
		}
		return message as QueryMessage;
	}

	if (type === MSGTYPE_RESPONSE) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid messageID");
		}
		if (message[2] !== null && !isError(message[2])) {
			throw new Error("Invalid error");
		}
		return message as ResponseMessage;
	}

	if (type === MSGTYPE_HOST_ID) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid hostID");
		}
		if (message[2] !== undefined && typeof message[2] !== "string") {
			throw new Error("Invalid workerLockId");
		}
		return message as HostIdMessage;
	}

	if (type === MSGTYPE_HOST_LOCK) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid hostID");
		}
		if (typeof message[2] !== "string") {
			throw new Error("Invalid hostLockId");
		}
		return message as HostLockMessage;
	}

	if (type === MSGTYPE_WORKER_LOCK) {
		if (typeof message[1] !== "string") {
			throw new Error("Invalid workerLockId");
		}
		return message as WorkerLockMessage;
	}

	if (type === MSGTYPE_WORKER_ERROR) {
		if (!isError(message[1])) {
			throw new Error("Invalid error");
		}
		return message as WorkerErrorMessage;
	}

	throw new Error("Invalid message type");
};
