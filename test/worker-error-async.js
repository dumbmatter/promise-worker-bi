import { PWBWorker } from "../dist/index.js";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	return Promise.resolve().then(() => {
		throw new Error("oh noes");
	});
});
