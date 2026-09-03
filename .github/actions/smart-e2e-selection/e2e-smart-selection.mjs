#!/usr/bin/env node
/**
 * Runs shared-engine smart-e2e (MetaMask/ai-analyzer) and maps result_json
 * onto the existing Smart E2E GitHub Action outputs + PR comment body.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { mapSmartE2eOutputs, parseResultJson } from './map-smart-e2e-outputs.mjs';

const env = {
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
  BASE_REF: process.env.BASE_REF || 'main',
  WORKSPACE: process.env.GITHUB_WORKSPACE || process.cwd(),
};

const PR_COMMENT_FILE = 'pr_comment.md';
const RESULT_FILE = 'smart-e2e.json';
const ANALYZER_DIR = '.ai-analyzer-action';

function setGithubOutputs(key, value) {
  if (!env.GITHUB_OUTPUT) return;

  if (typeof value === 'string' && value.includes('\n')) {
    appendFileSync(env.GITHUB_OUTPUT, `${key}<<EOF\n${value}\nEOF\n`);
  } else {
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function appendGithubSummary(content) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(env.GITHUB_STEP_SUMMARY, content + '\n');
}

function formatTagsDisplay(tagsJson) {
  try {
    const tags = JSON.parse(tagsJson);
    if (!Array.isArray(tags) || tags.length === 0) {
      return 'None (no tests recommended)';
    }
    if (tags.length === 1 && tags[0] === 'ALL') {
      return 'ALL';
    }
    return tags.join(', ');
  } catch {
    return tagsJson || 'None';
  }
}

function formatPerformanceDisplay(perfTags) {
  if (perfTags === '') {
    return 'ALL (conservative)';
  }
  try {
    const tags = JSON.parse(perfTags);
    if (!Array.isArray(tags) || tags.length === 0) {
      return 'None (no tests recommended)';
    }
    return tags.join(', ');
  } catch {
    return perfTags;
  }
}

function generateAnalysisSummary(mapped, reasoning, riskLevel) {
  let summary = '';
  summary += `- **Selected E2E tags**: ${formatTagsDisplay(mapped.ai_e2e_test_tags)}\n`;
  summary += `- **Selected Performance tags**: ${formatPerformanceDisplay(mapped.ai_performance_test_tags)}\n`;
  summary += `- **Risk Level**: ${riskLevel || 'n/a'}\n`;
  summary += `- **AI Confidence**: ${mapped.ai_confidence}%\n`;

  summary += '\n<details>\n';
  summary += '<summary>click to see 🤖 AI reasoning details</summary>\n\n';
  summary += `**E2E Test Selection:**\n${reasoning || 'n/a'}\n\n`;
  summary += `**Performance Test Selection:**\n${mapped.ai_performance_test_reasoning || 'n/a'}\n`;
  summary += '\n</details>\n';

  return summary;
}

function generatePRComment(summaryContent) {
  if (!env.PR_NUMBER) {
    console.log('⏭️ Skipping PR comment file generation - no PR number');
    return;
  }
  writeFileSync(PR_COMMENT_FILE, summaryContent, 'utf8');
  console.log(`✅ PR comment body written to ${PR_COMMENT_FILE}`);
}

function applyMappedOutputs(mapped) {
  setGithubOutputs('ai_e2e_test_tags', mapped.ai_e2e_test_tags);
  setGithubOutputs('ai_confidence', mapped.ai_confidence);
  setGithubOutputs('ai_performance_test_tags', mapped.ai_performance_test_tags);
  setGithubOutputs(
    'ai_performance_test_reasoning',
    mapped.ai_performance_test_reasoning,
  );
}

async function main() {
  try {
    if (!env.PR_NUMBER) {
      console.log('⏭️ Skipping AI analysis - only runs on PRs');
      return;
    }

    const analyzerEntry = join(
      env.WORKSPACE,
      ANALYZER_DIR,
      'src',
      'index.ts',
    );
    if (!existsSync(analyzerEntry)) {
      console.error(
        `❌ Shared analyzer not found at ${analyzerEntry}. Checkout MetaMask/ai-analyzer first.`,
      );
      process.exit(1);
    }

    const baseBranch = `origin/${env.BASE_REF}`;
    console.log(
      `🎯 Analyzing PR #${env.PR_NUMBER} against base branch: ${baseBranch} (mode: smart-e2e)`,
    );

    try {
      execFileSync(
        'node',
        [
          '-r',
          'esbuild-register',
          analyzerEntry,
          '--mode',
          'smart-e2e',
          '--config',
          '.ai-pr-analyzer',
          '--pr',
          String(env.PR_NUMBER),
          '--base-branch',
          baseBranch,
        ],
        {
          encoding: 'utf8',
          stdio: 'inherit',
          cwd: env.WORKSPACE,
          env: process.env,
        },
      );
    } catch {
      console.error('❌ AI analyzer failed');
      process.exit(1);
    }

    const resultPath = join(env.WORKSPACE, RESULT_FILE);
    let parsedResult;
    try {
      parsedResult = parseResultJson(readFileSync(resultPath, 'utf8'));
    } catch (error) {
      console.error(`❌ Failed to read ${RESULT_FILE}`);
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }

    if (!parsedResult) {
      console.error(`❌ ${RESULT_FILE} was empty or invalid JSON`);
      process.exit(1);
    }

    const mapped = mapSmartE2eOutputs(parsedResult);
    applyMappedOutputs(mapped);

    const summaryContent = generateAnalysisSummary(
      mapped,
      typeof parsedResult.reasoning === 'string' ? parsedResult.reasoning : '',
      typeof parsedResult.risk_level === 'string'
        ? parsedResult.risk_level
        : '',
    );
    appendGithubSummary('## 🔍 Smart E2E Test Selection\n' + summaryContent);
    generatePRComment(summaryContent);
  } catch (error) {
    console.error('❌ Error running AI analysis:', error.message || error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
