import { PWBWorker } from "../dist/index.js";

const promiseWorker = new PWBWorker();
promiseWorker.register(() => {
	throw new Error("busted!");
});
