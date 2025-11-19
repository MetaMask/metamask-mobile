/**
 * Mode-specific prompt for E2E tag selection
 */

import { SELECT_TAGS_CONFIG } from './handlers';
import {
  buildCriticalPatternsSection,
  buildToolsSection,
  buildReasoningSection,
  buildConfidenceGuidanceSection,
  buildRiskAssessmentSection,
} from '../shared/base-system-prompt';
import { CLAUDE_CONFIG } from '../../config';

/**
 * Builds the system prompt, i.e. the initial system message
 */
export function buildSystemPrompt(): string {
  const role = `You are an expert in E2E testing for MetaMask Mobile, responsible for analyzing code changes in pull requests to determine which tests are necessary for adequate validation.`;
  const goal = `GOAL: Implement a risk-based testing strategy by identifying and running only the tests relevant to the specific changes introduced in the PR, while safely skipping unrelated tests.`;
  const guidanceSection = `GUIDANCE:
Use your judgment - selecting all tags is acceptable (recommended as conservative approach for risky changes), as well as selecting none of them if the changes are unrisky.
Critical files (marked in file list) typically warrant wide testing. Use tools to investigate the impact of the changes.
For E2E test infrastructure related changes, consider running the necessary tests or all of them in case the changes are wide-ranging.
Balance thoroughness with efficiency, and be conservative in your risk assessment. When in doubt, err on the side of running more test tags to ensure adequate coverage.
Do not exceed the maximum number of analysis iterations which is ${CLAUDE_CONFIG.maxIterations}, i.e. try to decide before the maximum number of iterations is reached.`;

  const prompt = [
    role,
    goal,
    buildReasoningSection(),
    buildToolsSection(),
    buildConfidenceGuidanceSection(),
    buildCriticalPatternsSection(),
    buildRiskAssessmentSection(),
    guidanceSection,
  ].join('\n\n');

  return prompt;
}

/**
 * Builds the task prompt, i.e. the initial user message
 */
export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
): string {
  // Build tag coverage list
  const tagCoverageList = SELECT_TAGS_CONFIG.map(
    (config) => `- ${config.tag}: ${config.description}`,
  ).join('\n');

  // Build file lists
  const otherFiles = allFiles.filter((f) => !criticalFiles.includes(f));
  const fileList: string[] = [];

  if (criticalFiles.length > 0) {
    fileList.push('⚠️  CRITICAL FILES:');
    criticalFiles.forEach((f) => fileList.push(`  ${f}`));
    fileList.push('');
  }

  if (otherFiles.length > 0) {
    fileList.push(`OTHER FILES (${otherFiles.length}):`);
    otherFiles.forEach((f) => fileList.push(`  ${f}`));
  }

  const instruction = `Analyze the changes and identify which E2E test tags can be skipped, so all the rest are selected to run.`;
  const tagsSection = `AVAILABLE TEST TAGS (select from these and don't search for additional tags): ${tagCoverageList}`;
  const filesSection = `CHANGED FILES (${
    allFiles.length
  } total):\n${fileList.join('\n')}`;
  const closing = `Investigate efficiently (consider using several tool calls in the same iteration), then call finalize_tag_selection.

Example:
{
  "selected_tags": ["SmokeCore", "SmokeAssets"],
  "risk_level": "medium",
  "confidence": 81,
  "reasoning": "Token controller changes affect asset display..."
}`;

  const prompt = [instruction, tagsSection, filesSection, closing].join('\n\n');

  return prompt;
}
