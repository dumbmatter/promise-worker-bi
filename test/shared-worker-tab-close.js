import { PWBWorker } from "../dist/index.js";

const promiseWorker = new PWBWorker();

promiseWorker.register((message) => {
	if (message === "getNumHosts") {
		return promiseWorker._hosts.size;
	}
});
