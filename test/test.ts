import { assert, describe, it } from "vitest";
import { commands } from "vitest/browser";
import { PWBHost } from "../src/PWBHost.ts";

describe("host -> worker", () => {
	it("sends a message back and forth", () => {
		const worker = new Worker(new URL("./worker-pong.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("ping").then((res) => {
			assert.equal(res, "pong");
		});
	});

	it("echoes a message", () => {
		const worker = new Worker(new URL("./worker-echo.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("ping").then((res) => {
			assert.equal(res, "ping");
		});
	});

	it("pongs a message with a promise", () => {
		const worker = new Worker(new URL("./worker-pong-promise.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("ping").then((res) => {
			assert.equal(res, "pong");
		});
	});

	it("pongs a message with a promise, again", () => {
		const worker = new Worker(new URL("./worker-pong-promise.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("ping").then((res) => {
			assert.equal(res, "pong");
		});
	});

	it("echoes a message multiple times", () => {
		const worker = new Worker(new URL("./worker-echo.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

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

		return Promise.all(
			words.map((word) => {
				return promiseWorker.postMessage(word).then((res) => {
					assert.equal(res, word);
				});
			}),
		);
	});

	it("can have multiple PromiseWorkers", () => {
		const worker = new Worker(new URL("./worker-echo.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker1 = new PWBHost(worker);
		const promiseWorker2 = new PWBHost(worker);

		return promiseWorker1
			.postMessage("foo")
			.then((res) => {
				assert.equal(res, "foo");
			})
			.then(() => {
				return promiseWorker2.postMessage("bar");
			})
			.then((res) => {
				assert.equal(res, "bar");
			});
	});

	it("can have multiple PromiseWorkers 2", () => {
		const worker = new Worker(new URL("./worker-echo.js", import.meta.url), {
			type: "module",
		});
		const promiseWorkers = [
			new PWBHost(worker),
			new PWBHost(worker),
			new PWBHost(worker),
			new PWBHost(worker),
			new PWBHost(worker),
		];

		return Promise.all(
			promiseWorkers.map((promiseWorker, i) => {
				return promiseWorker
					.postMessage(`foo${i}`)
					.then((res) => {
						assert.equal(res, `foo${i}`);
					})
					.then(() => {
						return promiseWorker.postMessage(`bar${i}`);
					})
					.then((res) => {
						assert.equal(res, `bar${i}`);
					});
			}),
		);
	});

	it("handles synchronous errors", () => {
		const worker = new Worker(new URL("./worker-error-sync.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("foo").then(
			() => {
				throw new Error("expected an error here");
			},
			(err) => {
				assert.equal(err.message, "busted!");

				// Either have the file name or error message in the stack. Chrome has both, Firefox has just the file name, Node has just the error message.
				assert(err.stack.includes("worker-error-sync") || err.stack.includes("busted!"));
			},
		);
	});

	it("handles asynchronous errors", () => {
		const worker = new Worker(new URL("./worker-error-async.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("foo").then(
			() => {
				throw new Error("expected an error here");
			},
			(err) => {
				assert.equal(err.message, "oh noes");
				// Chrome puts it in the stack, but other browsers don't
				//assert(err.stack.includes("oh noes"));
			},
		);
	});

	it("handles unregistered callbacks", () => {
		const worker = new Worker(new URL("./worker-empty.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker.postMessage("ping").then(
			() => {
				throw new Error("expected an error here");
			},
			(err) => {
				assert(err);
			},
		);
	});

	it("allows custom additional behavior", () => {
		const worker = new Worker(new URL("./worker-echo-custom.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);
		return Promise.all([
			promiseWorker.postMessage("ping"),
			new Promise((resolve, reject) => {
				function cleanup() {
					worker.removeEventListener("message", onMessage);
					worker.removeEventListener("error", onError);
				}
				function onMessage(e: MessageEvent) {
					if (Array.isArray(e.data)) {
						return;
					}
					cleanup();
					resolve(e.data);
				}
				function onError(e: unknown) {
					cleanup();
					reject(e);
				}
				worker.addEventListener("error", onError);
				worker.addEventListener("message", onMessage);
				worker.postMessage({ hello: "world" });
			}).then((data: any) => {
				assert.equal(data.hello, "world");
			}),
		]);
	});

	it("allows custom additional behavior 2", () => {
		const worker = new Worker(new URL("./worker-echo-custom-2.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);
		return Promise.all([
			promiseWorker.postMessage("ping"),
			new Promise((resolve, reject) => {
				function cleanup() {
					worker.removeEventListener("message", onMessage);
					worker.removeEventListener("error", onError);
				}
				function onMessage(e: MessageEvent) {
					if (e.data !== "[2]") {
						return;
					}
					cleanup();
					resolve(e.data);
				}
				function onError(e: unknown) {
					cleanup();
					reject(e);
				}
				worker.addEventListener("error", onError);
				worker.addEventListener("message", onMessage);
				worker.postMessage("[2]");
			}).then((data) => {
				assert.equal(data, "[2]");
			}),
		]);
	});

	it("makes hostID immediately available", () => {
		const worker = new Worker(new URL("./worker-hostid.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		return promiseWorker
			.postMessage("ping")
			.then((res) => {
				assert.equal(res, 0);
			})
			.then(() => {
				return new Promise<void>((resolve, reject) => {
					setTimeout(() => {
						return promiseWorker
							.postMessage("ping")
							.then((res) => {
								assert.equal(res, 0);
								resolve();
							})
							.catch(reject);
					}, 500);
				});
			});
	});
});

describe("worker -> host", () => {
	it("sends a message from worker to host", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-ping.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "pong");
					resolve();
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return "pong";
			});
		});
	});

	it("echoes a message", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-echo.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "ping");
					resolve();
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return msg;
			});
		});
	});

	it("pongs a message with a promise", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-ping.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "pong");
					resolve();
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return Promise.resolve("pong");
			});
		});
	});

	it("pongs a message with a promise, again", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-ping.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "pong");
					resolve();
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return Promise.resolve("pong");
			});
		});
	});

	it("echoes a message multiple times", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-echo-multiple.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

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

			let i = 0;
			promiseWorker.register((msg) => {
				assert.equal(msg, words[i % words.length]);
				i += 1;

				if (i === words.length * 2) {
					resolve();
				}

				return msg;
			});
		});
	});

	it("can have multiple PromiseWorkers", () => {
		new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-echo.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker1 = new PWBHost(worker);
			const promiseWorker2 = new PWBHost(worker);

			let i = 0;
			let j = 0;

			promiseWorker1.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "ping");
				} else {
					throw new Error("Extra message");
				}

				if (i === 1 && j === 1) {
					resolve();
				}

				i += 1;
				return msg;
			});

			promiseWorker2.register((msg) => {
				if (j === 0) {
					assert.equal(msg, "ping");
				} else if (j === 1) {
					assert.equal(msg, "ping");
				} else {
					throw new Error("Extra message");
				}

				if (i === 1 && j === 1) {
					resolve();
				}

				j += 1;
				return msg;
			});
		});
	});

	it("handles synchronous errors", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-error-sync.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					i += 1;
					throw new Error("busted!");
				} else if (i === 1) {
					i += 1;
					assert.equal(msg, "done");
					resolve();
				} else {
					throw new Error("Extra message");
				}
			});
		});
	});

	it("handles asynchronous errors", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-error-async.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					i += 1;
					return Promise.resolve().then(() => {
						throw new Error("oh noes");
					});
				}

				if (i === 1) {
					i += 1;
					assert.equal(msg, "done");
					resolve();
				} else {
					throw new Error("Extra message");
				}
			});
		});
	});

	it("handles errors outside of responses", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(
				new URL("./worker-host-error-outside-response.js", import.meta.url),
				{ type: "module" },
			);
			const promiseWorker = new PWBHost(worker);

			promiseWorker.addEventListener("error", ({ error }) => {
				assert(error.message.includes("error-outside-response"));
				assert(error.stack.includes("error-outside-response"));
				resolve();
			});
		});
	});

	// This test is a little dicey, relies on setTimeout timing across host and worker
	it("handles unregistered callbacks", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-empty.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			promiseWorker.register("mistake!" as any);

			setTimeout(() => {
				promiseWorker.register((msg) => {
					assert.equal(msg, "done");
					resolve();
				});
			}, 50);
		});
	});

	it("allows custom additional behavior", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-host-echo-custom.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "done");
					resolve();
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return msg;
			});

			worker.addEventListener("message", (e) => {
				if (!Array.isArray(e.data)) {
					// custom message
					worker.postMessage(e.data);
				}
			});
		});
	});
});

