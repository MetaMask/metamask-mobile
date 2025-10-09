#!/usr/bin/env node

/**
 * Generate Slack notification summary for regression E2E tests
 * Usage: node .github/scripts/generate-regression-slack-summary.mjs [platform] [results-path]
 */

import fs from 'fs';
import path from 'path';

const platform = process.argv[2] || 'Android';
const resultsPath = process.argv[3] || path.join(process.cwd(), 'all-test-results');

/**
 * Parse all testsuites from JUnit XML and return them grouped by category
 */
function parseJUnitXML(xmlContent) {
  const suiteResults = {};

  // Extract all <testsuite> elements (not <testsuites>)
  // Match the opening tag and content separately since attributes can be in any order
  const testsuiteRegex = /<testsuite\s([^>]*)>([\s\S]*?)<\/testsuite>/g;

  let match;
  while ((match = testsuiteRegex.exec(xmlContent)) !== null) {
    const attributes = match[1];
    const suiteContent = match[2];

    // Extract attributes from the testsuite tag
    const nameMatch = attributes.match(/name="([^"]*)"/);
    const testsMatch = attributes.match(/tests="(\d+)"/);
    const failuresMatch = attributes.match(/failures="(\d+)"/);
    const errorsMatch = attributes.match(/errors="(\d+)"/);
    const skippedMatch = attributes.match(/skipped="(\d+)"/);

    if (!nameMatch || !testsMatch) continue;

    const suiteName = nameMatch[1];
    const tests = parseInt(testsMatch[1], 10);
    const failures = parseInt(failuresMatch ? failuresMatch[1] : '0', 10);
    const errors = parseInt(errorsMatch ? errorsMatch[1] : '0', 10);
    const skipped = parseInt(skippedMatch ? skippedMatch[1] : '0', 10);

    // Extract category from suite name
    const category = extractCategory(suiteName);

    if (!suiteResults[category]) {
      suiteResults[category] = {
        tests: 0,
        failures: 0,
        skipped: 0,
        errors: 0,
        failedTests: [],
      };
    }

    suiteResults[category].tests += tests;
    suiteResults[category].failures += failures + errors;
    suiteResults[category].skipped += skipped;

    // Extract failed test cases from this testsuite
    const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*>[\s\S]*?<failure[^>]*>([\s\S]*?)<\/failure>/g;
    let testMatch;
    while ((testMatch = testcaseRegex.exec(suiteContent)) !== null) {
      const testName = testMatch[1];
      const failureMessage = testMatch[2]
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .trim()
        .split('\n')[0]
        .substring(0, 200);

      suiteResults[category].failedTests.push({ name: testName, message: failureMessage });
    }
  }

  return suiteResults;
}

/**
 * Read and parse all XML files in a directory
 */
function parseAllXMLFiles(dirPath) {
  const allResults = {};

  if (!fs.existsSync(dirPath)) {
    return allResults;
  }

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.xml')) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const results = parseJUnitXML(content);

          // Merge results from this file into allResults
          Object.entries(results).forEach(([category, data]) => {
            if (!allResults[category]) {
              allResults[category] = {
                tests: 0,
                failures: 0,
                skipped: 0,
                errors: 0,
                failedTests: [],
              };
            }

            allResults[category].tests += data.tests;
            allResults[category].failures += data.failures;
            allResults[category].skipped += data.skipped;
            allResults[category].errors += data.errors;
            allResults[category].failedTests.push(...data.failedTests);
          });
        } catch (error) {
          console.error(`Error parsing ${filePath}:`, error.message);
        }
      }
    });
  }

  walkDir(dirPath);
  return allResults;
}

/**
 * Fetch job information from GitHub API
 */
async function getJobInfo() {
  const { GITHUB_TOKEN, GITHUB_RUN_ID, GITHUB_REPOSITORY } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'MetaMask-Mobile-CI',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching job info:', error);
    return null;
  }
}

/**
 * Extract category name from suite name
 */
function extractCategory(suiteName) {
  // Suite names are like "RegressionAccounts: Test Name"
  // Extract just the tag part before the colon
  const tagMatch = suiteName.match(/^(Regression\w+):/i);

  if (tagMatch) {
    // Return the tag as-is (e.g., "RegressionAccounts")
    return tagMatch[1];
  }

  return 'Other';
}

