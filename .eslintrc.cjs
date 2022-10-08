/* eslint-env node */

module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  env: {
    browser: true,
  },
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-inferrable-types": [
      "error",
      { ignoreParameters: true, ignoreProperties: true },
    ],
    "@typescript-eslint/no-var-requires": "off",
    "no-prototype-builtins": "off",
  },
};
