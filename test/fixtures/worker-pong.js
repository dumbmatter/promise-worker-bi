import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	return "pong";
});
