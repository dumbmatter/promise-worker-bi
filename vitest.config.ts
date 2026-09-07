import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [
				{ browser: "chromium" },
				{ browser: "firefox" },
				{ browser: "webkit" },
			],
			screenshotFailures: false,
		},
		include: ["test/test.js"],
		slowTestThreshold: 5_000,
		testTimeout: 10_000,
	},
});
