const browserify = require('browserify');
const fs = require('fs');
const glob = require('glob-promise');
const mkdirp = require('mkdirp');
const path = require('path');
const rimraf = require('rimraf');
const streamToPromise = require('stream-to-promise');

rimraf.sync('test/bundle');
mkdirp.sync('test/bundle');

Promise.resolve()
  .then(() => glob('test/worker*js'))
  .then((files) => {
    return Promise.all(files.map((file) => {
      const b = browserify(file, { debug: true }).bundle();
      return streamToPromise(b).then((buff) => {
        const outputFile = `test/bundle/bundle-${path.basename(file)}`;
        fs.writeFileSync(outputFile, buff, 'utf-8');
      });
    }));
  })
  .catch((err) => {
    console.log(err.stack);
  });
