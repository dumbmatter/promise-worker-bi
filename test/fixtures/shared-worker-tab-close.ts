import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

promiseWorker.register((message) => {
	if (message === "getNumHosts") {
		return (promiseWorker as any)._hosts.size;
	}
});
