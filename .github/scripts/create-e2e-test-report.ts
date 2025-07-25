import * as fs from 'fs/promises';
import path from 'path';
import type {
  TestCase,
  TestFile,
  TestRun,
  TestSuite,
} from './shared/test-reports';
import {
  consoleBold,
  formatTime,
  normalizeTestPath,
  XML,
} from './shared/utils';
import type { Endpoints } from '@octokit/types';

// Extended Job type to handle additional status values from GitHub API
type Job = {
  id: number;
  name: string;
  status: string; // More flexible than the strict enum from octokit types
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  run_id: number;
  html_url: string | null;
};

async function main() {
  const { Octokit } = await import('octokit');

  const env = {
    OWNER: process.env.OWNER || 'metamask',
    REPOSITORY: process.env.REPOSITORY || 'metamask-mobile',
    BRANCH: process.env.BRANCH || 'main',
    TEST_SUMMARY_PATH:
      process.env.TEST_SUMMARY_PATH || '../../e2e/test-results/summary.md',
    TEST_RESULTS_PATH: process.env.TEST_RESULTS_PATH || '../../e2e/reports',
    TEST_RUNS_PATH:
      process.env.TEST_RUNS_PATH || '../../e2e/test-results/test-runs-mobile.json',
    GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true',
  };

  const github = new Octokit({ auth: env.GITHUB_TOKEN });

  const jobsCache: { [runId: number]: Job[] } = {};

  async function getJobs(runId: number) {
    if (!runId) {
      return [];
    } else if (jobsCache[runId]) {
      return jobsCache[runId];
    } else {
      try {
        const jobs = await github.paginate(
          github.rest.actions.listJobsForWorkflowRun,
          {
            owner: env.OWNER,
            repo: env.REPOSITORY,
            run_id: runId,
            per_page: 100,
          },
        );
        jobsCache[runId] = jobs;
        return jobsCache[runId];
      } catch (error) {
        return [];
      }
    }
  }

  async function getJobId(runId: number, jobName: string) {
    const jobs = await getJobs(runId);
    const job = jobs.find((job) => job.name.endsWith(jobName));
    return job?.id;
  }

  let summary = '';
  const core = env.GITHUB_ACTIONS
    ? await import('@actions/core')
    : {
        summary: {
          addRaw: (text: string) => {
            summary += text;
          },
          write: async () => await fs.writeFile(env.TEST_SUMMARY_PATH, summary),
        },
        setFailed: (msg: string) => console.error(msg),
      };

  const repositoryUrl = new URL('https://github.com');
  repositoryUrl.pathname = `/${env.OWNER}/${env.REPOSITORY}`;

  try {
    const testRuns: TestRun[] = [];
    
    // Add debugging to understand the file structure
    console.log(`🔍 Looking for test results in: ${env.TEST_RESULTS_PATH}`);
    console.log(`📁 Current working directory: ${process.cwd()}`);
    
    // List all files and directories in current directory for debugging
    try {
      const currentDirFiles = await fs.readdir('.');
      console.log(`📂 Files in current directory: ${currentDirFiles.join(', ')}`);
      
      // Check if e2e directory exists
      try {
        const e2eFiles = await fs.readdir('e2e');
        console.log(`📂 Files in e2e directory: ${e2eFiles.join(', ')}`);
      } catch (e) {
        console.log(`❌ e2e directory not found`);
      }
    } catch (e) {
      console.log(`❌ Could not list current directory: ${e}`);
    }
    
    // Check if the test results directory exists
    try {
      await fs.access(env.TEST_RESULTS_PATH);
      console.log(`✅ Test results directory found: ${env.TEST_RESULTS_PATH}`);
    } catch (error) {
      console.log(`❌ Test results directory ${env.TEST_RESULTS_PATH} not found. Creating empty report.`);
      console.log(`Error details: ${error}`);
      core.summary.addRaw('\n# 🧪 E2E Mobile Test Results\n\n');
      core.summary.addRaw('No test results found. Tests may not have run or failed to generate reports.\n');
      await core.summary.write();
      return;
    }

    const filenames = await fs.readdir(env.TEST_RESULTS_PATH);
    console.log(`📄 Files found in ${env.TEST_RESULTS_PATH}: ${filenames.join(', ')}`);
    
    // Filter for junit.xml files
    const junitFiles = filenames.filter(name => name.endsWith('.xml') || name === 'junit.xml');
    
    if (junitFiles.length === 0) {
      console.log('No JUnit XML files found in test results directory.');
      core.summary.addRaw('\n# 🧪 E2E Mobile Test Results\n\n');
      core.summary.addRaw('No JUnit XML test reports found.\n');
      await core.summary.write();
      return;
    }

    for (const filename of junitFiles) {
      console.log(`🔍 Processing XML file: ${filename}`);
      const file = await fs.readFile(
        path.join(env.TEST_RESULTS_PATH, filename),
        'utf8',
      );
      const results = await XML.parse(file);
      console.log(`📊 Parsed XML - testsuites:`, !!results.testsuites);

      const testsuites = results.testsuites?.testsuite || [];
      const suitesArray = Array.isArray(testsuites) ? testsuites : [testsuites];
      console.log(`📋 Found ${suitesArray.length} test suite(s)`);

      for (const suite of suitesArray) {
        console.log(`🔍 Processing suite: "${suite?.$.name}"`);
        console.log(`   - Has testcase: ${!!suite.testcase}`);
        console.log(`   - Has $.file: ${!!suite.$.file}`);
        console.log(`   - Suite attributes:`, Object.keys(suite.$ || {}));
        
        // Fix: Don't require $.file for mobile tests - use suite name as identifier
        if (!suite.testcase) {
          console.log(`⏩ Skipping suite - no test cases`);
          continue;
        }
        const tests = +suite.$.tests;
        const failed = +suite.$.failures;
        const skipped = tests - suite.testcase.length;
        const passed = tests - failed - skipped;

        console.log(`🔧 Properties in suite:`, !!suite.properties);
        if (suite.properties) {
          console.log(`🔧 Properties content:`, JSON.stringify(suite.properties, null, 2));
        }

        const jobName = suite.properties?.[0]?.property?.[0]?.$.value
          ? `${suite.properties?.[0].property?.[0]?.$.value}`
          : filename.replace('.xml', ''); // Use filename as fallback
        const runId = suite.properties?.[0]?.property?.[1]?.$.value
          ? +suite.properties?.[0].property?.[1]?.$.value
          : 0;
        const jobId = (await getJobId(runId, jobName)) ?? 0;
        const prNumber = suite.properties?.[0]?.property?.[2]?.$.value
          ? +suite.properties?.[0].property?.[2]?.$.value
          : 0;

        console.log(`🏷️ Extracted values - jobName: "${jobName}", runId: ${runId}, prNumber: ${prNumber}`);

        const testSuite: TestSuite = {
          name: suite.$.name,
          job: { name: jobName, id: jobId, runId, prNumber },
          date: new Date(suite.$.timestamp),
          tests,
          passed,
          failed,
          skipped,
          time: +suite.$.time * 1000, // convert to ms,
          attempts: [],
          testCases: [],
        };

        for (const test of suite.testcase || []) {
          const testCase: TestCase = {
            name: test.$.name,
            time: +test.$.time * 1000, // convert to ms
            status: test.failure ? 'failed' : 'passed',
            error: test.failure ? test.failure[0]._ : undefined,
          };
          testSuite.testCases.push(testCase);
        }

        const testFile: TestFile = {
          path: normalizeTestPath(suite.$.file || suite.$.name || 'e2e-tests'),
          tests: testSuite.tests,
          passed: testSuite.passed,
          failed: testSuite.failed,
          skipped: testSuite.skipped,
          time: testSuite.time,
          testSuites: [testSuite],
        };

        // Clean up mobile job names (remove smoke- prefix and platform suffixes)
        let cleanName = testSuite.job.name
          .replace(/^smoke-/, '')
          .replace(/-ios$/, '')
          .replace(/-android$/, '')
          .replace(/\s+\(\d+\)$/, ''); // Remove shard numbers if any
        
        // Add platform info to the test run name
        const platform = testSuite.job.name.includes('-ios') ? 'iOS' : 
                        testSuite.job.name.includes('-android') ? 'Android' : 'Unknown';
        cleanName = `${cleanName} (${platform})`;

        const testRun: TestRun = {
          name: cleanName,
          testFiles: [testFile],
        };

        const existingRun = testRuns.find((run) => run.name === testRun.name);
        if (existingRun) {
          const existingFile = existingRun.testFiles.find(
            (file) => file.path === testFile.path,
          );
          if (existingFile) {
            existingFile.testSuites.push(testSuite);
          } else {
            existingRun.testFiles.push(testFile);
          }
        } else {
          testRuns.push(testRun);
        }
      }
    }

    // Sort test runs by name for consistent output
    testRuns.sort((a, b) => a.name.localeCompare(b.name));

    for (const testRun of testRuns) {
      for (const testFile of testRun.testFiles) {
        // Group test suites by name
        const suitesByName: Record<string, TestSuite[]> = {};

        for (const suite of testFile.testSuites) {
          if (!suitesByName[suite.name]) {
            suitesByName[suite.name] = [];
          }
          suitesByName[suite.name].push(suite);
        }

        // Determine the latest test suite by date and nest attempts
        const attempts: TestSuite[][] = [];
        for (const suites of Object.values(suitesByName)) {
          suites.sort((a, b) => b.date.getTime() - a.date.getTime()); // sort newest first
          const [latest, ...otherAttempts] = suites;
          latest.attempts = otherAttempts;
          attempts.push(otherAttempts);
        }

        // Remove the nested attempts from the top-level list
        const attemptSet = new Set(attempts.flat());
        testFile.testSuites = testFile.testSuites.filter(
          (suite) => !attemptSet.has(suite),
        );

        const total = testFile.testSuites.reduce(
          (acc, suite) => ({
            tests: acc.tests + suite.tests,
            passed: acc.passed + suite.passed,
            failed: acc.failed + suite.failed,
            skipped: acc.skipped + suite.skipped,
            time: acc.time + suite.time,
          }),
          { tests: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
        );

        testFile.tests = total.tests;
        testFile.passed = total.passed;
        testFile.failed = total.failed;
        testFile.skipped = total.skipped;
        testFile.time = total.time;
      }

      testRun.testFiles.sort((a, b) => a.path.localeCompare(b.path));

      const title = `<strong>${testRun.name}</strong>`;

      if (testRun.testFiles.length) {
        const total = testRun.testFiles.reduce(
          (acc, file) => ({
            tests: acc.tests + file.tests,
            passed: acc.passed + file.passed,
            failed: acc.failed + file.failed,
            skipped: acc.skipped + file.skipped,
            time: acc.time + file.time,
          }),
          { tests: 0, passed: 0, failed: 0, skipped: 0, time: 0 },
        );

        if (total.failed > 0) {
          if (testRun.name) console.log(`${consoleBold(title)} ❌`);
          core.summary.addRaw(`\n<details open>\n`);
          core.summary.addRaw(`\n<summary>${title} ❌</summary>\n`);
        } else {
          if (testRun.name) console.log(`${consoleBold(title)} ✅`);
          core.summary.addRaw(`\n<details>\n`);
          core.summary.addRaw(`\n<summary>${title} ✅</summary>\n`);
        }

        const times = testRun.testFiles
          .map((file) =>
            file.testSuites.map((suite) => ({
              start: suite.date.getTime(),
              end: suite.date.getTime() + suite.time,
            })),
          )
          .flat();
        const earliestStart = Math.min(...times.map((t) => t.start));
        const latestEnd = Math.max(...times.map((t) => t.end));
        const executionTime = latestEnd - earliestStart;

        const conclusion = `<strong>${total.tests}</strong> ${
          total.tests === 1 ? 'test was' : 'tests were'
        } completed in <strong>${formatTime(
          executionTime,
        )}</strong> with <strong>${total.passed}</strong> passed, <strong>${
          total.failed
        }</strong> failed and <strong>${total.skipped}</strong> skipped.`;

        console.log(consoleBold(conclusion));
        core.summary.addRaw(`\n${conclusion}\n`);

        if (total.failed) {
          console.error(`\n❌ Failed tests\n`);
          core.summary.addRaw(`\n#### ❌ Failed tests\n`);
          core.summary.addRaw(
            `\n<hr style="height: 1px; margin-top: -5px; margin-bottom: 10px;">\n`,
          );
          for (const file of testRun.testFiles) {
            if (file.failed === 0) continue;
            console.error(file.path);
            const testUrl = new URL(repositoryUrl);
            testUrl.pathname += `/blob/${env.BRANCH}/${file.path}`;
            core.summary.addRaw(`\n#### [${file.path}](${testUrl})\n`);
            for (const suite of file.testSuites) {
              if (suite.failed === 0) continue;
              if (suite.job.name && suite.job.id && suite.job.runId) {
                const jobUrl = new URL(repositoryUrl);
                jobUrl.pathname += `/actions/runs/${suite.job.runId}/job/${suite.job.id}`;
                if (suite.job.prNumber) {
                  jobUrl.search = new URLSearchParams({
                    pr: suite.job.prNumber.toString(),
                  }).toString();
                }
                core.summary.addRaw(
                  `\n##### Job: [${suite.job.name}](${jobUrl})\n`,
                );
              }
              for (const test of suite.testCases) {
                if (test.status !== 'failed') continue;
                console.error(`  ${test.name}`);
                console.error(`  ${test.error}\n`);
                core.summary.addRaw(`\n##### ${test.name}\n`);
                core.summary.addRaw(`\n\`\`\`js\n${test.error}\n\`\`\`\n`);
              }
            }
          }
        }

        const rows = testRun.testFiles.map((file) => ({
          'Test file': file.path,
          Passed: file.passed ? `${file.passed} ✅` : '',
          Failed: file.failed ? `${file.failed} ❌` : '',
          Skipped: file.skipped ? `${file.skipped} ⏩` : '',
          Time: formatTime(file.time),
        }));

        const columns = Object.keys(rows[0]);
        const header = `| ${columns.join(' | ')} |`;
        const alignment = '| :--- | ---: | ---: | ---: | ---: |';
        const body = rows
          .map((row) => {
            const testUrl = new URL(repositoryUrl);
            testUrl.pathname += `/blob/${env.BRANCH}/${row['Test file']}`;
            const data = {
              ...row,
              'Test file': `[${row['Test file']}](${testUrl})`,
            };
            return `| ${Object.values(data).join(' | ')} |`;
          })
          .join('\n');
        const table = [header, alignment, body].join('\n');

        console.table(rows);
        core.summary.addRaw(`\n${table}\n`);
      } else {
        core.summary.addRaw(`\n<details open>\n`);
        core.summary.addRaw(`<summary>${title}</summary>\n`);
        console.log('No tests found');
        core.summary.addRaw('No tests found');
      }
      console.log();
      core.summary.addRaw(`</details>\n`);
    }

    // Add overall summary header
    if (testRuns.length > 0) {
      const overallTotal = testRuns.reduce(
        (acc, run) => {
          const runTotal = run.testFiles.reduce(
            (fileAcc, file) => ({
              tests: fileAcc.tests + file.tests,
              passed: fileAcc.passed + file.passed,
              failed: fileAcc.failed + file.failed,
              skipped: fileAcc.skipped + file.skipped,
            }),
            { tests: 0, passed: 0, failed: 0, skipped: 0 },
          );
          return {
            tests: acc.tests + runTotal.tests,
            passed: acc.passed + runTotal.passed,
            failed: acc.failed + runTotal.failed,
            skipped: acc.skipped + runTotal.skipped,
            suites: acc.suites + 1,
          };
        },
        { tests: 0, passed: 0, failed: 0, skipped: 0, suites: 0 },
      );

      const overallStatus = overallTotal.failed > 0 ? '❌' : '✅';
      const headerSummary = `# 🧪 E2E Mobile Test Results ${overallStatus}\n\n`;
      const statsSummary = `**${overallTotal.suites} test suites** with **${overallTotal.tests} tests** total: **${overallTotal.passed} passed**, **${overallTotal.failed} failed**, **${overallTotal.skipped} skipped**\n\n`;
      
      // Prepend the header
      summary = headerSummary + statsSummary + summary;
    }

    await core.summary.write();
    
    // Debug: Show final testRuns before writing
    console.log(`📝 Final testRuns array length: ${testRuns.length}`);
    console.log(`📄 Final testRuns content:`, JSON.stringify(testRuns, null, 2));
    
    // Ensure the test-results directory exists
    const testResultsDir = path.dirname(env.TEST_RUNS_PATH);
    await fs.mkdir(testResultsDir, { recursive: true });
    
    await fs.writeFile(env.TEST_RUNS_PATH, JSON.stringify(testRuns, null, 2));
  } catch (error) {
    core.setFailed(`Error creating the test report: ${error}`);
  }
}

main(); 