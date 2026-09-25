import { PWBWorker } from "../../src/PWBWorker.ts";

new PWBWorker();

setTimeout(() => {
	Promise.reject(new Error("unhandled-rejection"));
}, 500);
