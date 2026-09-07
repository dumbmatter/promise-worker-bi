import { defineConfig } from "tsdown";

export default defineConfig({
	outExtensions: () => ({ js: ".js" }),
});
