import { assert } from "vitest";
import { PWBWorker } from "../../src/PWBWorker.ts";

const promiseWorker = new PWBWorker();

const words = [
	"foo",
	"bar",
	"baz",
	"quux",
	"toto",
	"bongo",
	"haha",
	"flim",
	"foob",
	"foobar",
	"bazzy",
	"fifi",
	"kiki",
];

for (const word of words) {
	promiseWorker.postMessage(word).then((res) => {
		assert.equal(res, word);
		return promiseWorker.postMessage(res);
	});
}
