import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

promiseWorker.register((msg, hostID) => {
	return hostID;
});
