import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import type { BrowserCommandContext } from "vitest/node";

const testSharedWorkerClose = async (ctx: BrowserCommandContext) => {
	if (ctx.provider.name !== "playwright") {
		throw new Error("Requires playwright");
	}
	const { context } = ctx;

	const baseUrl = new URL("/test/shared-worker-close.html", ctx.page.url()).toString();

	const page1 = await context.newPage();
	const page2 = await context.newPage();

	try {
		await Promise.all([page1.goto(baseUrl), page2.goto(baseUrl)]);
		await page1.waitForFunction(() => "testClient" in window);
		await page2.waitForFunction(() => "testClient" in window);

		const before1 = (await page1.evaluate(() => (window as any).testClient.closed)) as boolean;
		const before2 = (await page1.evaluate(() => (window as any).testClient.closed)) as boolean;

		await page1.evaluate(() => (window as any).testClient.terminateWorker());

		// Give hosts time to notice worker has been terminated
		await page1.waitForTimeout(100);

		const after1 = (await page1.evaluate(() => (window as any).testClient.closed)) as boolean;
		const after2 = (await page1.evaluate(() => (window as any).testClient.closed)) as boolean;
		return { after1, after2, before1, before2 };
	} finally {
		await page1.close().catch(() => {});
		await page2.close().catch(() => {});
	}
};

const testSharedWorkerErrorOutsideResponse = async (ctx: BrowserCommandContext) => {
	if (ctx.provider.name !== "playwright") {
		throw new Error("Requires playwright");
	}
	const { context } = ctx;

	const baseUrl = new URL(
		"/test/shared-worker-error-outside-response.html",
		ctx.page.url(),
	).toString();

	const page1 = await context.newPage();
	const page2 = await context.newPage();

	try {
		await page1.goto(baseUrl);
		await page1.waitForFunction(() => "testClient" in window);

		await page2.goto(baseUrl);
		await page2.waitForFunction(() => "testClient" in window);

		// Wait for error
		await page1.waitForTimeout(1500);

		const error1 = (await page1.evaluate(() => (window as any).testClient.error)) as
			| Error
			| undefined;

		const error2 = (await page2.evaluate(() => (window as any).testClient.error)) as
			| Error
			| undefined;

		return { error1, error2 };
	} finally {
		await page1.close().catch(() => {});
		await page2.close().catch(() => {});
	}
};

const testSharedWorkerTabClose = async (ctx: BrowserCommandContext) => {
	if (ctx.provider.name !== "playwright") {
		throw new Error("Requires playwright");
	}
	const { context } = ctx;

	const baseUrl = new URL("/test/shared-worker-tab-close.html", ctx.page.url()).toString();

	const page1 = await context.newPage();
	const page2 = await context.newPage();

	try {
		await page1.goto(baseUrl);
		await page1.waitForFunction(() => "testClient" in window);

		const numHosts1 = (await page1.evaluate(() =>
			(window as any).testClient.getNumHosts(),
		)) as number;

		await page2.goto(baseUrl);
		await page2.waitForFunction(() => "testClient" in window);

		const numHosts2 = (await page2.evaluate(() =>
			(window as any).testClient.getNumHosts(),
		)) as number;

		await page2.close();

		// Give worker time to notice page2 closed
		await page1.waitForTimeout(100);

		const numHostsAfterClose = (await page1.evaluate(() =>
			(window as any).testClient.getNumHosts(),
		)) as number;
		return { numHosts1, numHosts2, numHostsAfterClose };
	} finally {
		await page1.close().catch(() => {});
		await page2.close().catch(() => {});
	}
};

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
		include: ["test/test.js"],
		slowTestThreshold: 5_000,
		testTimeout: 10_000,
	},
});
