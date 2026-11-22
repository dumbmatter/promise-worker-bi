import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

let result = "pending";

const describeOutcome = (promise: Promise<unknown>) =>
	promise.then(
		() => "resolved",
		(error: Error) => `rejected: ${error.name}: ${error.message}`,
	);

promiseWorker.register((message, hostID) => {
	if (message === "queryMe") {
		// The host never responds to this, so it only settles if the host closes
		describeOutcome(promiseWorker.postMessage("hang", hostID)).then((outcome) => {
			result = outcome;
		});
		return;
	}

	if (message === "getResult") {
		return result;
	}

	if (message === "queryUnknownHost") {
		return describeOutcome(promiseWorker.postMessage("hello", 999));
	}
});
