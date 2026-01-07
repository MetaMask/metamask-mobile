#!/usr/bin/env node

const { getPRChangedFiles, hasTestFile } = require('./utils/git-utils');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Parse SonarCloud exclusion patterns from sonar-project.properties
 */
function parseSonarCloudExclusions() {
  try {
    const sonarPropsPath = path.join(process.cwd(), 'sonar-project.properties');
    if (!fs.existsSync(sonarPropsPath)) {
      console.warn('⚠️  sonar-project.properties not found, using basic exclusions only');
      return [];
    }

    const content = fs.readFileSync(sonarPropsPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('sonar.coverage.exclusions=')) {
        const exclusionsString = trimmedLine.substring('sonar.coverage.exclusions='.length);
        // Split by comma and clean up patterns
        const patterns = exclusionsString.split(',').map(pattern => pattern.trim()).filter(Boolean);
        return patterns;
      }
    }

    return [];
  } catch (error) {
    console.warn('⚠️  Failed to parse sonar-project.properties:', error.message);
    return [];
  }
}

/**
 * Check if a file matches any SonarCloud exclusion pattern
 */
function matchesExclusionPattern(filePath, patterns) {
  for (const pattern of patterns) {
    // Convert SonarCloud glob patterns to JavaScript regex
    // ** means any number of directories
    // * means any characters within a directory/filename
    let regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** -> .*
      .replace(/\*/g, '[^/]*') // * -> [^/]* (match within directory)
      .replace(/\./g, '\\.');  // Escape dots

    // Add anchors for exact matching
    regexPattern = '^' + regexPattern + '$';

    const regex = new RegExp(regexPattern);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get current git branch name and sanitize for filename
 */
function getCurrentBranchName() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: process.cwd() }).trim();

    if (!branch) {
      throw new Error('Git branch name is empty - ensure you are in a git repository with a checked out branch');
    }

    // Sanitize branch name for filename (replace problematic chars)
    return branch.replace(/[/\\:*?"<>|]/g, '-');
  } catch (error) {
    console.error('❌ Failed to detect git branch:', error.message);
    throw new Error(`Cannot determine git branch name: ${error.message}`);
  }
}

/**
 * Run git diff command for a specific file
 */
function runGitDiff(file) {
  const cmd = `git diff --unified=0 main...HEAD -- "${file}"`;
  return execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
}

/**
 * Extract line numbers from a diff hunk
 */
function extractLinesFromHunk(match, debugMode = false) {
  const startLine = parseInt(match[1]);
  const lineCount = match[2] ? parseInt(match[2]) : 1;

  if (debugMode) {
    console.log(`Found hunk: +${startLine},${lineCount} (lines ${startLine} to ${startLine + lineCount - 1})`);
  }

  const lines = [];
  for (let i = startLine; i < startLine + lineCount; i++) {
    lines.push(i);
  }
  return lines;
}

/**
 * Parse diff output to extract changed line numbers
 */
function parseDiffOutput(output, file, debugMode = false) {
  const changedLines = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Check if this is a new file
    if (line.includes('new file mode')) {
      if (debugMode) console.log(`Detected new file: ${file}`);
    }

    // Parse lines like "@@ -45,3 +45,8 @@" to extract added line ranges
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (match) {
      const hunkLines = extractLinesFromHunk(match, debugMode);
      changedLines.push(...hunkLines);
    }
  }

  return changedLines.sort((a, b) => a - b);
}

/**
 * Get changed line numbers for a specific file using git diff
 */
function getChangedLines(file, debugMode = false) {
  try {
    const output = runGitDiff(file);

    if (debugMode) {
      console.log(`\n--- Git diff for ${file} ---`);
      console.log(output);
      console.log('--- End git diff ---\n');
    }

    const changedLines = parseDiffOutput(output, file, debugMode);

    if (debugMode) {
      console.log(`Total changed lines detected: ${changedLines.length}`);
      console.log(`Changed line numbers: ${changedLines.slice(0, 10)}${changedLines.length > 10 ? '...' : ''}`);
    }

    // For new files, we should only count executable lines that exist in coverage data
    // This will be validated later against the actual coverage data
    return changedLines;
  } catch (error) {
    // Fallback: if git diff fails, assume all lines are new (for new files)
    if (debugMode) console.log(`Git diff failed for ${file}:`, error.message);
    return [];
  }
}

/**
 * Filter out files that don't need tests using SonarCloud exclusion patterns
 */
