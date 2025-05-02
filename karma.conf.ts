import chromeLauncher from "karma-chrome-launcher";
import firefoxLauncher from "karma-firefox-launcher";
import mocha from "karma-mocha";
import mochaReporter from "karma-mocha-reporter";

export default (config) => {
	config.set({
		plugins: [chromeLauncher, firefoxLauncher, mocha, mochaReporter],
		frameworks: ["mocha"],
		files: [
			"dist/test/test.js",
			{ pattern: "dist/test/worker-*.js", included: false },
		],
		reporters: ["mocha"],
		autoWatch: false,
		browsers: ["ChromeHeadless", "FirefoxHeadless"],
		singleRun: true,
	});
};
