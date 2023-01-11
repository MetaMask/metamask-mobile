const fs = require('fs');
const xml2js = require('xml2js');
const { generate } = require('multiple-cucumber-html-reporter');

function generateTestReports() {
  // Generate the report when it all tests are done
  generate({
    jsonDir: './wdio/reports/json',
    reportPath: './wdio/reports/html',
    // for more options see https://github.com/wswebcreation/multiple-cucumber-html-reporter#options
  });

  const testSuites = fs.readdirSync('./wdio/reports/junit-results');
  testSuites.forEach((testSuite) => {
    const file = fs.readFileSync(
      `./wdio/reports/junit-results/${testSuite}`,
      'utf8',
    );
    const parser = new xml2js.Parser();

    parser.parseString(file, (err, result) => {
      if (err) {
        throw err;
      }
      const suiteName = result.testsuites.testsuite[0].$.name;
      // Create dir for each test suite
      if (!fs.existsSync(`./wdio/reports/junit-results/${suiteName}`)) {
        fs.mkdirSync(`./wdio/reports/junit-results/${suiteName}`);
        fs.renameSync(
          `./wdio/reports/junit-results/${testSuite}`,
          `./wdio/reports/junit-results/${suiteName}/${suiteName}.xml`,
        );
        // Create test-info.json file for each test suite
        const testInfo = {
          'test-name': suiteName,
        };
        fs.writeFileSync(
          `./wdio/reports/junit-results/${suiteName}/test-info.json`,
          JSON.stringify(testInfo),
        );
      }
    });
  });
}

module.exports = generateTestReports;