function shouldTest(file, sonarExclusions = [], debugMode = false) {
  // Always skip basic files that shouldn't be tested
  if (file.includes('__mocks__/')) {
    if (debugMode) console.log(`❌ Excluded (basic): ${file} - contains __mocks__/`);
    return false;
  }
  if (file.endsWith('.styles.ts')) {
    if (debugMode) console.log(`❌ Excluded (basic): ${file} - .styles.ts file`);
    return false;
  }
  if (file.endsWith('.types.ts')) {
    if (debugMode) console.log(`❌ Excluded (basic): ${file} - .types.ts file`);
    return false;
  }

  // Apply SonarCloud exclusion patterns
  if (sonarExclusions.length > 0 && matchesExclusionPattern(file, sonarExclusions)) {
    if (debugMode) console.log(`❌ Excluded (SonarCloud): ${file} - matches exclusion pattern`);
    return false;
  }

  if (debugMode) console.log(`✅ Included: ${file}`);
  return true;
}

/**
 * Generate test suggestions based on file type and context
 */
function generateTestSuggestions(file, uncoveredLines = []) {
  const suggestions = [];

  if (file.endsWith('.tsx')) {
    // React component suggestions
    suggestions.push('Test component rendering with default props');
    suggestions.push('Test user interactions (onPress, onChange events)');
    suggestions.push('Test conditional rendering based on props/state');
    if (uncoveredLines.length > 0) {
      suggestions.push(`Test edge cases around lines ${uncoveredLines.slice(0, 3).join(', ')}`);
    }
  } else if (file.includes('hooks/')) {
    // React hooks suggestions
    suggestions.push('Test hook return values with different inputs');
    suggestions.push('Test hook side effects and cleanup');
    suggestions.push('Test error handling and edge cases');
  } else if (file.includes('Controller')) {
    // Controller suggestions
    suggestions.push('Test public methods with various parameters');
    suggestions.push('Test error handling and validation logic');
    suggestions.push('Test state management and data flow');
  } else if (file.includes('utils/')) {
    // Utility function suggestions
    suggestions.push('Test utility functions with edge cases');
    suggestions.push('Test input validation and error conditions');
    suggestions.push('Test return values for boundary conditions');
  } else {
    // Generic suggestions
    suggestions.push('Test main functionality with valid inputs');
    suggestions.push('Test error handling with invalid inputs');
    suggestions.push('Test edge cases and boundary conditions');
  }

  return suggestions;
}

/**
 * Run tests with optimized two-phase approach: parse first run, then re-run only passing tests for coverage
 */
function runTestsWithFallback(testFiles) {
  const testArgs = testFiles.join(' ');
  const cmd = `yarn jest ${testArgs} --coverage --coverageReporters=lcov --passWithNoTests`;

  try {
    // Phase 1: Try running all tests together (fast path)
    console.log('🧪 Running all tests together...');
    execSync(cmd, { cwd: process.cwd(), stdio: 'pipe' });
    console.log('✓ All tests passed\n');
    return { allPassed: true, failedTests: [], passedTests: testFiles };
  } catch (error) {
    // Phase 2: Parse output to identify passing and failing tests
    console.log('⚠️  Some tests failed. Analyzing results...\n');

    const output = error.stderr?.toString() || error.stdout?.toString() || '';
    const lines = output.split('\n');

    const passedTests = [];
    const failedTests = [];
    const failureDetails = {};

    // Parse PASS/FAIL lines to identify which tests passed/failed
    lines.forEach(line => {
      const passMatch = line.match(/^PASS\s+(.+\.test\.(ts|tsx))/);
      const failMatch = line.match(/^FAIL\s+(.+\.test\.(ts|tsx))/);

      if (passMatch) {
        passedTests.push(passMatch[1]);
      } else if (failMatch) {
        const testFile = failMatch[1];
        failedTests.push(testFile);
        failureDetails[testFile] = [];
      }
    });

    // Extract failure details (● lines) for each failed test
    let currentFailedTest = null;
    lines.forEach(line => {
      const failMatch = line.match(/^FAIL\s+(.+\.test\.(ts|tsx))/);
      if (failMatch) {
        currentFailedTest = failMatch[1];
      } else if (currentFailedTest && line.trim().startsWith('●')) {
        if (failureDetails[currentFailedTest].length < 3) {
          failureDetails[currentFailedTest].push(line.trim());
        }
      }
    });

    console.log(`📊 Results: ${passedTests.length} passed, ${failedTests.length} failed`);

    // Build failed test objects
    const failedTestObjects = failedTests.map(file => ({
      file,
      error: failureDetails[file]?.length > 0
        ? failureDetails[file].join('\n')
        : 'Test failed (see full output for details)',
      command: `yarn jest ${file} --no-coverage`
    }));

    // Phase 3: Re-run only passing tests with coverage if any passed
    if (passedTests.length > 0) {
      console.log(`🔄 Re-running ${passedTests.length} passing tests to generate coverage...\n`);
      const passingTestsArgs = passedTests.join(' ');
      const coverageCmd = `yarn jest ${passingTestsArgs} --coverage --coverageReporters=lcov --silent --passWithNoTests`;

      try {
        execSync(coverageCmd, { cwd: process.cwd(), stdio: 'pipe' });
        console.log('✓ Coverage generated for passing tests\n');
      } catch (coverageError) {
        console.warn('⚠️  Failed to generate coverage for passing tests');
      }
    } else {
      console.log('⚠️  No passing tests to generate coverage\n');
    }

    return { allPassed: false, failedTests: failedTestObjects, passedTests };
  }
}

