#!/usr/bin/env node

/**
 * Merges multiple Detox junit XML reports into a single deduplicated report.
 * 
 * This is useful when Detox retries failed tests, creating multiple XML 
 * files per test run, and we want the final report to reflect the actual
 * outcome after all retries.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import xml2js from 'xml2js';

const env = {
  REPORTS_DIR: process.env.E2E_REPORTS_DIR || './tests/reports',
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
 * Parse all XML files and combine test cases, keeping only the LATEST result for each test
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

  // Map to store LATEST result for each test case
  // Key: "suiteName::testcaseName::classname"
  // Value: { testcase, suiteName, suiteAttrs, timestamp }
  const testCaseMap = new Map();
  const suitePropertiesMap = new Map();

  // Process each XML file in chronological order (earliest to latest)
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
          const testName = testcase.$.name;
          const className = testcase.$.classname || suiteName;
          const key = `${suiteName}::${testName}::${className}`;

          const isFailure = !!testcase.failure;
          const isError = !!testcase.error;
          const isSkipped = !!testcase.skipped;

          // Check if we've seen this test before
          const existing = testCaseMap.get(key);
          const isRetry = !!existing;

          // Always keep the LATEST result (overwrite previous)
          testCaseMap.set(key, {
            testcase,
            suiteName,
            suiteAttrs: testsuite.$,
            timestamp,
          });

          const statusIcon = isFailure ? '❌' : isError ? '⚠️' : isSkipped ? '⊘' : '✅';
          const retryLabel = isRetry ? ' (retry)' : '';
          console.log(`      ${statusIcon} ${testName}${retryLabel}`);
        }

        // Track properties (use latest)
        if (testsuite.properties) {
          suitePropertiesMap.set(suiteName, testsuite.properties);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process ${xmlFile}: ${error.message}`);
      continue;
    }
  }

  console.log('\n🔄 Building deduplicated report with latest results...');
  console.log(`   Total unique test cases: ${testCaseMap.size}`);

  // Group test cases by suite name
  const suiteMap = new Map();

  for (const [key, { testcase, suiteName, suiteAttrs }] of testCaseMap) {
    if (!suiteMap.has(suiteName)) {
      suiteMap.set(suiteName, {
        attrs: suiteAttrs,
        testcases: [],
        properties: suitePropertiesMap.get(suiteName),
      });
    }
    suiteMap.get(suiteName).testcases.push(testcase);
  }

  // Build test suites with recalculated counts
  const finalTestSuites = [];
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalTime = 0;

  for (const [suiteName, { attrs, testcases, properties }] of suiteMap) {
    // Recalculate suite statistics based on deduplicated test cases
    let suiteFailures = 0;
    let suiteErrors = 0;
    let suiteSkipped = 0;
    let suiteTime = 0;

    for (const testcase of testcases) {
      if (testcase.failure) suiteFailures++;
      if (testcase.error) suiteErrors++;
      if (testcase.skipped) suiteSkipped++;
      suiteTime += parseFloat(testcase.$.time || '0');
    }

    const suite = {
      $: {
        ...attrs,
        name: suiteName,
        tests: testcases.length,
        failures: suiteFailures,
        errors: suiteErrors,
        skipped: suiteSkipped,
        time: suiteTime.toFixed(3),
      },
      testcase: testcases,
    };

    if (properties) {
      suite.properties = properties;
    }

    finalTestSuites.push(suite);

    totalTests += testcases.length;
    totalFailures += suiteFailures;
    totalErrors += suiteErrors;
    totalSkipped += suiteSkipped;
    totalTime += suiteTime;
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
      testsuite: finalTestSuites,
    },
  };

  console.log('\n📊 Final Report Summary (after deduplication):');
  console.log(`   Total Test Suites: ${finalTestSuites.length}`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Failures: ${totalFailures}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Total Time: ${totalTime.toFixed(3)}s`);

  return mergedReport;
}


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
  console.error('\n❌ Error merging XML reports:', error);
  process.exit(1);
});

