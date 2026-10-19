import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	return Promise.resolve().then(() => {
		throw new DOMException("dom busted", "NotFoundError");
	});
});