/**
 * Parse LCOV file and extract coverage data for specified files
 */
function parseLCOVData(sourceFiles) {
  if (sourceFiles.length === 0) return { results: [], failedTests: [] };

  try {
    console.log('🧪 Running coverage analysis on test files...');

    // Get test files for the source files
    const testFiles = sourceFiles
      .map(file => file.replace(/\.(ts|tsx)$/, '.test.$1'))
      .filter(testFile => fs.existsSync(testFile));

    if (testFiles.length === 0) {
      console.log('No test files found to analyze');
      return { results: [], failedTests: [] };
    }

    // Run tests with two-phase approach
    const testResult = runTestsWithFallback(testFiles);

    // Read LCOV report
    const lcovPath = path.join(process.cwd(), 'tests', 'coverage', 'lcov.info');
    if (!fs.existsSync(lcovPath)) {
      console.log('No LCOV report generated');
      return { results: [], failedTests: testResult.failedTests };
    }

    const lcovData = fs.readFileSync(lcovPath, 'utf8');

    // Parse LCOV data
    const results = [];
    const records = lcovData.split('end_of_record');

    records.forEach(record => {
      const lines = record.trim().split('\n');
      if (lines.length === 0) return;

      let filePath = null;
      let totalLines = 0;
      let coveredLines = 0;
      const lineData = {};

      lines.forEach(line => {
        if (line.startsWith('SF:')) {
          filePath = line.substring(3);
        } else if (line.startsWith('LF:')) {
          totalLines = parseInt(line.substring(3));
        } else if (line.startsWith('LH:')) {
          coveredLines = parseInt(line.substring(3));
        } else if (line.startsWith('DA:')) {
          const parts = line.substring(3).split(',');
          const lineNum = parseInt(parts[0]);
          const hits = parseInt(parts[1]);
          lineData[lineNum] = hits;
        }
      });

      if (!filePath) return;

      const relativePath = path.relative(process.cwd(), filePath);
      if (sourceFiles.includes(relativePath)) {
        // Calculate overall coverage percentage
        const linesPct = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;

        // Get changed lines for this file
        const changedLines = getChangedLines(relativePath, false);

        // Calculate coverage on new/changed lines using LCOV data
        let newLinesCovered = 0;
        const executableChangedLines = [];

        changedLines.forEach(lineNum => {
          // Check if this line exists in LCOV data (making it executable)
          if (Object.hasOwn(lineData, lineNum)) {
            executableChangedLines.push(lineNum);

            // Check if this line is covered (hits > 0)
            if (lineData[lineNum] > 0) {
              newLinesCovered++;
            }
          }
        });

        const newLinesTotal = executableChangedLines.length;
        const newLinesPct = newLinesTotal > 0 ? Math.round((newLinesCovered / newLinesTotal) * 100) : 0;

        results.push({
          file: relativePath,
          testFile: relativePath.replace(/\.(ts|tsx)$/, '.test.$1'),
          coverage: {
            lines: linesPct,
            coveredLines,
            totalLines,
            newLines: newLinesPct,
            newLinesCovered,
            newLinesTotal,
            changedLineNumbers: changedLines,
            executableChangedLines,
            totalChangedLines: changedLines.length,
            lcovLineData: lineData
          }
        });
      }
    });

    return { results, failedTests: testResult.failedTests };
  } catch (error) {
    console.log('Coverage analysis failed:', error.message);
    return { results: [], failedTests: [] };
  }
}

