import { PWBWorker } from "../../src/PWBWorker.ts";

new PWBWorker();

setTimeout(() => {
	throw new Error("error-outside-response");
}, 500);
