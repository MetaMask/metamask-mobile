#!/usr/bin/env node
import { execSync } from 'child_process';
import { appendFileSync, writeFileSync } from 'fs';

/**
 * Runs the Smart E2E selection script,
 * Generates the Github outputs, Step Summary and PR Comment Body
*/

const env = {
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
};

const PR_COMMENT_FILE = 'pr_comment.md';

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
  const { tagDisplay, tagCount, riskLevel, confidence, reasoning } = analysis;

  let summary = '';

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
  const { tags, tagDisplay, riskLevel, reasoning, confidence } = analysis;
  setGithubOutputs('ai_e2e_test_tags', tags);
  setGithubOutputs('ai_tags_display', tagDisplay);
  setGithubOutputs('ai_risk_level', riskLevel);
  setGithubOutputs('ai_reasoning', reasoning);
  setGithubOutputs('ai_confidence', confidence);
}

async function main() {
  try {
    if (!env.PR_NUMBER) {
      console.log('⏭️ Skipping AI analysis - only runs on PRs');
      return;
    }

    console.log('🤖 Starting AI analysis...');
    // Build command
    const baseCmd = `node -r esbuild-register e2e/scripts/ai-e2e-tags-selector.ts --mode select-tags --output json --pr ${env.PR_NUMBER}`;
    const result = execCommand(baseCmd, { silent: true });
    console.log('🤖 AI analysis completed\n');

    // Validate JSON output
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (error) {
      console.error('❌ Invalid JSON output from AI analysis');
      console.error(`Raw output: ${result}`);
      process.exit(1);
    }
    // Parse results
    const analysis = {
      tags: parsedResult.selectedTags?.join('|') || '',
      tagCount: parsedResult.selectedTags?.length || 0,
      riskLevel: parsedResult.riskLevel || '',
      tagDisplay: parsedResult.selectedTags?.join(', ') || '',
      reasoning: parsedResult.reasoning || '',
      confidence: parsedResult.confidence || ''
    };

    console.log(`🧪 Selected E2E tags: ${analysis.tagDisplay}`);
    console.log(`📈 Risk Level: ${analysis.riskLevel}`);
    console.log(`🔢 AI Confidence: ${analysis.confidence}`);

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