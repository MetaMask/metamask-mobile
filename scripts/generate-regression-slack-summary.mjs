#!/usr/bin/env node

/**
 * Generate Slack notification summary for regression E2E tests
 * Usage: node scripts/generate-regression-slack-summary.mjs [platform] [results-path]
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

  // Sort categories alphabetically for consistent output
  const sortedCategories = Object.keys(categoryResults).sort();

  // Build test results
  const resultLines = [];
  sortedCategories.forEach((category) => {
    const results = categoryResults[category];
    const jobLinks = getJobLinks(category, jobInfo);

    if (results.tests === 0) {
      return; // Skip empty categories
    }

    totalTests += results.tests;
    totalFailures += results.failures;
    totalSkipped += results.skipped;

    const passed = results.tests - results.failures - results.skipped;
    const icon = results.failures > 0 ? ':x:' : ':white_check_mark:';

    let line = `${icon} *${category}*: ${passed} passed`;
    if (results.failures > 0) {
      hasFailures = true;
      line += `, ${results.failures} failed`;
    }
    if (results.skipped > 0) {
      line += `, ${results.skipped} skipped`;
    }

    // Add job links for failures
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

  // Add failed test details if there are failures (limit to 5 for readability)
  if (hasFailures) {
    const allFailedTests = Object.values(categoryResults).flatMap((r) => r.failedTests);
    const uniqueFailures = [...new Set(allFailedTests.map((t) => t.name))].slice(0, 5);

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

  summary += `\n<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|:point_right: View Full Results>`;

  return summary;
}

generateSummary()
  .then((summary) => {
    console.log(summary);
  })
  .catch((error) => {
    console.error('Error generating summary:', error);
    console.log(
      `${platform} E2E Regression Tests\n---------------\nError generating test results`
    );
  });