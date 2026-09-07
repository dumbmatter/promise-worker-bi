import { isFakeError, type FakeError } from "./fakeError.ts";

export const MSGTYPE_QUERY = 0;
export const MSGTYPE_RESPONSE = 1;
export const MSGTYPE_HOST_ID = 2;
export const MSGTYPE_HOST_LOCK = 3;
export const MSGTYPE_WORKER_ERROR = 4;

export type QueryMessage =
	| [typeof MSGTYPE_QUERY, number, unknown]
	| [typeof MSGTYPE_QUERY, number, unknown, number | undefined];
export type ResponseMessage =
	| [typeof MSGTYPE_RESPONSE, number, FakeError]
	| [typeof MSGTYPE_RESPONSE, number, null, unknown];
export type HostIdMessage = [typeof MSGTYPE_HOST_ID, number];
export type HostLockMessage = [typeof MSGTYPE_HOST_LOCK, number, string];
export type WorkerErrorMessage = [typeof MSGTYPE_WORKER_ERROR, FakeError];

export type Message =
	| QueryMessage
	| ResponseMessage
	| HostIdMessage
	| HostLockMessage
	| WorkerErrorMessage;

export const parseMessage = (message: unknown) => {
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

	if (type === MSGTYPE_HOST_LOCK) {
		if (typeof message[1] !== "number") {
			throw new Error("Invalid hostId");
		}
		if (typeof message[2] !== "string") {
			throw new Error("Invalid lockId");
		}
		return message as HostLockMessage;
	}

	if (type === MSGTYPE_WORKER_ERROR) {
		if (!isFakeError(message[1])) {
			throw new Error("Invalid error");
		}
		return message as WorkerErrorMessage;
	}

	throw new Error("Invalid message type");
};
