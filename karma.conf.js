module.exports = config => {
  config.set({
    frameworks: ["mocha"],
    files: [
      "dist/test/test.js",
      { pattern: "dist/test/worker-*.js", included: false }
    ],
    reporters: ["mocha"],
    autoWatch: false,
    browsers: ["ChromeHeadless", "FirefoxHeadless"],
    singleRun: true
  });
};
