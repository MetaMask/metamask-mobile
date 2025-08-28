import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import xml2js from 'xml2js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
const env = {
  TEST_RESULTS_PATH: process.env.TEST_RESULTS_PATH || 'android-merged-test-report',
  TEST_RUNS_PATH: process.env.TEST_RUNS_PATH || 'test/test-results/test-runs-mobile.json',
  RUN_ID: process.env.RUN_ID ? parseInt(process.env.RUN_ID) : Date.now(),
  PR_NUMBER: process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : 0,
  GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true',
};

// XML parser
const xmlParser = new xml2js.Parser();

// Utility functions
const consoleBold = (text) => `\x1b[1m${text}\x1b[0m`;

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function normalizeTestPath(path) {
  // Normalize mobile test paths to match Extension format
  return path
    .replace(/\\/g, '/')
    .replace(/^e2e\//, 'test/e2e/')
    .replace(/\.spec\.(js|ts)$/, '.spec.ts');
}

async function parseJUnitXML(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const results = await xmlParser.parseStringPromise(content);

  // Handle both single testsuite and multiple testsuites
  const testsuites = results.testsuites || results;
  const suites = testsuites.testsuite
    ? (Array.isArray(testsuites.testsuite) ? testsuites.testsuite : [testsuites.testsuite])
    : [];

  return suites;
}

function extractProperties(suite) {
  const properties = {};

  if (suite.properties && suite.properties[0] && suite.properties[0].property) {
    for (const prop of suite.properties[0].property) {
      if (prop.$ && prop.$.name && prop.$.value !== undefined) {
        properties[prop.$.name] = prop.$.value;
      }
    }
  }

  return properties;
}

function createTestSuite(suite, jobName, jobId, properties) {
  const tests = parseInt(suite.$.tests || '0');
  const failed = parseInt(suite.$.failures || '0');
  const errors = parseInt(suite.$.errors || '0');
  const totalFailed = failed + errors;
  const skipped = parseInt(suite.$.skipped || '0');
  const passed = tests - totalFailed - skipped;

  return {
    name: suite.$.name,
    job: {
      name: properties.JOB_NAME || jobName,
      id: jobId,
      runId: properties.RUN_ID ? parseInt(properties.RUN_ID) : env.RUN_ID,
      prNumber: properties.PR_NUMBER ? parseInt(properties.PR_NUMBER) : env.PR_NUMBER,
    },
    date: new Date(suite.$.timestamp || new Date()),
    tests,
    passed,
    failed: totalFailed,
    skipped,
    time: parseFloat(suite.$.time || '0') * 1000, // convert to ms
    attempts: [],
    testCases: [],
  };
}

function createTestCase(test) {
  const hasFailure = test.failure && test.failure.length > 0;
  const hasError = test.error && test.error.length > 0;

  return {
    name: test.$.name,
    time: parseFloat(test.$.time || '0') * 1000, // convert to ms
    status: hasFailure || hasError ? 'failed' : 'passed',
    error: hasFailure ? test.failure[0]._ || test.failure[0] :
      hasError ? test.error[0]._ || test.error[0] : undefined,
  };
}

async function processTestDirectory(dirPath, directory) {
  // Parse job info from directory name
  let jobName, category, shard;

  const format1 = directory.match(/^smoke-(.+)-android-(\d+)-test-results$/);
  const format2 = directory.match(/^(.+)-android-smoke-(\d+)-test-results$/);

  if (format1) {
    [, category, shard] = format1;
    jobName = `smoke-${category}-android-${shard}`;
  } else if (format2) {
    [, category, shard] = format2;
    jobName = `${category}-android-smoke-${shard}`;
  } else {
    console.warn(`Skipping directory with unexpected format: ${directory}`);
    return null;
  }

  const jobId = Date.now() + parseInt(shard);
  const junitPath = path.join(dirPath, 'junit.xml');

  try {
    const suites = await parseJUnitXML(junitPath);
    const results = [];

    for (const suite of suites) {
      if (!suite.$ || !suite.testcase) continue;

      const properties = extractProperties(suite);
      const testSuite = createTestSuite(suite, jobName, jobId, properties);

      // Process test cases
      const testcases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
      for (const test of testcases) {
        if (!test.$) continue;
        testSuite.testCases.push(createTestCase(test));
      }

      // Extract file path from first test case classname
      const firstTestCase = testcases.find(tc => tc.$ && tc.$.classname);
      const filePath = firstTestCase
        ? normalizeTestPath(firstTestCase.$.classname)
        : `test/e2e/specs/${category}/unknown.spec.ts`;

      results.push({
        testRunName: `smoke-${category}-android`,
        testFile: {
          path: filePath,
          tests: testSuite.tests,
          passed: testSuite.passed,
          failed: testSuite.failed,
          skipped: testSuite.skipped,
          time: testSuite.time,
          testSuites: [testSuite],
        }
      });
    }

    return results;
  } catch (error) {
    console.warn(`Failed to process ${junitPath}: ${error.message}`);
    return null;
  }
}

function groupTestRuns(allResults) {
  const testRuns = [];

  for (const result of allResults) {
    let existingRun = testRuns.find(run => run.name === result.testRunName);
    if (!existingRun) {
      existingRun = {
        name: result.testRunName,
        testFiles: [],
      };
      testRuns.push(existingRun);
    }

    const existingFile = existingRun.testFiles.find(
      file => file.path === result.testFile.path
    );

    if (existingFile) {
      existingFile.testSuites.push(...result.testFile.testSuites);
    } else {
      existingRun.testFiles.push(result.testFile);
    }
  }

  return testRuns;
}

function processTestRunRetries(testRuns) {
  for (const testRun of testRuns) {
    for (const testFile of testRun.testFiles) {
      // Group test suites by name
      const suitesByName = {};

      for (const suite of testFile.testSuites) {
        if (!suitesByName[suite.name]) {
          suitesByName[suite.name] = [];
        }
        suitesByName[suite.name].push(suite);
      }

      // Determine the latest test suite by date and nest attempts
      const attempts = [];
      for (const suites of Object.values(suitesByName)) {
        suites.sort((a, b) => b.date.getTime() - a.date.getTime()); // sort newest first
        const [latest, ...otherAttempts] = suites;
        latest.attempts = otherAttempts;
        attempts.push(otherAttempts);
      }

      // Remove the nested attempts from the top-level list
      const attemptSet = new Set(attempts.flat());
      testFile.testSuites = testFile.testSuites.filter(
        suite => !attemptSet.has(suite)
      );

      // Calculate totals
      const total = testFile.testSuites.reduce(
        (acc, suite) => ({
          tests: acc.tests + suite.tests,
          passed: acc.passed + suite.passed,
          failed: acc.failed + suite.failed,
          skipped: acc.skipped + suite.skipped,
          time: acc.time + suite.time,
        }),
        { tests: 0, passed: 0, failed: 0, skipped: 0, time: 0 }
      );

      testFile.tests = total.tests;
      testFile.passed = total.passed;
      testFile.failed = total.failed;
      testFile.skipped = total.skipped;
      testFile.time = total.time;
    }

    testRun.testFiles.sort((a, b) => a.path.localeCompare(b.path));
  }

  return testRuns;
}

function displayResults(testRuns) {
  console.log(`\n✅ Mobile test report generated: ${env.TEST_RUNS_PATH}`);
  console.log(`📊 Processed ${testRuns.length} test run(s)`);

  for (const testRun of testRuns) {
    const total = testRun.testFiles.reduce(
      (acc, file) => ({
        tests: acc.tests + file.tests,
        passed: acc.passed + file.passed,
        failed: acc.failed + file.failed,
        skipped: acc.skipped + file.skipped,
        time: acc.time + file.time,
      }),
      { tests: 0, passed: 0, failed: 0, skipped: 0, time: 0 }
    );

    const status = total.failed > 0 ? '❌' : '✅';
    console.log(`${consoleBold(testRun.name)} ${status}`);

    const times = testRun.testFiles
      .map(file =>
        file.testSuites.map(suite => ({
          start: suite.date.getTime(),
          end: suite.date.getTime() + suite.time,
        }))
      )
      .flat();

    const earliestStart = Math.min(...times.map(t => t.start));
    const latestEnd = Math.max(...times.map(t => t.end));
    const executionTime = latestEnd - earliestStart;

    console.log(`${consoleBold(`${total.tests} tests`)} completed in ${consoleBold(formatTime(executionTime))}`);
    console.log(`  - ${total.passed} passed ✅`);
    if (total.failed > 0) console.log(`  - ${total.failed} failed ❌`);
    if (total.skipped > 0) console.log(`  - ${total.skipped} skipped ⏩`);

    if (total.failed > 0) {
      console.log('\n❌ Failed tests:');
      for (const file of testRun.testFiles) {
        if (file.failed === 0) continue;
        console.log(`  ${file.path}`);

        for (const suite of file.testSuites) {
          if (suite.failed === 0) continue;
          for (const test of suite.testCases) {
            if (test.status !== 'failed') continue;
            console.log(`    - ${test.name}`);
            if (test.error) {
              const errorPreview = test.error.length > 100
                ? test.error.substring(0, 100) + '...'
                : test.error;
              console.log(`      ${errorPreview.replace(/\n/g, ' ')}`);
            }
          }
        }
      }
    }

    console.log('');
  }
}

async function main() {
  try {
    // Process test directories from the already extracted path
    const testDirectories = await fs.readdir(env.TEST_RESULTS_PATH);
    console.log(`Found ${testDirectories.length} directories in ${env.TEST_RESULTS_PATH}`);

    const allResults = [];

    for (const directory of testDirectories) {
      const dirPath = path.join(env.TEST_RESULTS_PATH, directory);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) continue;

      const results = await processTestDirectory(dirPath, directory);
      if (results) {
        allResults.push(...results);
      }
    }

    // Group and process test runs
    const testRuns = groupTestRuns(allResults);
    const processedRuns = processTestRunRetries(testRuns);

    // Create output directory
    const outputDir = path.dirname(env.TEST_RUNS_PATH);
    await fs.mkdir(outputDir, { recursive: true });

    // Write results
    await fs.writeFile(env.TEST_RUNS_PATH, JSON.stringify(processedRuns, null, 2));

    // Display summary
    displayResults(processedRuns);

  } catch (error) {
    // Log error but don't fail the CI job - we still want other steps to run
    console.error(`❌ Error creating the mobile test report: ${error.message}`);
    console.error(error);
    // Note: Not calling core.setFailed() so CI can continue
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
