import assert from "assert";
import { PWBWorker } from "../dist/index.js";

const promiseWorker = new PWBWorker();
promiseWorker.postMessage("ping").then((msg) => {
	assert.equal(msg, "pong");

	return promiseWorker.postMessage(msg);
});
