import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

promiseWorker.postMessage("foo").then(
	() => {
		self.postMessage({ error: undefined });
	},
	(err) => {
		self.postMessage({ error: err.message });
	},
);