describe("bidirectional communication", () => {
	it("echoes a message", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-bidirectional-echo.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);

			let i = 0;
			promiseWorker.register((msg) => {
				if (i === 0) {
					assert.equal(msg, "ping");
				} else if (i === 1) {
					assert.equal(msg, "ping");

					promiseWorker.postMessage("pong").then((res) => {
						assert.equal(res, "pong");
						resolve();
					});
				} else {
					throw new Error("Extra message");
				}

				i += 1;
				return msg;
			});
		});
	});
});

// This is a shitty test, not sure how to simulate a real multi-tab test
describe("Shared Worker", () => {
	it("works", () => {
		return new Promise<void>((resolve) => {
			const worker = new SharedWorker(new URL("./worker-shared.js", import.meta.url), {
				type: "module",
			});

			const promiseWorker = new PWBHost(worker);

			let i = 0;
			const NUM_MESSAGES = 4; // 2 from broadcast, 1 from non-broadcast, and 2 from individual message responses
			function gotMessage() {
				i += 1;
				if (i === NUM_MESSAGES) {
					resolve();
				}
			}

			const expected = ["to all hosts", "to just one host"];
			promiseWorker.register((msg) => {
				const expectedMsg = expected.shift();
				assert.equal(msg, expectedMsg);
				gotMessage();
			});

			promiseWorker
				.postMessage("broadcast")
				.then((res) => {
					assert.equal(res, "broadcast");
					gotMessage();
				})
				.then(() => {
					return promiseWorker.postMessage("foo").then((res) => {
						assert.equal(res, "foo");
						gotMessage();
					});
				});
		});
	});

	it("handles errors outside of responses", () => {
		return new Promise<void>((resolve) => {
			const worker = new SharedWorker(
				new URL("./worker-host-error-outside-response.js", import.meta.url),
				{ type: "module" },
			);
			const promiseWorker = new PWBHost(worker);

			promiseWorker.addEventListener("error", ({ error }) => {
				assert.equal(error.name, "Error");
				assert.equal(error.message, "error-outside-response");
				assert(error.stack.includes("error-outside-response"));
				resolve();
			});
		});
	});

	it("handles errors outside of responses with two tabs (only report to first tab)", async () => {
		const { error1, error2 } = await commands.testSharedWorkerErrorOutsideResponse();
		assert.equal(error2, undefined);
		assert.equal(error1?.name, "Error");
		assert.equal(error1?.message, "error-outside-response");
		assert(error1?.stack?.includes("error-outside-response"));
	});

	it("worker sees tab close", async () => {
		const { numHosts1, numHosts2, numHostsAfterClose } = await commands.testSharedWorkerTabClose();
		assert.equal(numHosts1, 1);
		assert.equal(numHosts2, 2);
		assert.equal(numHostsAfterClose, 1);
	});
});

