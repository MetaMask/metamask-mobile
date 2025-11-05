#!/usr/bin/env node
import { execSync } from 'child_process';
import { appendFileSync, writeFileSync } from 'fs';

/**
 * Smart E2E selection script
 * Runs AI analysis to select appropriate E2E test tags based on code changes
 */

const env = {
  PR_COMMENT_FILE: process.env.PR_COMMENT_FILE || 'pr_comment.md',
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
};

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
  const { tagDisplay, tagCount, riskLevel, confidence, reasoning, testFileBreakdown } = analysis;

  let summary = '';

  // Add summary details
  if (tagCount === 0) {
    summary += '- **Selected E2E tags**: None (no tests recommended)\n';
  } else {
    summary += `- **Selected E2E tags**: ${tagDisplay}\n`;
  }
  summary += `- **Risk Level**: ${riskLevel}\n`;
  summary += `- **AI Confidence**: ${confidence}%\n`;

  // Add AI reasoning in expandable section
  summary += '\n<details>\n';
  summary += '<summary>click to see 🤖 AI reasoning details</summary>\n\n';
  summary += `${reasoning}\n`;

  // Add test file breakdown if available
  if (testFileBreakdown && testFileBreakdown.length > 0) {
    const breakdown = testFileBreakdown
      .map(item => `  - ${item.tag}: ${item.fileCount} files → ${item.recommendedSplits} splits`)
      .join('\n');

    if (breakdown) {
      summary += '\n### 📊 Test File Breakdown\n';
      summary += `${breakdown}\n`;
    }
  }

  summary += '\n</details>\n';

  return summary;
}

function generatePRComment(summaryContent) {
  if (!env.PR_NUMBER) {
    return;
  }

  console.log(`📝 Generating PR comment body file: ${env.PR_COMMENT_FILE}`);

  // Write just the body content - action will add title, footer, and marker
  writeFileSync(env.PR_COMMENT_FILE, summaryContent, 'utf8');
  console.log(`✅ PR comment body written to ${env.PR_COMMENT_FILE}`);

  // Set output for the action to know the file location
  setGithubOutputs('pr_comment_file', env.PR_COMMENT_FILE);
}

function setGitHubOutputs(analysis) {
  const { tags, tagDisplay, riskLevel, reasoning, confidence, testFileBreakdown } = analysis;

  // Set outputs for GitHub Actions
  setGithubOutputs('ai_e2e_test_tags', tags);
  setGithubOutputs('ai_tags_display', tagDisplay);
  setGithubOutputs('ai_risk_level', riskLevel);
  setGithubOutputs('ai_reasoning', reasoning);
  setGithubOutputs('ai_confidence', confidence);

  // Handle multi-line breakdown content
  if (testFileBreakdown) {
    const breakdown = testFileBreakdown
      .map(item => `  - ${item.tag}: ${item.fileCount} files → ${item.recommendedSplits} splits`)
      .join('\n');
    setGithubOutputs('breakdown', breakdown);
  }
}

async function main() {
  try {
    console.log('🤖 Starting AI analysis...');

    if (!env.PR_NUMBER) {
      console.log('⏭️ Skipping AI analysis - only runs on PRs');
      return;
    }

    // Build command - use --pr flag for better analysis (agent will fetch diffs from GitHub)
    const baseCmd = `node -r esbuild-register e2e/scripts/ai-e2e-tags-selector.ts --output json --pr ${env.PR_NUMBER}`;
    const result = execCommand(baseCmd, { silent: true });

    // Validate JSON output
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (error) {
      console.error('❌ Invalid JSON output from AI analysis');
      console.error(`Raw output: ${result}`);
      process.exit(1);
    }

    console.log('📊 AI analysis completed.');

    // Parse results
    const analysis = {
      tags: parsedResult.selectedTags?.join('|') || '',
      tagCount: parsedResult.selectedTags?.length || 0,
      riskLevel: parsedResult.riskLevel || '',
      tagDisplay: parsedResult.selectedTags?.join(', ') || '',
      reasoning: parsedResult.reasoning || 'AI analysis completed',
      confidence: parsedResult.confidence || 75,
      testFileBreakdown: parsedResult.testFileBreakdown || [],
    };

    console.log(`✅ Selected E2E test tags: ${analysis.tagDisplay}`);
    console.log(`📈 Risk level: ${analysis.riskLevel}`);
    console.log(`🔢 Tag count: ${analysis.tagCount}`);

    // Set GitHub Actions outputs
    setGitHubOutputs(analysis);

    // Generate analysis summary (body content only)
    const summaryContent = generateAnalysisSummary(analysis);

    // Write to step summary (with title for step summary)
    appendGithubSummary('## 🔍 Smart E2E Test Selection\n' + summaryContent);

    // Generate PR comment file if PR number is available
    generatePRComment(summaryContent);

    console.log('✅ AI analysis script completed successfully');

  } catch (error) {
    console.error('❌ Error running AI analysis:', error.message || error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});