/**
 * Find job links for a category
 */
function getJobLinks(category, jobInfo) {
  const jobLinks = [];

  if (jobInfo?.jobs) {
    // Convert "RegressionAccounts" to "Accounts" for matching
    // Job names are like "Accounts Regression (Android)"
    const baseName = category.replace(/^Regression/, '');

    const matchingJobs = jobInfo.jobs.filter(
      (job) =>
        job.name.includes(baseName) &&
        job.name.includes('Regression') &&
        job.name.includes(platform) &&
        job.conclusion === 'failure'
    );

    matchingJobs.forEach((job) => {
      jobLinks.push(job.html_url);
    });
  }

  return jobLinks;
}

/**
 * Get all failed regression jobs
 */
function getFailedJobs(jobInfo) {
  if (!jobInfo?.jobs) {
    return [];
  }

  const failedJobs = jobInfo.jobs.filter(
    (job) =>
      job.name.includes('Regression') &&
      job.name.includes(platform) &&
      (job.conclusion === 'failure' || job.conclusion === 'cancelled')
  );

  return failedJobs.map((job) => {
    // Extract category from job name (e.g., "Assets Regression (Android) - 1" -> "RegressionAssets")
    const match = job.name.match(/(\w+)\s+Regression\s+\(/);
    const category = match ? `Regression${match[1]}` : 'Unknown';

    return {
      category,
      jobUrl: job.html_url,
      conclusion: job.conclusion,
    };
  });
}

/**
 * Check if the build job failed
 */
function getBuildJobFailure(jobInfo) {
  if (!jobInfo?.jobs) {
    return null;
  }

  const buildJob = jobInfo.jobs.find(
    (job) =>
      (job.name.includes('Build Android APKs') || job.name.includes('Build iOS')) &&
      (job.conclusion === 'failure' || job.conclusion === 'cancelled')
  );

  if (buildJob) {
    return {
      name: buildJob.name,
      url: buildJob.html_url,
      conclusion: buildJob.conclusion,
    };
  }

  return null;
}

/**
 * Check if a category has any failed jobs
 */
function categoryHasFailedJob(category, failedJobs) {
  return failedJobs.some((job) => job.category === category);
}

/**
 * Generate the Slack summary message
 */
async function generateSummary() {
  const categoryResults = parseAllXMLFiles(resultsPath);
  const jobInfo = await getJobInfo();

  const {
    GITHUB_SHA,
    GITHUB_REF_NAME,
    GITHUB_SERVER_URL,
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
  } = process.env;

  let summary = `:test_tube: *${platform} E2E Regression Tests*\n\n`;

  let totalTests = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  let hasFailures = false;

  // Check if build job failed
  const buildFailure = getBuildJobFailure(jobInfo);
  if (buildFailure) {
    hasFailures = true;
    const statusText = buildFailure.conclusion === 'cancelled' ? 'cancelled' : 'failed';
    summary += `:rotating_light: *Build ${statusText.toUpperCase()}* :rotating_light:\n`;
    summary += `The ${buildFailure.name} job ${statusText}. All tests were skipped.\n`;
    summary += `<${buildFailure.url}|:point_right: View Build Job>\n\n`;
    summary += `<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|View Full Run>\n\n`;
    summary += `:information_source: *Next Steps:*\n`;
    summary += `• Check the build job logs for errors\n`;
    summary += `• Fix any build issues before running tests again`;
    return { summary, hasFailures };
  }

  // Get all failed jobs
  const failedJobs = getFailedJobs(jobInfo);
  if (failedJobs.length > 0) {
    hasFailures = true;
  }

  // Check if we have no test results and no failed jobs detected
  // This could indicate an infrastructure issue (e.g., runner problems, artifact upload failures)
  const hasTestResults = Object.keys(categoryResults).length > 0;
  if (!hasTestResults && failedJobs.length === 0) {
    hasFailures = true;
    summary += `:warning: *Infrastructure Issue Detected* :warning:\n`;
    summary += `No test results were found and no failed jobs were detected.\n`;
    summary += `This may indicate:\n`;
    summary += `• Runner communication issues\n`;
    summary += `• Test result artifact upload failures\n`;
    summary += `• Other infrastructure problems\n\n`;
    summary += `<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|:point_right: View Full Run>\n\n`;
    summary += `:information_source: *Next Steps:*\n`;
    summary += `• Check the workflow run logs for errors\n`;
    summary += `• Verify self-hosted runners are healthy\n`;
    summary += `• Check if test artifacts were uploaded successfully`;
    return { summary, hasFailures };
  }

  // Sort categories alphabetically for consistent output
  const sortedCategories = Object.keys(categoryResults).sort();

  // Collect all categories (from XML and from failed jobs)
  const allCategories = new Set([
    ...sortedCategories,
    ...failedJobs.map((j) => j.category),
  ]);

  // Build test results
  const resultLines = [];
  Array.from(allCategories).sort().forEach((category) => {
    const results = categoryResults[category];
    const hasFailed = categoryHasFailedJob(category, failedJobs);
    const jobLinks = getJobLinks(category, jobInfo);

    // Job failed but no XML results
    if (hasFailed && (!results || results.tests === 0)) {
      const failedJob = failedJobs.find((j) => j.category === category);
      const statusText = failedJob.conclusion === 'cancelled' ? 'cancelled' : 'failed';
      resultLines.push(`:x: *${category}*: Job ${statusText} (no test results) | <${failedJob.jobUrl}|View Job>`);
      return;
    }

    // Skip empty categories that didn't fail
    if (!results || results.tests === 0) {
      return;
    }

    totalTests += results.tests;
    totalFailures += results.failures;
    totalSkipped += results.skipped;

    const passed = results.tests - results.failures - results.skipped;
    // Show failure icon if job failed OR if there are test failures
    const icon = (results.failures > 0 || hasFailed) ? ':x:' : ':white_check_mark:';

    let line = `${icon} *${category}*: ${passed} passed`;
    if (results.failures > 0) {
      hasFailures = true;
      line += `, ${results.failures} failed`;
    }
    if (results.skipped > 0) {
      line += `, ${results.skipped} skipped`;
    }

    // Add job failure note if job failed but tests passed
    if (hasFailed && results.failures === 0) {
      line += ` (job failed)`;
    }

    // Add job links
    if (jobLinks.length > 0) {
      line += ` | <${jobLinks[0]}|View Job>`;
    }

    resultLines.push(line);
  });

  summary += resultLines.join('\n') + '\n\n';

  // Add summary
  summary += `*Summary*\n`;
  summary += `:chart_with_upwards_trend: Total: *${totalTests}* tests\n`;
  summary += `:white_check_mark: Passed: *${totalTests - totalFailures - totalSkipped}*\n`;
  if (totalFailures > 0) summary += `:x: Failed: *${totalFailures}*\n`;
  if (totalSkipped > 0) summary += `:fast_forward: Skipped: *${totalSkipped}*\n`;

  // Add failed test details if there are test failures in XML (limit to 5 for readability)
  if (totalFailures > 0) {
    const allFailedTests = Object.values(categoryResults).flatMap((r) => r.failedTests);
    const uniqueFailures = [...new Set(allFailedTests.map((t) => t.name))].slice(0, 5);

    if (uniqueFailures.length > 0) {
      summary += `\n*Top Failed Tests*\n`;
      uniqueFailures.forEach((testName) => {
        // Truncate long test names
        const truncated = testName.length > 100 ? testName.substring(0, 100) + '...' : testName;
        summary += `:small_red_triangle: ${truncated}\n`;
      });

      if (allFailedTests.length > 5) {
        summary += `_...and ${allFailedTests.length - 5} more failures_\n`;
      }
    }
  }

  summary += `\n<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|:point_right: View Full Results>`;

  if (hasFailures) {
    summary += `\n\n:information_source: *Help improve test coverage:*\n`;
    summary += `• Unskip and fix failing tests\n`;
    summary += `• Move tests out of quarantine back into regression runs\n`;
    summary += `• Keep our test suite healthy and reliable!`;
  } else {
    summary += `\n\n:tada: *All tests passed!* Great work keeping the test suite healthy!`;
  }

  return { summary, hasFailures };
}

generateSummary()
  .then(({ summary, hasFailures }) => {
    console.log(summary);
    if (hasFailures) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Error generating summary:', error);
    console.log(
      `${platform} E2E Regression Tests\n---------------\nError generating test results`
    );
    process.exit(1);
  });
