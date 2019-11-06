const glob = require("glob");
const path = require("path");
const rollup = require("rollup");
const resolve = require("rollup-plugin-node-resolve");
const builtins = require("rollup-plugin-node-builtins");

const files = glob.sync("test/worker*js");

Promise.all([
  (async () => {
    const bundle = await rollup.rollup({
      input: "test/test.js",
      plugins: [
        resolve({
          preferBuiltins: true
        }),
        builtins()
      ]
    });

    await bundle.write({
      file: `dist/test/test.js`,
      format: "iife",
      indent: false,
      name: "test"
    });
  })(),
  ...files.map(async file => {
    const bundle = await rollup.rollup({
      input: file,
      plugins: [
        resolve({
          preferBuiltins: true
        }),
        builtins()
      ]
    });

    await bundle.write({
      file: `dist/test/bundle/bundle-${path.basename(file)}`,
      format: "iife",
      indent: false,
      name: "test"
    });
  })
]).catch(err => {
  console.error(err);
  process.exit(1);
});
