import { PWBWorker } from "../dist/index.js";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	return "pong";
});
