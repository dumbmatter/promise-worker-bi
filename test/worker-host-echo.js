import { assert } from "vitest";
import { PWBWorker } from "../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.postMessage("ping").then((msg) => {
	assert.equal(msg, "ping");

	return promiseWorker.postMessage(msg);
});
