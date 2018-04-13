module.exports = config => {
  config.set({
    frameworks: ["mocha"],
    files: [
      "dist/test/test.js",
      { pattern: 'dist/test/bundle/*.js', included: false }
    ],
    proxies: {
      "/test/bundle/": "/base/dist/test/bundle/"
    },
    reporters: ["mocha"],
    autoWatch: false,
    browsers: ["ChromeHeadless", "FirefoxHeadless"],
    singleRun: true
  });
};
