import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import type { BrowserCommandContext } from "vitest/node";
import type { Page } from "playwright";

const makeTestWithTwoPages =
	// ExtraWindowProps is really hacky - we want it to show up only inside things like page.evaluate callback functions, but we're tricking TypeScript into thinking it gets `window` from a closure.
	<ExtraWindowProps>() =>
		<Output>(
			htmlFilename: string,
			cb: (x: {
				htmlUrl: string;
				page1: Page;
				page2: Page;
				window: typeof window & ExtraWindowProps;
			}) => Promise<Output>,
		) => {
			return async (ctx: BrowserCommandContext) => {
				if (ctx.provider.name !== "playwright") {
					throw new Error("Requires playwright");
				}
				const { context } = ctx;

				const htmlUrl = new URL(`/test/${htmlFilename}`, ctx.page.url()).toString();

				const page1 = await context.newPage();
				const page2 = await context.newPage();

				try {
					return await cb({ htmlUrl, page1, page2, window: undefined as any });
				} finally {
					await page1.close().catch(() => {});
					await page2.close().catch(() => {});
				}
			};
		};

const testSharedWorkerClose = makeTestWithTwoPages<{
	testClient: {
		closed: boolean;
		terminateWorker: () => void;
	};
}>()("shared-worker-close.html", async ({ htmlUrl, page1, page2, window }) => {
	await Promise.all([
		page1.goto(htmlUrl, { waitUntil: "load" }),
		page2.goto(htmlUrl, { waitUntil: "load" }),
	]);

	const before1 = await page1.evaluate(() => window.testClient.closed);
	const before2 = await page1.evaluate(() => window.testClient.closed);

	// Give worker time to send workerLockId to hosts
	await page1.waitForTimeout(100);

	await page1.evaluate(() => {
		window.testClient.terminateWorker();
	});

	// Give hosts time to notice worker has been terminated
	await page1.waitForTimeout(100);

	const after1 = await page1.evaluate(() => window.testClient.closed);
	const after2 = await page1.evaluate(() => window.testClient.closed);

	return { after1, after2, before1, before2 };
});

const testSharedWorkerErrorOutsideResponse = makeTestWithTwoPages<{
	testClient: {
		error: Error | undefined;
	};
}>()("shared-worker-error-outside-response.html", async ({ htmlUrl, page1, page2, window }) => {
	await page1.goto(htmlUrl, { waitUntil: "load" });
	await page2.goto(htmlUrl, { waitUntil: "load" });

	// Wait for error
	await page1.waitForTimeout(1000);

	const error1 = await page1.evaluate(() => window.testClient.error);
	const error2 = await page2.evaluate(() => window.testClient.error);

	return { error1, error2 };
});

const testSharedWorkerTabClose = makeTestWithTwoPages<{
	testClient: {
		getNumHosts: () => number;
	};
}>()("shared-worker-tab-close.html", async ({ htmlUrl, page1, page2, window }) => {
	await page1.goto(htmlUrl, { waitUntil: "load" });
	const numHosts1 = await page1.evaluate(() => window.testClient.getNumHosts());

	await page2.goto(htmlUrl, { waitUntil: "load" });
	const numHosts2 = await page2.evaluate(() => window.testClient.getNumHosts());

	await page2.close();

	// Give worker time to notice page2 closed
	await page1.waitForTimeout(100);

	const numHostsAfterClose = await page1.evaluate(() => window.testClient.getNumHosts());

	return { numHosts1, numHosts2, numHostsAfterClose };
});

declare module "vitest/browser" {
	interface BrowserCommands {
		testSharedWorkerClose(): ReturnType<typeof testSharedWorkerClose>;
		testSharedWorkerErrorOutsideResponse(): ReturnType<typeof testSharedWorkerErrorOutsideResponse>;
		testSharedWorkerTabClose(): ReturnType<typeof testSharedWorkerTabClose>;
	}
}

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
			screenshotFailures: false,
			commands: {
				testSharedWorkerClose,
				testSharedWorkerErrorOutsideResponse,
				testSharedWorkerTabClose,
			},
		},
		include: ["test/test.ts"],
		slowTestThreshold: 5_000,
		testTimeout: 10_000,
	},
});