describe("transferable", () => {
	it("from host to worker", async () => {
		const worker = new Worker(new URL("./worker-transferable.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);

		const buffer = new ArrayBuffer(1);
		const response1 = await promiseWorker.postMessage(buffer);
		assert.equal(buffer.byteLength, 1);
		assert.equal(response1.byteLength, 1);

		// byteLength goes to 0 when transfered https://developer.chrome.com/blog/transferable-objects-lightning-fast/
		const response2 = await promiseWorker.postMessage(buffer, undefined, [buffer]);
		assert.equal(buffer.byteLength, 0);
		assert.equal(response2.byteLength, 1);

		// Wait for async errors in worker to happen
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 500);
		});
	});

	it("from worker to host", async () => {
		const worker = new Worker(new URL("./worker-host-transferable.js", import.meta.url), {
			type: "module",
		});
		const promiseWorker = new PWBHost(worker);
		promiseWorker.register((buffer) => {
			return buffer;
		});

		const buffers: ArrayBuffer[] = [];
		promiseWorker.register((buffer: unknown) => {
			if (!(buffer instanceof ArrayBuffer)) {
				throw new Error("Unexpected message");
			}
			assert.equal(buffer.byteLength, 1);
			buffers.push(buffer);
			return {
				message: buffer,
				_PWB_TRANSFER: [buffer],
			};
		});

		await new Promise<void>((resolve) => {
			setTimeout(() => {
				assert.equal(buffers.length, 2);
				for (const buffer of buffers) {
					assert.equal(buffer.byteLength, 0);
				}
				resolve();
			}, 500);
		});
	});
});

describe("close event", () => {
	it("Web Worker", () => {
		return new Promise<void>((resolve) => {
			const worker = new Worker(new URL("./worker-echo.js", import.meta.url), {
				type: "module",
			});
			const promiseWorker = new PWBHost(worker);
			promiseWorker.addEventListener("close", () => {
				resolve();
			});

			// Wait a bit to make sure communication between host and worker is established
			setTimeout(() => {
				worker.terminate();
			}, 100);
		});
	});

	it("Shared Worker", async () => {
		const { after1, after2, before1, before2 } = await commands.testSharedWorkerClose();
		assert.equal(before1, false);
		assert.equal(before2, false);
		assert.equal(after1, true);
		assert.equal(after2, true);
	});
});
