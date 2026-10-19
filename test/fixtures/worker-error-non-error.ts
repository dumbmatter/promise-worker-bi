import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.register((message) => {
	if (message === "string") {
		return Promise.reject("string busted");
	}
	if (message === "object") {
		return Promise.reject({ code: "object busted" });
	}
	if (message === "undefined") {
		return Promise.reject(undefined);
	}
	throw "sync string busted";
});
