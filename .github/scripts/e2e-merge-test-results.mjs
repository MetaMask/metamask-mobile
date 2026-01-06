#!/usr/bin/env node

/**
 * Merges test results from a previous run into the current results directory.
 * Only copies results for tests that were NOT executed in the current run.
 * This preserves results for tests that were skipped (passed in previous runs).
 *
 * This is needed for re-runs (attempt > 2) where:
 * - Attempt 1: All tests run, results uploaded
 * - Attempt 2: Only failed tests re-run, but artifact only contains those results
 * - Attempt 3+: Would lose information about tests that passed in attempt 1
 *
 * By merging, we ensure all historical pass/fail information is preserved.
 * 
 * Note: jest-junit is configured with classNameTemplate: '{filepath}'
 * which puts the file path in each testcase's classname attribute.
 */

import fs from 'node:fs';
import path from 'node:path';
import xml2js from 'xml2js';

const xmlParser = new xml2js.Parser();

/**
 * Normalize a test path to be relative and consistent
 * @param {string} filePath - The path to normalize
 * @returns {string} Normalized path starting with e2e/
 */
function normalizeTestPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const e2eIndex = normalized.indexOf('e2e/');
  if (e2eIndex !== -1) {
    return normalized.slice(e2eIndex);
  }
  return normalized;
}

/**
 * Parse XML content using xml2js
 * @param {string} content - XML content to parse
 * @returns {Promise<Object>} Parsed XML data
 */
async function parseXml(content) {
  return xmlParser.parseStringPromise(content);
}

/**
 * Extracts test file paths from an XML result file
 * @param {string} xmlPath - Path to the XML file
 * @returns {Promise<string[]>} Array of test file paths
 */
async function getTestFilesFromXml(xmlPath) {
  try {
    const content = fs.readFileSync(xmlPath, 'utf-8');
    const result = await parseXml(content);
    const files = new Set();

    // Handle both single testsuite and testsuites wrapper
    let testsuites = [];
    if (result.testsuites?.testsuite) {
      testsuites = Array.isArray(result.testsuites.testsuite)
        ? result.testsuites.testsuite
        : [result.testsuites.testsuite];
    } else if (result.testsuite) {
      testsuites = Array.isArray(result.testsuite)
        ? result.testsuite
        : [result.testsuite];
    }

    for (const suite of testsuites) {
      // Get testcases from the suite
      let testcases = [];
      if (suite.testcase) {
        testcases = Array.isArray(suite.testcase)
          ? suite.testcase
          : [suite.testcase];
      }

      for (const testcase of testcases) {
        if (!testcase.$ || !testcase.$.classname) {
          continue;
        }

        // jest-junit puts the file path in classname when using {filepath} template
        const classname = testcase.$.classname;
        
        // Only process if it looks like a spec file path
        if (classname.includes('.spec.')) {
          files.add(normalizeTestPath(classname));
        }
      }
    }

    return [...files];
  } catch (error) {
    console.warn(`Failed to parse ${xmlPath}:`, error?.message || error);
    return [];
  }
}

/**
 * Gets all test file paths from XML results in a directory
 * @param {string} resultsDir - Directory containing XML files
 * @returns {Promise<Set<string>>} Set of test file paths
 */
async function getTestFilesFromResults(resultsDir) {
  const testFiles = new Set();

  if (!fs.existsSync(resultsDir)) {
    return testFiles;
  }

  const xmlFiles = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.xml'));

  for (const file of xmlFiles) {
    const files = await getTestFilesFromXml(path.join(resultsDir, file));
    files.forEach((f) => testFiles.add(f));
  }

  return testFiles;
}

/**
 * Merges test results from a previous run into the current results directory.
 * @param {string} previousResultsDir - Directory with previous run's XML results
 * @param {string} currentResultsDir - Directory with current run's XML results
 */
export async function mergeTestResults(previousResultsDir, currentResultsDir) {
  // Ensure current results directory exists
  fs.mkdirSync(currentResultsDir, { recursive: true });

  if (!fs.existsSync(previousResultsDir)) {
    console.log(`Previous results directory does not exist: ${previousResultsDir}`);
    return;
  }

  // Get test files that have results in current run
  const currentTestFiles = await getTestFilesFromResults(currentResultsDir);
  console.log(`Found ${currentTestFiles.size} test files in current results`);

  // Get XML files from previous results and copy if test not in current
  const previousXmls = fs.readdirSync(previousResultsDir).filter((f) =>
    f.endsWith('.xml'),
  );
  let copiedCount = 0;

  for (const xmlFile of previousXmls) {
    const previousXmlPath = path.join(previousResultsDir, xmlFile);
    const testFiles = await getTestFilesFromXml(previousXmlPath);

    // Check if ANY test in this XML was executed in current run
    const alreadyExecuted = testFiles.some((tf) => currentTestFiles.has(tf));

    if (!alreadyExecuted && testFiles.length > 0) {
      // Copy the XML file - preserves result for skipped test
      const destPath = path.join(currentResultsDir, xmlFile);
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(previousXmlPath, destPath);
        copiedCount++;
        console.log(`Copied result for skipped test: ${testFiles[0]}`);
      }
    }
  }

  console.log(`Merged ${copiedCount} test result files from previous run`);
}

/**
 * CLI entry point
 */
if (process.argv[1].endsWith('e2e-merge-test-results.mjs')) {
  const previousDir = process.argv[2] || './previous-test-results';
  const currentDir = process.argv[3] || './e2e/reports';

  mergeTestResults(previousDir, currentDir)
    .then(() => console.log('Merge complete'))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
