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
    // Sanitize branch name for filename (replace problematic chars)
    return branch.replace(/[/\\:*?"<>|]/g, '-');
  } catch (error) {
    console.log('Could not detect branch name, using "unknown"');
    return 'unknown';
  }
}

/**
 * Get changed line numbers for a specific file using git diff
 */
function getChangedLines(file, debugMode = false) {
  try {
    // Get unified diff for the specific file against base branch (main)
    // This ensures we capture all changes in the PR, not just the last commit
    const cmd = `git diff --unified=0 main...HEAD -- "${file}"`;
    const output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });

    if (debugMode) {
      console.log(`\n--- Git diff for ${file} ---`);
      console.log(output);
      console.log('--- End git diff ---\n');
    }

    const changedLines = [];
    const lines = output.split('\n');
    let isNewFile = false;

    for (const line of lines) {
      // Check if this is a new file
      if (line.includes('new file mode')) {
        isNewFile = true;
        if (debugMode) console.log(`Detected new file: ${file}`);
      }

      // Parse lines like "@@ -45,3 +45,8 @@" to extract added line ranges
      const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const startLine = parseInt(match[1]);
        const lineCount = match[2] ? parseInt(match[2]) : 1;

        if (debugMode) {
          console.log(`Found hunk: +${startLine},${lineCount} (lines ${startLine} to ${startLine + lineCount - 1})`);
        }

        // Add all lines in this range
        for (let i = startLine; i < startLine + lineCount; i++) {
          changedLines.push(i);
        }
      }
    }

    if (debugMode) {
      console.log(`Total changed lines detected: ${changedLines.length}`);
      console.log(`Changed line numbers: ${changedLines.slice(0, 10)}${changedLines.length > 10 ? '...' : ''}`);
    }

    // For new files, we should only count executable lines that exist in coverage data
    // This will be validated later against the actual coverage data
    return changedLines.sort((a, b) => a - b);
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
 * Parse LCOV file and extract coverage data for specified files
 */
