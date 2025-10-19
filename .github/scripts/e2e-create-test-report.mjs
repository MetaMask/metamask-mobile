import fs from 'fs/promises';
import path from 'path';
import xml2js from 'xml2js';
import https from 'https';

const env = {
  TEST_RESULTS_PATH: process.env.TEST_RESULTS_PATH || 'android-merged-test-report',
  TEST_RUNS_PATH: process.env.TEST_RUNS_PATH || 'test/test-results/test-runs.json',
  RUN_ID: process.env.RUN_ID ? parseInt(process.env.RUN_ID) : Date.now(),
  PR_NUMBER: process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : 0,
  GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};

if (!env.GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN is not set');
  process.exit(1);
}

const xmlParser = new xml2js.Parser();

// Cache for GitHub API job requests
const jobsCache = {};

async function githubApiRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MetaMask-Mobile-E2E-Script',
      }
    };

    if (env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Get all jobs for a workflow run
async function getJobs(runId) {
  if (!runId || !env.GITHUB_TOKEN) {
    return [];
  }

  if (jobsCache[runId]) {
    return jobsCache[runId];
  }

  try {
    // Fetch all pages of jobs (GitHub API returns max 100 per page)
    let allJobs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await githubApiRequest(`/repos/MetaMask/metamask-mobile/actions/runs/${runId}/jobs?per_page=100&page=${page}`);
      if (response.jobs && response.jobs.length > 0) {
        allJobs = allJobs.concat(response.jobs);
        page++;
        // Check if we've reached the total count
        hasMore = response.total_count > allJobs.length;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allJobs.length} jobs for run ${runId}`);
    jobsCache[runId] = allJobs;
    return allJobs;
  } catch (error) {
    console.warn(`Failed to fetch jobs for run ${runId}:`, error.message);
    return [];
  }
}

async function getJobId(runId, jobName) {
  const jobs = await getJobs(runId);

  // Try exact match first
  let job = jobs.find((job) => job.name === jobName);

  // If not found, try more flexible matching
  if (!job) {
    // Try matching where GitHub job name ends with our job name
    job = jobs.find((job) => job.name.endsWith(jobName));
  }

  if (!job) {
    // Try matching hierarchical job names (e.g., "Android E2E Smoke Tests / category-android-smoke (1) / category-android-smoke-1")
    job = jobs.find((job) => {
      const parts = job.name.split(' / ');
      // Check if the last part matches exactly
      return parts.length > 0 && parts[parts.length - 1] === jobName;
    });
  }

  if (!job) {
    // Try matching where our job name is contained in GitHub job name
    job = jobs.find((job) => job.name.includes(jobName));
  }

  if (!job) {
    // Try matching by removing common suffixes/prefixes
    const cleanJobName = jobName.replace(/-\d+$/, ''); // Remove trailing numbers like -1, -2
    job = jobs.find((job) => job.name.includes(cleanJobName));
  }

  if (!job && jobs.length > 0) {
    console.warn(`Could not match job '${jobName}' with any of: ${jobs.map(j => j.name).join(', ')}`);
  }

  return job?.id;
}

function cleanErrorMessage(text) {
  if (!text) return text;
  // Replace the ❌ emoji with "Error:" at the beginning of the message
  return text.replace(/^❌\s*/, 'Error: ');
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
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

  // Get the raw error message
  let errorMessage = hasFailure ? test.failure[0]._ || test.failure[0] :
    hasError ? test.error[0]._ || test.error[0] : undefined;

  if (errorMessage) {
    errorMessage = cleanErrorMessage(errorMessage);
  }

  return {
    name: test.$.name,
    time: parseFloat(test.$.time || '0') * 1000, // convert to ms
    status: hasFailure || hasError ? 'failed' : 'passed',
    error: errorMessage,
  };
}

async function processTestDirectory(dirPath, directory) {
  const junitPath = path.join(dirPath, 'junit.xml');

  try {
    const suites = await parseJUnitXML(junitPath);
    const results = [];

    for (const suite of suites) {
      if (!suite.$ || !suite.testcase) continue;

      const properties = extractProperties(suite);
      // Get job name from properties, fallback to directory if not present
      const jobName = properties.JOB_NAME || directory;
      const runId = properties.RUN_ID ? parseInt(properties.RUN_ID) : env.RUN_ID;
      let jobId = await getJobId(runId, jobName);

      // If we couldn't find the GitHub job ID, use a timestamp as fallback
      if (!jobId) {
        console.warn(`⚠️  Could not find GitHub job ID for job '${jobName}' in run ${runId}, using timestamp`);
        // Log available jobs for debugging
        const jobs = await getJobs(runId);
        if (jobs.length > 0) {
          console.warn(`   Available GitHub jobs for run ${runId}:`);
          jobs.forEach(job => console.warn(`     - ${job.name} (ID: ${job.id})`));
        }
        jobId = Date.now() + Math.random(); // This creates the timestamp format we see: 1756704348110.869
      }

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
        ? firstTestCase.$.classname
        : 'unknown';

      // Remove shard number from job name
      const testRunName = jobName.replace(/\s+\(\d+\)$/, '');

      results.push({
        testRunName,
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
    console.log(`${testRun.name} ${status}`);

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

    console.log(`${`${total.tests} tests`} completed in ${formatTime(executionTime)}`);
    console.log(`  - ${total.passed} passed`);
    if (total.failed > 0) console.log(`  - ${total.failed} failed`);
    if (total.skipped > 0) console.log(`  - ${total.skipped} skipped`);

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
    console.log(`Mobile test report`);

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
    console.log(`Processing ${testRuns.length} test run(s)...\n`);
    const processedRuns = processTestRunRetries(testRuns);
    displayResults(processedRuns);

    // Create output directory
    console.log(`Generating Mobile test report: ${env.TEST_RUNS_PATH}`);
    const outputDir = path.dirname(env.TEST_RUNS_PATH);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(env.TEST_RUNS_PATH, JSON.stringify(processedRuns, null, 2));
    console.log(`Done`);

  } catch (error) {
    console.error(`❌ Error creating the mobile test report: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
