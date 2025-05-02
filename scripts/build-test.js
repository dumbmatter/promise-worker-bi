import path from "path";
import { rollup } from "rollup";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";
import resolve from "@rollup/plugin-node-resolve";
import { glob } from "tinyglobby";

const files = await glob("test/*.js");

for (const file of files) {
	const bundle = await rollup({
		input: file,
		plugins: [
			resolve({
				preferBuiltins: true,
			}),
			globals(),
			builtins(),
		],
	});

	await bundle.write({
		file: `dist/test/${path.basename(file)}`,
		format: "iife",
		indent: false,
		name: "test",
	});
}
