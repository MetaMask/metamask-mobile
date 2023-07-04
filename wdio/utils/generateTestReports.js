import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { Parser } from 'xml2js';
import { generate } from 'multiple-cucumber-html-reporter';

function generateTestReports() {
  // Generate the report when it all tests are done
  generate({
    jsonDir: './wdio/reports/json',
    reportPath: './wdio/reports/html',
    // for more options see https://github.com/wswebcreation/multiple-cucumber-html-reporter#options
  });

  const testSuites = readdirSync('./wdio/reports/junit-results');
  testSuites.forEach((testSuite) => {
    const file = readFileSync(
      `./wdio/reports/junit-results/${testSuite}`,
      'utf8',
    );
    const parser = new Parser();

    parser.parseString(file, (err, result) => {
      try {
        const suiteName = result.testsuites.testsuite[0].$.name;
        // Create dir for each test suite
        if (!existsSync(`./wdio/reports/junit-results/${suiteName}`)) {
          mkdirSync(`./wdio/reports/junit-results/${suiteName}`);
          renameSync(
            `./wdio/reports/junit-results/${testSuite}`,
            `./wdio/reports/junit-results/${suiteName}/${suiteName}.xml`,
          );
          // Create test-info.json file for each test suite
          const testInfo = {
            'test-name': suiteName,
          };
          writeFileSync(
            `./wdio/reports/junit-results/${suiteName}/test-info.json`,
            JSON.stringify(testInfo),
          );
        }
      } catch (error) {
        //do nothing for now
      }
    });
  });
}

export default generateTestReports;
