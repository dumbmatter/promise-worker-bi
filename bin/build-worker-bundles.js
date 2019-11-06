const glob = require("glob");
const mkdirp = require("mkdirp");
const path = require("path");
const rimraf = require("rimraf");
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const commonjs = require("rollup-plugin-commonjs");
const resolve = require("rollup-plugin-node-resolve");
const builtins = require("rollup-plugin-node-builtins");

rimraf.sync("test/bundle");
mkdirp.sync("test/bundle");

const files = glob.sync("test/worker*js");

Promise.all(
  files.map(async file => {
    const bundle = await rollup.rollup({
      input: file,
      plugins: [
        babel(),
        commonjs(),
        resolve({
          preferBuiltins: true
        }),
        builtins()
      ]
    });

    await bundle.write({
      file: `test/bundle/bundle-${path.basename(file)}`,
      format: "iife",
      indent: false,
      name: "test"
    });
  })
).catch(err => {
  console.error(err);
  process.exit(1);
});
