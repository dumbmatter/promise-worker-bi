import { PWBWorker } from "../../src/PWBWorker.ts";

new PWBWorker();

setTimeout(() => {
	Promise.reject({ code: "unhandled-rejection-non-error" });
}, 500);
