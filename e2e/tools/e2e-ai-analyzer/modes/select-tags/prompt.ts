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
  const role = `You are an expert in the E2E testing of MetaMask Mobile.`;
  const goal = `GOAL: Analyze code changes and select appropriate test tags to run.`;

  const guidanceSection = `GUIDANCE:
Use your judgment - selecting all tags is acceptable (recommended as conservative approach), as well as selecting none of them.
Critical files (marked in file list) typically warrant testing. Use tools to investigate when uncertain.
For E2E test infrastructure related changes, consider running the necessary tests or all of them in case the changes are wide-ranging.
Balance thoroughness with efficiency, and be conservative in the assessment of risk and tags to run.
Do not exceed the maximum number of analysis iterationss which is ${CLAUDE_CONFIG.maxIterations}.`;

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

  const instruction = `Analyze the changed files and select the E2E test tags to run so the tests can verify the changes.`;
  const tagsSection = `AVAILABLE TEST TAGS:\n${tagCoverageList}`;
  const filesSection = `CHANGED FILES (${
    allFiles.length
  } total):\n${fileList.join('\n')}`;
  const closing = `Use tools to investigate. Call finalize_tag_selection when ready.`;

  const prompt = [instruction, tagsSection, filesSection, closing].join('\n\n');

  return prompt;
}
