import { PWBWorker } from "../dist/index.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const promiseWorker = new PWBWorker();

setTimeout(() => {
	throw new Error("error-outside-response");
}, 1000);