/**
 * Get and validate files to analyze
 */
function getFilesToAnalyze(specificFiles, sonarExclusions) {
  if (specificFiles && specificFiles.length > 0) {
    // Use specified files, but validate they exist and apply exclusions
    const validFiles = specificFiles.filter(file => {
      const exists = fs.existsSync(file);
      if (!exists) {
        console.warn(`⚠️  File not found: ${file}`);
      }
      return exists;
    });

    const changedFiles = validFiles.filter(file => shouldTest(file, sonarExclusions));
    const excludedCount = validFiles.length - changedFiles.length;

    if (changedFiles.length === 0) {
      console.log('No valid files to analyze after applying exclusions');
      return null;
    }

    console.log(`Analyzing ${changedFiles.length} specified files (${excludedCount} excluded)`);
    return changedFiles;
  }

  // Get changed files from PR (existing behavior)
  const allChangedFiles = getPRChangedFiles();
  console.log(`Found ${allChangedFiles.length} changed files`);

  if (allChangedFiles.length === 0) {
    console.log('No files to analyze');
    return null;
  }

  // Filter out files using SonarCloud exclusions
  const changedFiles = allChangedFiles.filter(file => shouldTest(file, sonarExclusions));
  const excludedCount = allChangedFiles.length - changedFiles.length;
  console.log(`Analyzing ${changedFiles.length} relevant files (${excludedCount} excluded by SonarCloud patterns)`);
  return changedFiles;
}

/**
 * Categorize files into those with and without tests
 */
function categorizeFilesByTestStatus(changedFiles) {
  const needsTests = [];
  const hasTests = [];

  changedFiles.forEach(file => {
    if (hasTestFile(file)) {
      hasTests.push(file);
    } else {
      needsTests.push(file);
    }
  });

  return { needsTests, hasTests };
}

/**
 * Calculate coverage statistics
 */
function calculateCoverageStats(coverageResults) {
  const belowTarget = coverageResults.filter(r => r.coverage.lines < 80);
  const aboveTarget = coverageResults.filter(r => r.coverage.lines >= 80);

  const totalCoveredLines = coverageResults.reduce((sum, r) => sum + r.coverage.coveredLines, 0);
  const totalLines = coverageResults.reduce((sum, r) => sum + r.coverage.totalLines, 0);
  const overallCoverage = totalLines > 0 ? Math.round((totalCoveredLines / totalLines) * 100) : 0;

  const totalNewLinesCovered = coverageResults.reduce((sum, r) => sum + r.coverage.newLinesCovered, 0);
  const totalNewLines = coverageResults.reduce((sum, r) => sum + r.coverage.newLinesTotal, 0);
  const newCodeCoverage = totalNewLines > 0 ? Math.round((totalNewLinesCovered / totalNewLines) * 100) : 0;

  return {
    belowTarget,
    aboveTarget,
    overallCoverage,
    newCodeCoverage,
    totalCoveredLines,
    totalLines,
    totalNewLinesCovered,
    totalNewLines
  };
}

/**
 * Generate actionable recommendations for improving coverage
 */
function generateActionableRecommendations(coverageResults, belowTarget, needsTests) {
  return {
    filesNeedingImprovement: belowTarget.concat(
      coverageResults.filter(r => r.coverage.newLinesTotal > 0 && r.coverage.newLines < 80)
    ).map(result => {
      const uncoveredNewLines = result.coverage.executableChangedLines.filter(lineNum =>
        !result.coverage.lcovLineData[lineNum] || result.coverage.lcovLineData[lineNum] === 0
      );

      return {
        file: result.file,
        currentCoverage: result.coverage.lines || result.coverage.statements,
        newCodeCoverage: result.coverage.newLines,
        uncoveredNewLines,
        totalUncoveredLines: result.coverage.newLinesTotal - result.coverage.newLinesCovered,
        suggestedTestCases: generateTestSuggestions(result.file, uncoveredNewLines)
      };
    }),
    priorityFiles: needsTests.slice(0, 5).map(file => ({
      file,
      reason: 'No tests exist - create comprehensive test suite',
      suggestedTestCases: generateTestSuggestions(file, [])
    }))
  };
}

/**
 * Save coverage reports to disk
 */
