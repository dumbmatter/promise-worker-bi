const babel = require("rollup-plugin-babel");

module.exports = {
  input: "src/index.ts",
  output: [
    {
      file: "dist/commonjs.js",
      format: "cjs",
    },
    {
      file: "dist/esmodules.mjs",
      format: "esm",
    },
  ],
  plugins: [
    babel({
      extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx"],
    }),
  ],
};
