#!/usr/bin/env node

/**
 * Merges multiple junit XML reports into a single report.
 * 
 * For test cases that appear in multiple reports (retries), keeps only the 
 * LAST run result based on file timestamp. This is useful when Detox retries
 * failed tests, creating multiple XML files per test run.
 * 
 * Process:
 * 1) Find all junit-*.xml files in e2e/reports directory
 * 2) Parse and group test cases by unique key (classname::testname)
 * 3) Keep only the latest result for each test case
 * 4) Write merged report to junit.xml
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import xml2js from 'xml2js';

const env = {
  REPORTS_DIR: process.env.E2E_REPORTS_DIR || './e2e/reports',
  OUTPUT_FILE: process.env.E2E_OUTPUT_FILE || 'junit.xml',
};

const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder({
  xmldec: { version: '1.0', encoding: 'UTF-8' },
  renderOpts: { pretty: true, indent: '  ' },
});

/**
 * Extract timestamp from filename (e.g., junit-2025-10-17T12-18-43-667Z.xml)
 * @param {string} filename - The filename to extract timestamp from
 * @returns {string} Sortable timestamp string
 */
function extractTimestamp(filename) {
  const match = filename.match(/junit-(.+)\.xml$/);
  return match ? match[1] : '';
}

/**
 * Generate unique key for a test case
 * @param {Object} testcase - Test case object with $ property containing classname and name
 * @returns {string} Unique key in format "classname::testname"
 */
function getTestCaseKey(testcase) {
  return `${testcase.$.classname}::${testcase.$.name}`;
}

/**
 * Find all junit XML files in the reports directory
 * @returns {Promise<string[]>} Sorted array of XML filenames
 */
