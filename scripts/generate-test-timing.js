#!/usr/bin/env node

/**
 * Script to generate a JSON file with test names and their execution times.
 *
 * For detailed documentation, see: scripts/generate-test-timing.README.md
 *
 * Quick Usage:
 *   yarn test:timing
 *   node scripts/generate-test-timing.js [test-path] [--output filename.json]
 *
 * Examples:
 *   node scripts/generate-test-timing.js
 *   node scripts/generate-test-timing.js ./app/components
 *   node scripts/generate-test-timing.js --output test-results.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const defaultTestPaths = ['./app/', './locales/', './e2e/**/*.test.ts', '.github/**/*.test.ts'];
let testPaths = defaultTestPaths;
let outputFile = 'test-timing-results.json';

// Parse arguments
const pathArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' || args[i] === '-o') {
    outputFile = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    pathArgs.push(args[i]);
  }
}

// If custom paths provided, use them; otherwise use defaults
if (pathArgs.length > 0) {
  testPaths = pathArgs;
}

console.log('🧪 Running tests to collect timing data...');
console.log(`📁 Test paths: ${testPaths.join(' ')}`);
console.log(`📄 Output file: ${outputFile}`);

try {
  // Run Jest with JSON output
  // Construct command with proper argument handling
  const testPathsStr = testPaths.join(' ');
  const jestCommand = `yarn jest ${testPathsStr} --json --no-coverage`;
  console.log(`\n⏳ Executing: ${jestCommand}\n`);

  const startTime = Date.now();
  let jestOutput;
  let jestResults;

  try {
    jestOutput = execSync(jestCommand, {
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });
  } catch (error) {
    // Jest may exit with non-zero code even if some tests passed
    // Try to extract JSON from stderr if stdout is empty
    jestOutput = error.stdout || error.stderr || '';

    // If we can't get output, try to parse stderr
    if (!jestOutput && error.stderr) {
      jestOutput = error.stderr;
    }
  }

  const endTime = Date.now();

  // Parse Jest JSON output
  // Jest outputs JSON to stdout when using --json flag
  try {
    // Try to parse the entire output as JSON first
    jestResults = JSON.parse(jestOutput.trim());
  } catch (firstError) {
    // If that fails, try to extract JSON object from the output
    // Jest might output warnings before the JSON
    try {
      // Find the last complete JSON object in the output
      const lines = jestOutput.split('\n');
      let jsonStart = -1;
      let braceCount = 0;

      // Find where JSON starts
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{')) {
          jsonStart = i;
          break;
        }
      }

      if (jsonStart >= 0) {
        // Extract from JSON start to end
        const jsonLines = lines.slice(jsonStart).join('\n');
        // Try to find the complete JSON by counting braces
        let jsonEnd = jsonLines.length;
        braceCount = 0;
        for (let i = 0; i < jsonLines.length; i++) {
          if (jsonLines[i] === '{') braceCount++;
          if (jsonLines[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }

        jestResults = JSON.parse(jsonLines.substring(0, jsonEnd));
      } else {
        throw new Error('No JSON object found in Jest output');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Jest JSON output');
      console.error('Parse error:', parseError.message);
      console.error('Jest output (first 1000 chars):', jestOutput.substring(0, 1000));
      process.exit(1);
    }
  }

  // Extract test results
  const testResults = {
    summary: {
      totalTests: jestResults.numTotalTests || 0,
      passedTests: jestResults.numPassedTests || 0,
      failedTests: jestResults.numFailedTests || 0,
      skippedTests: jestResults.numSkippedTests || 0,
      totalTime: endTime - startTime,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    },
    tests: [],
  };

  // Process each test suite
  if (jestResults.testResults && Array.isArray(jestResults.testResults)) {
    jestResults.testResults.forEach((testSuite) => {
      const suiteName = testSuite.name;

      if (testSuite.assertionResults && Array.isArray(testSuite.assertionResults)) {
        testSuite.assertionResults.forEach((test) => {
          testResults.tests.push({
            name: test.title || test.fullName || 'Unknown Test',
            suite: suiteName,
            status: test.status || 'unknown',
            duration: test.duration || 0, // Duration in milliseconds
            durationSeconds: test.duration ? (test.duration / 1000).toFixed(3) : 0,
            failureMessages: test.failureMessages || [],
          });
        });
      }
    });
  }

  // Sort tests by duration (longest first)
  testResults.tests.sort((a, b) => b.duration - a.duration);

  // Calculate statistics
  const durations = testResults.tests.map((t) => t.duration).filter((d) => d > 0);
  if (durations.length > 0) {
    testResults.statistics = {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)],
      totalDuration: durations.reduce((a, b) => a + b, 0),
    };
  }

  // Write results to file
  const outputPath = path.resolve(process.cwd(), outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2), 'utf-8');

  // Print summary
  console.log('\n✅ Test timing data collected successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   Total Tests: ${testResults.summary.totalTests}`);
  console.log(`   Passed: ${testResults.summary.passedTests}`);
  console.log(`   Failed: ${testResults.summary.failedTests}`);
  console.log(`   Skipped: ${testResults.summary.skippedTests}`);
  console.log(`   Total Execution Time: ${testResults.summary.totalTime}ms`);

  if (testResults.statistics) {
    console.log(`\n⏱️  Timing Statistics:`);
    console.log(`   Average: ${testResults.statistics.averageDuration.toFixed(2)}ms`);
    console.log(`   Min: ${testResults.statistics.minDuration}ms`);
    console.log(`   Max: ${testResults.statistics.maxDuration}ms`);
    console.log(`   Median: ${testResults.statistics.medianDuration}ms`);
  }

  console.log(`\n📄 Results written to: ${outputPath}`);
  console.log(`\n🔝 Top 10 slowest tests:`);
  testResults.tests.slice(0, 10).forEach((test, index) => {
    console.log(
      `   ${index + 1}. ${test.name} (${test.duration}ms) - ${test.suite}`,
    );
  });

  process.exit(jestResults.success ? 0 : 1);
} catch (error) {
  console.error('❌ Error generating test timing data:', error.message);
  if (error.stdout) {
    console.error('STDOUT:', error.stdout);
  }
  if (error.stderr) {
    console.error('STDERR:', error.stderr);
  }
  process.exit(1);
}