function parseLCOVData(sourceFiles) {
  if (sourceFiles.length === 0) return [];

  try {
    console.log('🧪 Running coverage analysis on test files...');

    // Get test files for the source files
    const testFiles = sourceFiles
      .map(file => file.replace(/\.(ts|tsx)$/, '.test.$1'))
      .filter(testFile => fs.existsSync(testFile));

    if (testFiles.length === 0) {
      console.log('No test files found to analyze');
      return [];
    }

    // Run Jest on test files with coverage (generate LCOV)
    const testArgs = testFiles.join(' ');
    const cmd = `npx jest ${testArgs} --coverage --coverageReporters=lcov --silent --passWithNoTests`;

    execSync(cmd, { cwd: process.cwd(), stdio: 'pipe' });

    // Read LCOV report
    const lcovPath = path.join(process.cwd(), 'tests', 'coverage', 'lcov.info');
    if (!fs.existsSync(lcovPath)) {
      console.log('No LCOV report generated');
      return [];
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
          if (Object.prototype.hasOwnProperty.call(lineData, lineNum)) {
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

    return results;
  } catch (error) {
    console.log('Coverage analysis failed:', error.message);
    return [];
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

  let changedFiles;

  if (specificFiles && specificFiles.length > 0) {
    // Use specified files, but validate they exist and apply exclusions
    const validFiles = specificFiles.filter(file => {
      const exists = fs.existsSync(file);
      if (!exists) {
        console.warn(`⚠️  File not found: ${file}`);
      }
      return exists;
    });

    changedFiles = validFiles.filter(file => shouldTest(file, sonarExclusions));
    const excludedCount = validFiles.length - changedFiles.length;

    if (changedFiles.length === 0) {
      console.log('No valid files to analyze after applying exclusions');
      return;
    }

    console.log(`Analyzing ${changedFiles.length} specified files (${excludedCount} excluded)`);
  } else {
    // Get changed files from PR (existing behavior)
    const allChangedFiles = getPRChangedFiles();
    console.log(`Found ${allChangedFiles.length} changed files`);

    if (allChangedFiles.length === 0) {
      console.log('No files to analyze');
      return;
    }

    // Filter out files using SonarCloud exclusions
    changedFiles = allChangedFiles.filter(file => shouldTest(file, sonarExclusions));
    const excludedCount = allChangedFiles.length - changedFiles.length;
    console.log(`Analyzing ${changedFiles.length} relevant files (${excludedCount} excluded by SonarCloud patterns)`);
  }

  // Split into files with/without tests
  const needsTests = [];
  const hasTests = [];

  changedFiles.forEach(file => {
    if (hasTestFile(file)) {
      hasTests.push(file);
    } else {
      needsTests.push(file);
    }
  });

  // Get actual coverage for files with tests using LCOV
  const coverageResults = parseLCOVData(hasTests);

  // Analyze coverage results using LCOV line coverage
  const belowTarget = coverageResults.filter(r => r.coverage.lines < 80);
  const aboveTarget = coverageResults.filter(r => r.coverage.lines >= 80);

  // Calculate overall coverage stats
  const totalCoveredLines = coverageResults.reduce((sum, r) => sum + r.coverage.coveredLines, 0);
  const totalLines = coverageResults.reduce((sum, r) => sum + r.coverage.totalLines, 0);
  const overallCoverage = totalLines > 0 ? Math.round((totalCoveredLines / totalLines) * 100) : 0;

  // Calculate new lines coverage stats
  const totalNewLinesCovered = coverageResults.reduce((sum, r) => sum + r.coverage.newLinesCovered, 0);
  const totalNewLines = coverageResults.reduce((sum, r) => sum + r.coverage.newLinesTotal, 0);
  const newCodeCoverage = totalNewLines > 0 ? Math.round((totalNewLinesCovered / totalNewLines) * 100) : 0;

  // Get current branch for reporting
  const currentBranch = getCurrentBranchName();

  // Generate LLM-friendly actionable recommendations
  const actionableRecommendations = {
    filesNeedingImprovement: belowTarget.concat(
      coverageResults.filter(r => r.coverage.newLinesTotal > 0 && r.coverage.newLines < 80)
    ).map(result => {
      const uncoveredNewLines = result.coverage.changedLineNumbers.filter(() =>
        // This is a simplified check - in a real implementation you'd check the actual coverage data
        result.coverage.newLinesCovered === 0 || result.coverage.newLines < 80
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

  // Generate report
  const report = {
    branch: currentBranch,
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: changedFiles.length,
      needsTests: needsTests.length,
      hasTests: hasTests.length,
      belowTarget: belowTarget.length,
      aboveTarget: aboveTarget.length,
      overallCoverage: `${overallCoverage}%`,
      newCodeCoverage: `${newCodeCoverage}%`,
      totalCoveredLines,
      totalLines,
      totalNewLinesCovered,
      totalNewLines,
      coverageTarget: '80%'
    },
    actionableRecommendations,
    filesNeedingTests: needsTests.map(file => ({
      file,
      testFile: file.replace(/\.(ts|tsx)$/, '.test.$1'),
      priority: file.includes('/Perps/') || file.includes('/Rewards/') ? 'HIGH' : 'MEDIUM'
    })),
    filesWithCoverage: coverageResults,
    filesBelowTarget: belowTarget,
    filesAboveTarget: aboveTarget
  };

  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save branch-specific JSON report
  const reportFilename = `coverage-report-${currentBranch}.json`;
  const reportPath = path.join(reportsDir, reportFilename);

  // Save branch-specific LCOV report
  const lcovFilename = `coverage-lcov-${currentBranch}.info`;
  const lcovPath = path.join(reportsDir, lcovFilename);
  const sourceLcovPath = path.join(process.cwd(), 'tests', 'coverage', 'lcov.info');

  // Copy LCOV file if it exists
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

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print SonarCloud-style coverage summary
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

      // Show additional debug info for validation
      const debugInfo = result.coverage.totalChangedLines !== result.coverage.newLinesTotal
        ? ` [${result.coverage.totalChangedLines} total changed, ${result.coverage.newLinesTotal} executable]`
        : '';

      const status = coverage >= 80 ? '' : coverage === 0 ? ' - NO TESTS' : ' - NEEDS WORK';

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
      // Next arguments until next flag are files
      i++;
      while (i < args.length && !args[i].startsWith('-')) {
        specificFiles.push(args[i]);
        i++;
      }
      i--; // Back up one since the loop will increment
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
