#!/usr/bin/env node

/**
 * Extracts the paths of test files that passed and failed in a previous run.
 * On re-run, we only run failed tests - passed tests are skipped and
 * tests that were never executed stay in the queue.
 *
 * A test file is only considered "passed" if ALL of its test suites pass.
 * This handles files with multiple test suites where some pass and some fail.
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
  // Find the e2e/ part of the path and return from there
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
 * Extracts test results from JUnit XML files in the results directory.
 *
 * @param {string} resultsDir - Directory containing XML test result files
 * @returns {Promise<{passed: string[], failed: string[], executed: string[]}>}
 */
export async function extractTestResults(resultsDir) {
  const emptyResult = {
    passed: [],
    failed: [],
    executed: [],
  };

  if (!fs.existsSync(resultsDir)) {
    console.log(`Results directory does not exist: ${resultsDir}`);
    return emptyResult;
  }

  const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.xml'));

  if (files.length === 0) {
    console.log(`No XML files found in: ${resultsDir}`);
    return emptyResult;
  }

  // Track all executed test files and which ones have failures
  const executedTests = new Set();
  const failedTests = new Set();

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(resultsDir, file), 'utf-8');
      const result = await parseXml(content);

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
        if (!suite.$ || !suite.$.file) {
          // Try to extract file path from the suite name for Detox reports
          // Detox uses classname or name which often contains the spec file path
          const classname = suite.$?.classname || suite.$?.name || '';
          if (classname.includes('.spec.')) {
            const testPath = normalizeTestPath(classname);
            executedTests.add(testPath);

            const failures = parseInt(suite.$?.failures || '0', 10);
            const errors = parseInt(suite.$?.errors || '0', 10);

            if (failures > 0 || errors > 0) {
              failedTests.add(testPath);
            }
          }
          continue;
        }

        const testPath = normalizeTestPath(suite.$.file);
        executedTests.add(testPath);

        const failures = parseInt(suite.$.failures || '0', 10);
        const errors = parseInt(suite.$.errors || '0', 10);

        // If ANY suite in the file has failures/errors, mark the file as failed
        if (failures > 0 || errors > 0) {
          failedTests.add(testPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse XML file ${file}:`, error?.message || error);
    }
  }

  // Passed tests = executed tests that have NO failures in ANY suite
  const passedTests = [...executedTests].filter(
    (testPath) => !failedTests.has(testPath),
  );

  console.log(`Found ${executedTests.size} executed test files`);
  console.log(`Found ${failedTests.size} failed test files`);
  console.log(`Found ${passedTests.length} fully passed test files`);

  return {
    passed: passedTests,
    failed: [...failedTests],
    executed: [...executedTests],
  };
}

/**
 * CLI entry point for testing the script directly
 */
if (process.argv[1].endsWith('e2e-extract-test-results.mjs')) {
  const resultsDir = process.argv[2] || './previous-test-results/e2e/reports';

  extractTestResults(resultsDir)
    .then((results) => {
      console.log('\nPassed tests:', results.passed);
      console.log('\nFailed tests:', results.failed);
      console.log('\nExecuted tests:', results.executed);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

