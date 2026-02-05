/**
 * Mode-specific prompt for E2E tag selection
 */

import { SELECT_TAGS_CONFIG, PERFORMANCE_TAGS_CONFIG } from './handlers';
import {
  buildCriticalPatternsSection,
  buildToolsSection,
  buildReasoningSection,
  buildConfidenceGuidanceSection,
  buildRiskAssessmentSection,
} from '../shared/base-system-prompt';
import { LLM_CONFIG } from '../../config';
import { SkillMetadata } from '../../types';

/**
 * Builds the system prompt, i.e. the initial system message
 *
 * @param availableSkills - Metadata for available skills (loaded on-demand)
 */
export function buildSystemPrompt(availableSkills: SkillMetadata[]): string {
  const role = `You are an expert in E2E testing for MetaMask Mobile, responsible for analyzing code changes in pull requests to determine which tests are necessary for adequate validation.`;
  const goal = `GOAL: Implement a risk-based testing strategy by identifying and running only the tests relevant to the specific changes introduced in the PR, while safely skipping unrelated tests. Additionally, determine if performance tests should run based on changes that could impact app performance.`;

  // Build available skills section
  const skillsSection =
    availableSkills.length > 0
      ? `AVAILABLE SKILLS:

${availableSkills
  .map(
    (skill) =>
      `- ${skill.name}: ${skill.description}${skill.tools ? `\n  Tools: ${skill.tools}` : ''}`,
  )
  .join('\n')}`
      : '';

  const guidanceSection = `GUIDANCE:
Use your judgment - selecting all tags is acceptable (recommended as conservative approach for risky changes), as well as selecting none of them if the changes are unrisky.
Changes to wdio/ or appwright/ directories (separate test frameworks) do not require Detox tags - select none unless app code is also changed.
Critical files (marked in file list) typically warrant wide testing. Use tools to investigate the impact of the changes.
For E2E test infrastructure related changes, consider running the necessary tests or all of them in case the changes are wide-ranging.
Balance thoroughness with efficiency, and be conservative in your risk assessment. When in doubt, err on the side of running more test tags to ensure adequate coverage.
Do not exceed the maximum number of analysis iterations which is ${LLM_CONFIG.maxIterations}, i.e. try to decide before the maximum number of iterations is reached.
FlaskBuildTests is for MetaMask Snaps functionality. Select this tag when changes affect tests/smoke/snaps/ directory, snap-related app code (snap permissions, snap state, snap UI, browser), or Flask build configuration.`;

  const performanceGuidanceSection = `PERFORMANCE TEST GUIDANCE:
Performance tests measure app responsiveness and render times. Select performance tests when changes could impact:
- UI rendering performance (component changes, list rendering, animations)
- Data loading and state management (Redux, controllers, API calls)
- Account/network list components (AccountSelector, NetworkSelector, related hooks)
- Critical user flows (login, balance loading, swap flows, send flows)
- App startup and initialization (Engine, background services, navigation)
- Changes to the appwright/ directory (performance test infrastructure)`;

  const prompt = [
    role,
    goal,
    skillsSection,
    buildReasoningSection(),
    buildToolsSection(),
    buildConfidenceGuidanceSection(),
    buildCriticalPatternsSection(),
    buildRiskAssessmentSection(),
    guidanceSection,
    performanceGuidanceSection,
  ]
    .filter((section) => section) // Remove empty sections
    .join('\n\n');

  return prompt;
}

/**
 * Builds the task prompt, i.e. the initial user message
 */
export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
): string {
  // Build E2E tag coverage list
  const tagCoverageList = SELECT_TAGS_CONFIG.map(
    (config) => `- ${config.tag}: ${config.description}`,
  ).join('\n');

  // Build performance tag coverage list
  const performanceTagList = PERFORMANCE_TAGS_CONFIG.map(
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

  const instruction = `Analyze the changed files and the impacted codebase to:
1. Select E2E test tags to run so the changes can be verified safely with minimal risk
2. Determine if performance tests should run based on potential performance impact`;
  const tagsSection = `AVAILABLE E2E TEST TAGS (these are the ONLY valid E2E tags - do NOT search for tags.ts or any tags file, they are already provided here):\n${tagCoverageList}`;
  const performanceTagsSection = `AVAILABLE PERFORMANCE TEST TAGS (select when changes could impact app performance):\n${performanceTagList}`;
  const filesSection = `CHANGED FILES (${
    allFiles.length
  } total):\n${fileList.join('\n')}`;
  const closing = `Investigate efficiently (consider using several tool calls in the same iteration), then call finalize_tag_selection when ready. Before finalizing: verify you have included all dependent tags as specified in each tag's description above. Include performance_tests in your final selection with selected_tags (empty array if no performance tests needed) and reasoning.`;
  const prompt = [
    instruction,
    tagsSection,
    performanceTagsSection,
    filesSection,
    closing,
  ].join('\n\n');

  return prompt;
}
