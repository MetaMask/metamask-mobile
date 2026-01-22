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
import { LLM_CONFIG } from '../../config';

/**
 * Builds the system prompt, i.e. the initial system message
 */
export function buildSystemPrompt(): string {
  const role = `You are an expert in E2E testing for MetaMask Mobile, responsible for analyzing code changes in pull requests to determine which tests are necessary for adequate validation.`;
  const goal = `GOAL: Implement a risk-based testing strategy by identifying and running only the tests relevant to the specific changes introduced in the PR, while safely skipping unrelated tests.`;
  const guidanceSection = `GUIDANCE:
Use your judgment - selecting all tags is acceptable (recommended as conservative approach for risky changes), as well as selecting none of them if the changes are unrisky.
Changes to wdio/ or appwright/ directories (separate test frameworks) do not require Detox tags - select none unless app code is also changed.
Critical files (marked in file list) typically warrant wide testing. Use tools to investigate the impact of the changes.
Balance thoroughness with efficiency, and be conservative in your risk assessment. When in doubt, err on the side of running more test tags to ensure adequate coverage.
Do not exceed the maximum number of analysis iterations which is ${LLM_CONFIG.maxIterations}, i.e. try to decide before the maximum number of iterations is reached.
FlaskBuildTests is for MetaMask Snaps functionality. Select this tag when changes affect e2e/specs/snaps/ directory, snap-related app code (snap permissions, snap state, snap UI, browser), or Flask build configuration.`;

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

  const instruction = `Analyze the changed files and the impacted codebase to select the E2E test tags to run so the changes can be verified safely with minimal risk.`;
  const tagsSection = `AVAILABLE TEST TAGS (these are the ONLY valid tags - do NOT search for tags.ts or any tags file, they are already provided here):\n${tagCoverageList}`;
  const filesSection = `CHANGED FILES (${
    allFiles.length
  } total):\n${fileList.join('\n')}`;
  const closing = `Investigate efficiently (consider using several tool calls in the same iteration), then call finalize_tag_selection when ready`;
  const prompt = [instruction, tagsSection, filesSection, closing].join('\n\n');

  return prompt;
}
