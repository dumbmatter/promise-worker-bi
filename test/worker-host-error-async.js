import { assert } from "vitest";
import { PWBWorker } from "../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

promiseWorker.postMessage("foo").then(
	() => {
		throw new Error("expected an error here");
	},
	(err) => {
		assert.equal(err.message, "oh noes");
		return promiseWorker.postMessage("done");
	},
);
