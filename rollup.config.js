import { babel } from "@rollup/plugin-babel";

export default {
	input: "src/index.ts",
	output: {
		file: "dist/index.js",
		format: "esm",
	},
	plugins: [
		babel({
			babelHelpers: "bundled",
			extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx"],
		}),
	],
};
