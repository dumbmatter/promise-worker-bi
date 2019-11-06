const babel = require("rollup-plugin-babel");

module.exports = {
  input: "index.js",
  output: [
    {
      file: "dist/commonjs.js",
      format: "cjs"
    },
    {
      file: "dist/esmodules.js",
      format: "esm"
    }
  ],
  plugins: [babel()]
};