async function findJUnitXmlFiles() {
  try {
    const files = await readdir(env.REPORTS_DIR);
    const xmlFiles = files
      .filter(f => f.startsWith('junit-') && f.endsWith('.xml'))
      .sort((a, b) => extractTimestamp(a).localeCompare(extractTimestamp(b)));

    return xmlFiles;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️  Reports directory not found: ${env.REPORTS_DIR}`);
      return [];
    }
    throw error;
  }
}

/**
 * Parse a junit XML file
 * @param {string} filePath - Path to the XML file
 * @returns {Promise<Object>} Parsed XML data
 */
async function parseJUnitXML(filePath) {
  const xmlContent = await readFile(filePath, 'utf-8');
  return await xmlParser.parseStringPromise(xmlContent);
}

/**
 * Parse all XML files and organize test cases by their last run
 * @returns {Promise<Object|null>} Merged report data or null if no files found
 */
async function parseAndMergeReports() {
  console.log('🔍 Scanning for junit XML files...');

  const xmlFiles = await findJUnitXmlFiles();

  if (xmlFiles.length === 0) {
    console.log('⚠️  No junit XML files found to merge');
    return null;
  }

  console.log(`📁 Found ${xmlFiles.length} report file(s):`);
  xmlFiles.forEach(f => console.log(`   - ${f}`));

  // Store test cases by their unique key, keeping track of latest version
  const testCaseMap = new Map();
  const testSuiteMap = new Map();

  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalTime = 0;

  // Process each XML file in chronological order
  for (const xmlFile of xmlFiles) {
    const filePath = join(env.REPORTS_DIR, xmlFile);
    const timestamp = extractTimestamp(xmlFile);

    console.log(`\n📄 Processing: ${xmlFile}`);

    try {
      const parsed = await parseJUnitXML(filePath);

      if (!parsed.testsuites || !parsed.testsuites.testsuite) {
        console.log('   ⚠️  No test suites found, skipping');
        continue;
      }

      const testsuites = Array.isArray(parsed.testsuites.testsuite)
        ? parsed.testsuites.testsuite
        : [parsed.testsuites.testsuite];

      for (const testsuite of testsuites) {
        const suiteName = testsuite.$.name;

        if (!testsuite.testcase) {
          console.log(`   ⚠️  Suite "${suiteName}" has no test cases`);
          continue;
        }

        const testcases = Array.isArray(testsuite.testcase)
          ? testsuite.testcase
          : [testsuite.testcase];

        console.log(`   📦 Suite: "${suiteName}" (${testcases.length} test(s))`);

        for (const testcase of testcases) {
          const key = getTestCaseKey(testcase);
          const isFailure = !!testcase.failure;
          const isError = !!testcase.error;
          const isSkipped = !!testcase.skipped;

          // Store or update test case (later timestamps override earlier ones)
          testCaseMap.set(key, {
            testcase,
            suiteName,
            timestamp,
            isFailure,
            isError,
            isSkipped,
          });

          console.log(`      ${isFailure ? '❌' : isError ? '⚠️' : isSkipped ? '⊘' : '✅'} ${testcase.$.name}`);
        }

        // Store suite metadata (will be updated with latest properties)
        if (!testSuiteMap.has(suiteName)) {
          testSuiteMap.set(suiteName, {
            properties: testsuite.properties,
          });
        } else {
          // Update with latest properties
          testSuiteMap.set(suiteName, {
            properties: testsuite.properties,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process ${xmlFile}: ${error.message}`);
      continue;
    }
  }

  console.log('\n🔄 Building merged report...');

  // Group test cases by suite name
  const suiteGroups = new Map();
  for (const [key, data] of testCaseMap.entries()) {
    if (!suiteGroups.has(data.suiteName)) {
      suiteGroups.set(data.suiteName, []);
    }
    suiteGroups.get(data.suiteName).push(data);
  }

  // Build merged test suites
  const mergedTestSuites = [];

  for (const [suiteName, testCases] of suiteGroups.entries()) {
    const suiteFailures = testCases.filter(tc => tc.isFailure).length;
    const suiteErrors = testCases.filter(tc => tc.isError).length;
    const suiteSkipped = testCases.filter(tc => tc.isSkipped).length;
    const suiteTime = testCases.reduce((sum, tc) => sum + parseFloat(tc.testcase.$.time || 0), 0);

    totalTests += testCases.length;
    totalFailures += suiteFailures;
    totalErrors += suiteErrors;
    totalSkipped += suiteSkipped;
    totalTime += suiteTime;

    const suite = {
      $: {
        name: suiteName,
        tests: testCases.length,
        failures: suiteFailures,
        errors: suiteErrors,
        skipped: suiteSkipped,
        time: suiteTime.toFixed(3),
        timestamp: new Date().toISOString(),
      },
      testcase: testCases.map(tc => tc.testcase),
    };

    // Add properties if they exist
    const suiteMetadata = testSuiteMap.get(suiteName);
    if (suiteMetadata?.properties) {
      suite.properties = suiteMetadata.properties;
    }

    mergedTestSuites.push(suite);

    console.log(`   📦 ${suiteName}:`);
    console.log(`      Tests: ${testCases.length}, Failures: ${suiteFailures}, Errors: ${suiteErrors}, Skipped: ${suiteSkipped}`);
  }

  // Build final XML structure
  const mergedReport = {
    testsuites: {
      $: {
        name: 'jest tests',
        tests: totalTests,
        failures: totalFailures,
        errors: totalErrors,
        time: totalTime.toFixed(3),
      },
      testsuite: mergedTestSuites,
    },
  };

  console.log('\n📊 Final Report Summary:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Failures: ${totalFailures}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Total Time: ${totalTime.toFixed(3)}s`);

  return mergedReport;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting JUnit report merge...\n');

  const mergedReport = await parseAndMergeReports();

  if (!mergedReport) {
    console.log('\n⚠️  No reports to merge, skipping output file creation');
    process.exit(0);
  }

  // Convert to XML
  const xml = xmlBuilder.buildObject(mergedReport);

  // Write merged report
  const outputPath = join(env.REPORTS_DIR, env.OUTPUT_FILE);
  await writeFile(outputPath, xml, 'utf-8');

  console.log(`\n✅ Merged report written to: ${outputPath}`);
  console.log('🎉 Merge complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Error merging reports:', error);
  process.exit(1);
});

