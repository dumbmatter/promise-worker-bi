import { PWBWorker } from "../../src/PWBWorker.ts";

new PWBWorker();

setTimeout(() => {
	Promise.reject(new DOMException("unhandled-rejection-dom-exception", "NotFoundError"));
}, 500);
