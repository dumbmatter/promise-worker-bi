import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	throw new Error("busted!");
});
