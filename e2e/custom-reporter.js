/* eslint-disable import/no-commonjs */
/* eslint-disable no-console */
// eslint-disable-next-line import/no-nodejs-modules
const path = require('path');

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.retriesMap = new Map();
  }

  formatTime = (duration) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  getRelativePath = (filePath) => {
    const rootDir = this._globalConfig.rootDir;
    const relativePath = path.relative(rootDir, filePath);
    return relativePath.startsWith('..') ? filePath : relativePath;
  };

  countRetries(testResults) {
    let retries = 0;
    testResults.forEach((testResult) => {
      testResult.testResults.forEach((test) => {
        if (test.status === 'failed' && test.numRetries) {
          retries += test.numRetries;
        }
      });
    });
    return retries;
  }

  onRunComplete(_, results) {
    process.stdout.write('\x1Bc'); // Clear the console
    process.stdout.write('\nDetox test execution completed.\n\n');

    const boldText = (text) => `\x1b[1m${text}\x1b[0m`;

    const numTotalSuites = results.numTotalTestSuites;
    const numTotalPassedSuites = results.numPassedTestSuites;
    const numTotalFailedSuites = results.numFailedTestSuites;
    const numTotalTests = results.numTotalTests;
    const numPassedTests = results.numPassedTests;
    const numFailedTests = results.numFailedTests;
    // const numSkippedSuites =
    //   numTotalSuites - (numPassedTests + numFailedTests + numPendingTests);
    // const numSkippedTests = numTotalTests - (numPassedTests + numFailedTests);

    console.log(
      boldText(
        `Test Suites:  ${numTotalFailedSuites} failed, ${numTotalPassedSuites} passed, ${numTotalSuites} total`,
      ),
    );
    console.log(
      boldText(
        `Tests:        ${numPassedTests} passed, ${numTotalTests} total`,
      ),
    );
    // console.log(
    //   boldText(`Retries:   ${this.countRetries(results.testResults)} total`),
    // );
    console.log(
      boldText(
        `Time:        ${this.formatTime(
          results.testResults[0].perfStats.end - results.startTime,
        )}`,
      ),
    );

    const testPattern =
      this.getRelativePath(this._globalConfig.testPathPattern) || 'All tests';
    console.log(
      boldText(`Ran all test suites with tests matching "${testPattern}".`),
    );

    console.log(
      boldText(
        `Done in ${this.formatTime(
          results.testResults[0].perfStats.end - results.startTime,
        )}`,
      ),
    );

    if (numFailedTests > 0) {
      console.log('\n                           FAILED SPEC FILE(S):');
      results.testResults.forEach((testResult) => {
        if (testResult.numFailingTests > 0) {
          const failedSpecPath = this.getRelativePath(testResult.testFilePath);
          const paddingSize =
            (process.stdout.columns - failedSpecPath.length) / 3;
          console.log(`${' '.repeat(paddingSize)}${boldText(failedSpecPath)}`);
        }
      });
    }
    console.log('\n \n');
  }
}

module.exports = CustomReporter;
