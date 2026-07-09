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
import { SkillMetadata, AnalysisContext } from '../../types';

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
E2E smoke tags (from tests/tags.js) apply to BOTH Detox specs (tests/smoke/) and Appium specs (tests/smoke-appium/). Select tags based on impacted user flows — not on which runner executes them. The same tag can gate Detox CI, Appium Android CI, and Appium iOS CI.
Changes to tests/smoke-appium/ specs or shared test infra they import (page-objects, flows, selectors, locators) require the same tag selection as equivalent Detox changes. Inspect changed specs for their imported tags (e.g. tests/smoke-appium/accounts/ → SmokeAccounts).
Changes to wdio/ or tests/performance directories (separate test frameworks) do not require smoke tags from tests/tags.js - select none unless app code is also changed.
Changes to tests/selectors/, tests/flows/, tests/locators/, or tests/page-objects/ affect E2E tests across frameworks - use find_related_files to identify which spec files import the changed file and select the appropriate tags from both tests/smoke/ and tests/smoke-appium/.
Critical files (marked in file list) typically warrant wide testing. Use tools to investigate the impact of the changes.
For E2E test infrastructure related changes, consider running the necessary tests or all of them in case the changes are wide-ranging.
Balance thoroughness with efficiency, and be conservative in your risk assessment. When in doubt, err on the side of running more test tags to ensure adequate coverage.
Do not exceed the maximum number of analysis iterations which is ${LLM_CONFIG.maxIterations}, i.e. try to decide before the maximum number of iterations is reached.
SmokeSnaps is for MetaMask Snaps functionality. Select this tag when changes affect tests/smoke/snaps/ directory, snap-related app code (snap permissions, snap state, snap UI, browser), or Flask build configuration.`;

  const cosmeticChangesSection = `COSMETIC CHANGES — IGNORE FOR TEST SELECTION:
The following types of changes have zero functional impact and must NOT trigger any additional test selection on their own. When you inspect a diff with get_git_diff and find that a file's changes are entirely cosmetic, treat that file as if it were not changed at all:
- Adding or removing console.log / console.error / console.warn / console.debug / console.info calls
- Adding or removing debugger statements
- Whitespace-only changes (indentation, blank lines, trailing spaces)
- Comment-only changes (adding, removing, or modifying code comments)
- Import reordering with no net change in imported symbols
If a PR only contains cosmetic changes across all files, select zero E2E tags and zero performance tags.`;

  const performanceGuidanceSection = `PERFORMANCE TEST GUIDANCE:
Performance tests measure app responsiveness and render times. Decide performance_tests the same way you decide E2E tags: use the available performance tag list, inspect the changed files and diffs, reason about impacted user flows, and select only the relevant performance tags.
Do not rely on a hardcoded file-to-tag mapping. If a changed app file could impact one of the performance scenarios described in AVAILABLE PERFORMANCE TEST TAGS, select that tag and explain why.
If any tests/performance/*.spec.ts files changed, inspect the spec content with read_file/get_git_diff and select performance tags only when the changed spec actually declares or exercises those performance tags. System-only specs under tests/performance must not trigger performance_tests.
If the ONLY changes are to tests/framework/ helper files, fixtures, page objects, or other non-spec test utilities with no app code changes, select performance tags only if the diff plausibly affects measured performance behavior.
Apply the COSMETIC CHANGES rule before selecting performance tags.`;

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
    cosmeticChangesSection,
    performanceGuidanceSection,
  ]
    .filter((section) => section) // Remove empty sections
    .join('\n\n');

  return prompt;
}

/**
 * Builds the task prompt, i.e. the initial user message
 *
 * @param allFiles - All changed files
 * @param criticalFiles - Critical files that need attention
 * @param context - Analysis context for PR-aware performance guidance
 */
export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
  context: AnalysisContext,
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
  const performanceTagsSection = `AVAILABLE PERFORMANCE TEST TAGS (derived from tags.performance.js; these are the ONLY valid performance tags - select when changes could impact app performance):\n${performanceTagList}`;
  const filesSection = `CHANGED FILES (${
    allFiles.length
  } total):\n${fileList.join('\n')}`;
  const performanceScopeSection = `PERFORMANCE ANALYSIS SCOPE:
For performance_tests only, base your decision on the complete PR file set above${
    context.prNumber ? ` (PR #${context.prNumber})` : ''
  }, not only the most recent commit or synchronize event. This matters after rebases: if an older commit in the PR changes a performance-sensitive flow, select the relevant performance tags even when the latest commit only changes unrelated files.
Use get_git_diff when a file's actual PR diff is needed, but do not narrow performance_tests to the last commit.`;
  const closing = `Investigate efficiently (consider using several tool calls in the same iteration), then call finalize_tag_selection when ready. Before finalizing: verify you have included all dependent tags as specified in each tag's description above. Include performance_tests in your final selection with selected_tags (empty array if no performance tests needed) and reasoning.`;
  const prompt = [
    instruction,
    tagsSection,
    performanceTagsSection,
    filesSection,
    performanceScopeSection,
    closing,
  ].join('\n\n');

  return prompt;
}
