#!/usr/bin/env node
import { execSync } from 'child_process';
import { appendFileSync } from 'fs';

/**
 * AI E2E Analysis Script
 * This script handles the complex logic for running AI analysis and processing results
 * Usage: node ai-e2e-analysis.mjs <event_name> [base_branch] [include_main_changes] [changed_files]
 */

const args = process.argv.slice(2);
const EVENT_NAME = args[0];
const BASE_BRANCH = args[1] || '';
const INCLUDE_MAIN_CHANGES = args[2] || 'false';
const CHANGED_FILES = args[3] || process.env.CHANGED_FILES || '';

const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;

/**
 * Execute shell command and return output
 */
function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    }).toString().trim();
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return options.defaultValue || 'ERROR';
  }
}

/**
 * Write output to GitHub Actions output file
 */
function setOutput(key, value) {
  if (!GITHUB_OUTPUT) return;

  if (typeof value === 'string' && value.includes('\n')) {
    // Handle multi-line content with EOF delimiter
    appendFileSync(GITHUB_OUTPUT, `${key}<<EOF\n${value}\nEOF\n`);
  } else {
    appendFileSync(GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

/**
 * Write to GitHub Actions step summary
 */
function appendStepSummary(content) {
  if (!GITHUB_STEP_SUMMARY) return;
  appendFileSync(GITHUB_STEP_SUMMARY, content + '\n');
}

console.log('🤖 Running AI analysis...');

// Build command with dynamic arguments based on trigger type
let baseCmd = 'node -r esbuild-register scripts/e2e/ai-e2e-tags-selector.ts --output json';

// Check if changed files were provided
if (CHANGED_FILES && CHANGED_FILES.trim()) {
  console.log('📋 Using pre-computed changed files from needs-e2e-build');
  // Pass changed files directly to the AI selector
  baseCmd += ` --changed-files '${CHANGED_FILES}'`;
} else {
  console.log('📋 Computing changed files via git');

  // Add base branch if specified (manual trigger)
  if (BASE_BRANCH && BASE_BRANCH !== 'origin/main') {
    baseCmd += ` --base-branch '${BASE_BRANCH}'`;
  }

  // Add include-main-changes flag
  if (EVENT_NAME === 'workflow_dispatch') {
    if (INCLUDE_MAIN_CHANGES === 'true') {
      baseCmd += ' --include-main-changes';
    }
  } else {
    // For PR triggers, always include main changes for comprehensive analysis
    baseCmd += ' --include-main-changes';
  }

  // Debug git state
  console.log('🔍 Git debug info:');
  const filesWithMain = execCommand('git diff --name-only origin/main..HEAD 2>/dev/null | wc -l', {
    silent: true,
    ignoreError: true,
    defaultValue: 'ERROR'
  });
  const filesWithoutMain = execCommand('git diff --name-only origin/main...HEAD 2>/dev/null | wc -l', {
    silent: true,
    ignoreError: true,
    defaultValue: 'ERROR'
  });
  console.log(`- Files with include-main: ${filesWithMain}`);
  console.log(`- Files without include-main: ${filesWithoutMain}`);
}

console.log(`🤖 Running AI analysis with command: ${baseCmd}`);
console.log(`📋 Event name: ${EVENT_NAME}`);

// Execute the AI analysis command
const result = execCommand(baseCmd, { silent: true });

// Validate JSON output
let parsedResult;
try {
  parsedResult = JSON.parse(result);
} catch (error) {
  console.log('❌ Invalid JSON output from AI analysis');
  console.log(`Raw output: ${result}`);
  process.exit(1);
}

console.log('📊 AI analysis completed successfully (builds running in parallel)');

// Parse results
const tags = parsedResult.selectedTags?.join('|') || '';  // Use pipe separator for grep regex
const tagCount = parsedResult.selectedTags?.length || 0;
const riskLevel = parsedResult.riskLevel || '';
const tagDisplay = parsedResult.selectedTags?.join(', ') || '';  // Human-readable format
const reasoning = parsedResult.reasoning || 'AI analysis completed';
const confidence = parsedResult.confidence || 75;

console.log(`✅ Selected tags: ${tagDisplay}`);
console.log(`📈 Risk level: ${riskLevel}`);
console.log(`🔢 Tag count: ${tagCount}`);

// Generate test matrix for GitHub Actions based on testFileBreakdown
let testMatrix = [];
if (tagCount > 0 && parsedResult.testFileBreakdown) {
  testMatrix = parsedResult.testFileBreakdown
    .filter(breakdown => breakdown.recommendedSplits > 0)
    .flatMap(breakdown => {
      const splits = Array.from({ length: breakdown.recommendedSplits }, (_, i) => i + 1);
      return splits.map(split => ({
        tag: breakdown.tag,
        fileCount: breakdown.fileCount,
        split: split,
        totalSplits: breakdown.recommendedSplits
      }));
    });
}

const testMatrixJson = JSON.stringify(testMatrix);
console.log(`🔢 Generated test matrix: ${testMatrixJson}`);

// Set outputs for GitHub Actions (only test_matrix is used by the action)
setOutput('test_matrix', testMatrixJson);

// Set additional outputs for internal script use (step summary, PR comments)
setOutput('tags', tags);
setOutput('tags_display', tagDisplay);
setOutput('risk_level', riskLevel);
setOutput('reasoning', reasoning);
setOutput('confidence', confidence);

// Handle multi-line breakdown content
if (parsedResult.testFileBreakdown) {
  const breakdown = parsedResult.testFileBreakdown
    .map(item => `  - ${item.tag}: ${item.fileCount} files → ${item.recommendedSplits} splits`)
    .join('\n');
  setOutput('breakdown', breakdown);
}

// Log summary
const matrixLength = testMatrix.length;
if (tagCount === 0) {
  console.log('ℹ️ No E2E tests recommended - AI determined changes are very low risk');
} else if (matrixLength > 0) {
  console.log(`✅ Generated test matrix with ${matrixLength} job(s)`);
} else {
  console.log('ℹ️ Selected tags have no test files');
}

// Create readable test plan with file breakdown
appendStepSummary('## 🔍 AI E2E Analysis Report');
if (tagCount === 0) {
  appendStepSummary('- **Selected Tags**: None (no tests recommended)');
  appendStepSummary(`- **Risk Level**: ${riskLevel}`);
  appendStepSummary(`- **AI Confidence**: ${confidence}%`);
  appendStepSummary('- **Matrix Jobs**: 0 (AI determined changes are very low risk)');
} else {
  appendStepSummary(`- **Selected Tags**: ${tagDisplay}`);
  appendStepSummary(`- **Risk Level**: ${riskLevel}`);
  appendStepSummary(`- **AI Confidence**: ${confidence}%`);
  appendStepSummary(`- **Matrix Jobs**: ${matrixLength} (dynamically generated based on test files)`);
}

// Add AI reasoning
appendStepSummary('');
appendStepSummary('### 🤖 AI Analysis Reasoning');
appendStepSummary(reasoning);

// Add test file breakdown if available
if (parsedResult.testFileBreakdown && parsedResult.testFileBreakdown.length > 0) {
  const breakdown = parsedResult.testFileBreakdown
    .map(item => `  - ${item.tag}: ${item.fileCount} files → ${item.recommendedSplits} splits`)
    .join('\n');

  if (breakdown) {
    appendStepSummary('');
    appendStepSummary('### 📊 Test File Breakdown');
    appendStepSummary(breakdown);
  }
}

console.log('✅ AI analysis script completed successfully');