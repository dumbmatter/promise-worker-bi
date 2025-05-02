import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint"; // eslint-disable-line import-x/no-unresolved
import * as pluginImportX from "eslint-plugin-import-x";

export default tseslint.config(
	{
		ignores: ["dist"],
	},
	{ files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
	{
		languageOptions: {
			globals: globals.browser,
		},
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	pluginImportX.flatConfigs.recommended,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
	{
		files: ["scripts/*"],

		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ["test/*"],

		languageOptions: {
			globals: {
				...globals.mocha,
			},
		},
	},
);
