import { PWBWorker } from "../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();
promiseWorker.register((message) => {
	if (message === "terminate") {
		self.close();
	}
});
