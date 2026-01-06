#!/usr/bin/env node

/**
 * Extracts the paths of test files that passed and failed in a previous run.
 * On re-run, we only run failed tests - passed tests are skipped and
 * tests that were never executed stay in the queue.
 *
 * A test file is only considered "passed" if ALL of its test cases pass.
 * This handles files with multiple test cases where some pass and some fail.
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
 * jest-junit outputs XML with structure:
 * <testsuites>
 *   <testsuite name="TestSuite" tests="N" failures="N" ...>
 *     <testcase name="test name" classname="e2e/specs/path/to/file.spec.ts" time="N">
 *       <failure>...</failure>  <!-- only if failed -->
 *     </testcase>
 *   </testsuite>
 * </testsuites>
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
    // List all files in directory to help debug
    try {
      const allFiles = fs.readdirSync(resultsDir);
      console.log(`  Directory contents: ${allFiles.join(', ') || '(empty)'}`);
    } catch (e) {
      console.log(`  Could not list directory: ${e.message}`);
    }
    return emptyResult;
  }

  console.log(`Found ${files.length} XML file(s) to parse: ${files.join(', ')}`);

  // Track all executed test files and which ones have failures
  // Key: normalized file path, Value: { executed: true, failed: boolean }
  const testFileResults = new Map();

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

      console.log(`  Parsing ${file}: found ${testsuites.length} testsuite(s)`);

      for (const suite of testsuites) {
        // Get testcases from the suite
        let testcases = [];
        if (suite.testcase) {
          testcases = Array.isArray(suite.testcase)
            ? suite.testcase
            : [suite.testcase];
        }

        console.log(`    Suite "${suite.$?.name || 'unnamed'}": ${testcases.length} testcase(s)`);
        
        // Debug: show first testcase structure
        if (testcases.length > 0 && testcases[0].$) {
          console.log(`    First testcase classname: "${testcases[0].$.classname || 'N/A'}"`);
        }

        for (const testcase of testcases) {
          if (!testcase.$ || !testcase.$.classname) {
            continue;
          }

          // jest-junit puts the file path in classname when using {filepath} template
          const classname = testcase.$.classname;
          
          // Only process if it looks like a spec file path
          if (!classname.includes('.spec.')) {
            console.log(`    Skipping classname (no .spec.): "${classname}"`);
            continue;
          }

          const testPath = normalizeTestPath(classname);
          
          // Check if this testcase has failures or errors
          const hasFailure = !!testcase.failure;
          const hasError = !!testcase.error;
          const testFailed = hasFailure || hasError;

          // Get or create entry for this file
          if (!testFileResults.has(testPath)) {
            testFileResults.set(testPath, { executed: true, failed: false });
          }

          // If any test in the file fails, mark the whole file as failed
          if (testFailed) {
            testFileResults.get(testPath).failed = true;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse XML file ${file}:`, error?.message || error);
    }
  }

  // Build result arrays
  const executedTests = [];
  const passedTests = [];
  const failedTests = [];

  for (const [testPath, result] of testFileResults) {
    executedTests.push(testPath);
    if (result.failed) {
      failedTests.push(testPath);
    } else {
      passedTests.push(testPath);
    }
  }

  console.log(`Found ${executedTests.length} executed test files`);
  console.log(`Found ${failedTests.length} failed test files`);
  console.log(`Found ${passedTests.length} fully passed test files`);

  if (failedTests.length > 0) {
    console.log(`Failed tests: ${failedTests.join(', ')}`);
  }

  return {
    passed: passedTests,
    failed: failedTests,
    executed: executedTests,
  };
}

/**
 * CLI entry point for testing the script directly
 */
if (process.argv[1].endsWith('e2e-extract-test-results.mjs')) {
  const resultsDir = process.argv[2] || './previous-test-results';

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