function saveReports(report, currentBranch) {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save branch-specific JSON report
  const reportFilename = `coverage-report-${currentBranch}.json`;
  const reportPath = path.join(reportsDir, reportFilename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Save branch-specific LCOV report
  const lcovFilename = `coverage-lcov-${currentBranch}.info`;
  const lcovPath = path.join(reportsDir, lcovFilename);
  const sourceLcovPath = path.join(process.cwd(), 'tests', 'coverage', 'lcov.info');

  let lcovSaved = false;
  if (fs.existsSync(sourceLcovPath)) {
    try {
      fs.copyFileSync(sourceLcovPath, lcovPath);
      lcovSaved = true;
    } catch (error) {
      console.warn('⚠️  Failed to copy LCOV file:', error.message);
    }
  }

  // Add LCOV info to report
  report.lcovReport = {
    saved: lcovSaved,
    path: lcovSaved ? lcovPath : null,
    filename: lcovSaved ? lcovFilename : null
  };

  return { reportPath, lcovPath, lcovSaved };
}

/**
 * Print coverage analysis summary to console
 */
function printCoverageSummary(stats, coverageResults, needsTests, failedTests) {
  const { overallCoverage, totalCoveredLines, totalLines, aboveTarget, newCodeCoverage, totalNewLinesCovered, totalNewLines } = stats;

  console.log('\n📊 Coverage Analysis');
  console.log(`Overall Files: ${overallCoverage}% (${totalCoveredLines}/${totalLines} lines) - ${aboveTarget.length}/${coverageResults.length} files ≥80%`);
  console.log(`New Code Only: ${newCodeCoverage}% (${totalNewLinesCovered}/${totalNewLines} changed lines)\n`);

  // Show coverage for all files with tests
  if (coverageResults.length > 0) {
    console.log('Files Coverage:');
    coverageResults.forEach(result => {
      const coverage = result.coverage.lines;
      const coveredCount = result.coverage.coveredLines;
      const totalCount = result.coverage.totalLines;
      const icon = coverage >= 80 ? '✅' : '🔴';

      const newCov = result.coverage.newLines;
      const newCovDisplay = result.coverage.newLinesTotal > 0
        ? `New: ${newCov}% (${result.coverage.newLinesCovered}/${result.coverage.newLinesTotal})`
        : 'New: No changes';

      const debugInfo = result.coverage.totalChangedLines !== result.coverage.newLinesTotal
        ? ` [${result.coverage.totalChangedLines} total changed, ${result.coverage.newLinesTotal} executable]`
        : '';

      let status;
      if (coverage >= 80) {
        status = '';
      } else if (coverage === 0) {
        status = ' - NO TESTS';
      } else {
        status = ' - NEEDS WORK';
      }

      console.log(`${icon} ${path.basename(result.file)}: ${coverage}% overall (${coveredCount}/${totalCount}) | ${newCovDisplay}${debugInfo}${status}`);
    });
  }

  // Show files needing new tests
  if (needsTests.length > 0) {
    console.log('\n⚠️  Files needing NEW tests:');
    needsTests.slice(0, 10).forEach(file => {
      console.log(`🔴 ${path.basename(file)}: 0% (0/? lines) - NO TESTS`);
    });
  }

  // Show failed tests
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests (${failedTests.length}):`);
    failedTests.forEach(({ file, error }) => {
      console.log(`\n🔴 ${path.basename(file)}`);
      const firstErrorLine = error.split('\n')[0];
      const truncated = firstErrorLine.length > 100 ? firstErrorLine.substring(0, 100) + '...' : firstErrorLine;
      console.log(`   ${truncated}`);
    });

    console.log('\n📝 To re-run failed tests:');
    const failedFilesArgs = failedTests.map(t => t.file).join(' ');
    console.log(`   yarn jest ${failedFilesArgs} --no-coverage\n`);
  }
}

/**
 * Coverage analysis with actual Jest coverage
 */
async function analyzeCoverage(specificFiles = null) {
  if (specificFiles && specificFiles.length > 0) {
    console.log(`🔍 Analyzing coverage for specified files: ${specificFiles.join(', ')}`);
  } else {
    console.log('🔍 Analyzing coverage for PR changes...');
  }

  // Parse SonarCloud exclusion patterns
  const sonarExclusions = parseSonarCloudExclusions();
  if (sonarExclusions.length > 0) {
    console.log(`📋 Loaded ${sonarExclusions.length} SonarCloud exclusion patterns`);
  }

  // Get files to analyze
  const changedFiles = getFilesToAnalyze(specificFiles, sonarExclusions);
  if (!changedFiles) return;

  // Categorize files
  const { needsTests, hasTests } = categorizeFilesByTestStatus(changedFiles);

  // Get coverage data
  const { results: coverageResults, failedTests } = parseLCOVData(hasTests);

  // Calculate statistics
  const stats = calculateCoverageStats(coverageResults);

  // Get current branch for reporting
  const currentBranch = getCurrentBranchName();

  // Generate recommendations
  const actionableRecommendations = generateActionableRecommendations(coverageResults, stats.belowTarget, needsTests);

  // Generate report structure
  const report = {
    branch: currentBranch,
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: changedFiles.length,
      needsTests: needsTests.length,
      hasTests: hasTests.length,
      belowTarget: stats.belowTarget.length,
      aboveTarget: stats.aboveTarget.length,
      overallCoverage: `${stats.overallCoverage}%`,
      newCodeCoverage: `${stats.newCodeCoverage}%`,
      totalCoveredLines: stats.totalCoveredLines,
      totalLines: stats.totalLines,
      totalNewLinesCovered: stats.totalNewLinesCovered,
      totalNewLines: stats.totalNewLines,
      coverageTarget: '80%',
      failedTests: failedTests.length,
      passedTests: hasTests.length - failedTests.length
    },
    failedTests,
    actionableRecommendations,
    filesNeedingTests: needsTests.map(file => ({
      file,
      testFile: file.replace(/\.(ts|tsx)$/, '.test.$1'),
      priority: file.includes('/Perps/') || file.includes('/Rewards/') ? 'HIGH' : 'MEDIUM'
    })),
    filesWithCoverage: coverageResults,
    filesBelowTarget: stats.belowTarget,
    filesAboveTarget: stats.aboveTarget
  };

  // Save reports and get paths
  const { reportPath, lcovPath, lcovSaved } = saveReports(report, currentBranch);

  // Print summary
  printCoverageSummary(stats, coverageResults, needsTests, failedTests);

  console.log(`\nReports saved to:`);
  console.log(`  📄 JSON: ${reportPath}`);
  if (lcovSaved) {
    console.log(`  📊 LCOV: ${lcovPath}`);
    console.log(`     (Use LCOV file for LLM-based test generation and coverage analysis)`);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const specificFiles = [];
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
    } else if (arg === '--files' || arg === '-f') {
      // Collect all following arguments until next flag as files
      const startIndex = i + 1;
      let endIndex = startIndex;
      while (endIndex < args.length && !args[endIndex].startsWith('-')) {
        endIndex++;
      }
      // Add all files found
      for (let j = startIndex; j < endIndex; j++) {
        specificFiles.push(args[j]);
      }
      // Skip processed arguments
      i = endIndex - 1;
    } else if (!arg.startsWith('-')) {
      // Assume it's a file if no flag specified
      specificFiles.push(arg);
    } else {
      console.warn(`Unknown argument: ${arg}`);
      showHelp = true;
    }
  }

  return { specificFiles, showHelp };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Coverage Analysis Tool

Usage:
  node scripts/coverage-analysis.js [options] [files...]

Options:
  --files, -f <files...>    Analyze specific files instead of PR changes
  --help, -h               Show this help message

Examples:
  # Analyze all PR changes (default behavior)
  node scripts/coverage-analysis.js

  # Analyze a specific file
  node scripts/coverage-analysis.js app/components/UI/Perps/components/FoxIcon/FoxIcon.tsx

  # Analyze multiple specific files
  node scripts/coverage-analysis.js --files FoxIcon.tsx PerpsController.ts

  # Using relative paths
  node scripts/coverage-analysis.js app/components/UI/Perps/hooks/usePerpsOrderFees.ts

Notes:
  - File paths can be relative to project root
  - Only .ts and .tsx files with corresponding .test. files will be analyzed
  - For specific files, git diff analysis will still show changes vs main branch
  - Generates both JSON report (programmatic) and LCOV file (LLM integration)
  - LCOV files can be used by Claude commands for targeted test generation
`);
}

if (require.main === module) {
  const { specificFiles, showHelp: shouldShowHelp } = parseArgs();

  if (shouldShowHelp) {
    showHelp();
    process.exit(0);
  }

  const filesToAnalyze = specificFiles.length > 0 ? specificFiles : null;
  analyzeCoverage(filesToAnalyze).catch(console.error);
}

module.exports = { analyzeCoverage };
