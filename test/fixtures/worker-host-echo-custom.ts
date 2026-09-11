import { assert } from "vitest";
import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

promiseWorker.postMessage("ping");

new Promise((resolve, reject) => {
	self.addEventListener("error", (e) => {
		reject(e);
	});
	self.addEventListener("message", (e) => {
		if (Array.isArray(e.data)) {
			return;
		}
		resolve(e.data);
	});

	self.postMessage({ hello: "world" });
}).then((data: any) => {
	assert.equal(data.hello, "world");
	promiseWorker.postMessage("done");
});
