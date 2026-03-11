import { glob } from "node:fs/promises";
import path from "node:path";
import { rollup } from "rollup";
import builtins from "rollup-plugin-node-builtins";
import resolve from "@rollup/plugin-node-resolve";

const files = glob("test/*.js");

for await (const file of files) {
	const bundle = await rollup({
		input: file,
		plugins: [resolve(), builtins()],
	});

	await bundle.write({
		file: `dist/test/${path.basename(file)}`,
		format: "iife",
		indent: false,
		name: "test",
	});
}
