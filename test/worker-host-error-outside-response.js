import { PWBWorker } from "../dist/index.js";

new PWBWorker();

setTimeout(() => {
	throw new Error("error-outside-response");
}, 500);
