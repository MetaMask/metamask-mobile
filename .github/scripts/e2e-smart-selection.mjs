#!/usr/bin/env node
import { execSync } from 'child_process';
import { appendFileSync, writeFileSync, readFileSync } from 'fs';

/**
 * Runs the Smart E2E selection script,
 * Generates the Github outputs, Step Summary and PR Comment Body
*/

const env = {
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
  BASE_REF: process.env.BASE_REF || 'main',
};

const PR_COMMENT_FILE = 'pr_comment.md';

function setGithubOutputs(key, value) {
  if (!env.GITHUB_OUTPUT) return;

  if (typeof value === 'string' && value.includes('\n')) {
    // Handle multi-line content with EOF delimiter
    appendFileSync(env.GITHUB_OUTPUT, `${key}<<EOF\n${value}\nEOF\n`);
  } else {
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function appendGithubSummary(content) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(env.GITHUB_STEP_SUMMARY, content + '\n');
}

function generateAnalysisSummary(analysis) {
  const { tagDisplay, riskLevel, confidence, reasoning, performanceTests } = analysis;

  let summary = '';
  summary += `- **Selected E2E tags**: ${tagDisplay}\n`;
  summary += `- **Selected Performance tags**: ${performanceTests.tagDisplay}\n`;
  summary += `- **Risk Level**: ${riskLevel}\n`;
  summary += `- **AI Confidence**: ${confidence}%\n`;

  // Add AI reasoning in expandable section
  summary += '\n<details>\n';
  summary += '<summary>click to see 🤖 AI reasoning details</summary>\n\n';
  summary += `**E2E Test Selection:**\n${reasoning}\n\n`;
  summary += `**Performance Test Selection:**\n${performanceTests.reasoning}\n`;
  summary += '\n</details>\n';

  return summary;
}

function generatePRComment(summaryContent) {
  if (!env.PR_NUMBER) {
    console.log('⏭️ Skipping PR comment file generation - no PR number');
    return;
  }

  // Write just the body content - action will add title, footer, and marker
  writeFileSync(PR_COMMENT_FILE, summaryContent, 'utf8');
  console.log(`✅ PR comment body written to ${PR_COMMENT_FILE}`);
}

function setGitHubOutputs(analysis) {
  const { tags, confidence, performanceTests } = analysis;
  setGithubOutputs('ai_e2e_test_tags', tags);
  setGithubOutputs('ai_confidence', confidence);
  // Performance test tags (empty array means no performance tests needed)
  setGithubOutputs('ai_performance_test_tags', JSON.stringify(performanceTests.selectedTags));
}

async function main() {
  try {
    if (!env.PR_NUMBER) {
      console.log('⏭️ Skipping AI analysis - only runs on PRs');
      return;
    }

    // Build command - uses GitHub API (PR number) for changed files list; -b ensures
    // file diffs are computed against the correct base branch (main or release/*)
    const baseBranch = `origin/${env.BASE_REF}`;
    const baseCmd = `node -r esbuild-register tests/tools/e2e-ai-analyzer --mode select-tags --pr ${env.PR_NUMBER} -b ${baseBranch}`;
    console.log(`🎯 Analyzing PR #${env.PR_NUMBER} against base branch: ${baseBranch}`);

    try {
      execSync(baseCmd, {
        encoding: 'utf8',
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('❌ AI analyzer failed');
      process.exit(1);
    }

    // Read JSON output from file (written by analyzer)
    let parsedResult;
    try {
      const resultFile = readFileSync('e2e-ai-analysis.json', 'utf8');
      parsedResult = JSON.parse(resultFile);
    } catch (error) {
      console.error('❌ Failed to read e2e-ai-analysis.json');
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }

    // Parse results for GitHub outputs
    const selectedTags = parsedResult.selectedTags || [];
    const performanceTestsRaw = parsedResult.performanceTests || {};
    const perfSelectedTags = Array.isArray(performanceTestsRaw.selectedTags) ? performanceTestsRaw.selectedTags : [];
    const performanceTests = {
      selectedTags: perfSelectedTags,
      tagDisplay: perfSelectedTags.length > 0 ? perfSelectedTags.join(', ') : 'None (no tests recommended)',
      reasoning: performanceTestsRaw.reasoning || 'No performance impact detected',
    };
    const analysis = {
      tags: JSON.stringify(selectedTags),  // JSON array format: [] or ["SmokeCore", "SmokeAccounts"]
      tagDisplay: selectedTags.length > 0 ? selectedTags.join(', ') : 'None (no tests recommended)',
      riskLevel: parsedResult.riskLevel || '',
      confidence: parsedResult.confidence || '',
      reasoning: parsedResult.reasoning || '',
      performanceTests,
    };

    setGitHubOutputs(analysis);
    const summaryContent = generateAnalysisSummary(analysis);
    appendGithubSummary('## 🔍 Smart E2E Test Selection\n' + summaryContent);
    generatePRComment(summaryContent);

  } catch (error) {
    console.error('❌ Error running AI analysis:', error.message || error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
