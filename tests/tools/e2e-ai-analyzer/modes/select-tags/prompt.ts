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
Changes to wdio/ or tests/performance directories (separate test frameworks) do not require Detox tags - select none unless app code is also changed.
Changes to tests/selectors/, tests/flows/, tests/locators/, or tests/page-objects/ DO affect Detox tests - use find_related_files to identify which spec files import the changed file and select the appropriate tags.
Critical files (marked in file list) typically warrant wide testing. Use tools to investigate the impact of the changes.
For E2E test infrastructure related changes, consider running the necessary tests or all of them in case the changes are wide-ranging.
Balance thoroughness with efficiency, and be conservative in your risk assessment. When in doubt, err on the side of running more test tags to ensure adequate coverage.
Do not exceed the maximum number of analysis iterations which is ${LLM_CONFIG.maxIterations}, i.e. try to decide before the maximum number of iterations is reached.
SmokeSnaps is for MetaMask Snaps functionality. Select this tag when changes affect tests/smoke/snaps/ directory, snap-related app code (snap permissions, snap state, snap UI, browser), or Flask build configuration.`;

  const performanceGuidanceSection = `PERFORMANCE TEST GUIDANCE:
Performance tests measure app responsiveness and render times. Select performance tests when changes could impact:
- UI rendering performance (component changes, list rendering, animations)
- Data loading and state management (Redux, controllers, API calls)
- Account/network list components (AccountSelector, NetworkSelector, related hooks)
- Critical user flows (login, balance loading, swap flows, send flows)
- App startup and initialization (Engine, background services, navigation)
Be generous: when app code changes touch components or flows that performance tests exercise, select the relevant tags. Err on the side of running more performance tests rather than fewer — a missed regression is worse than an extra test run.
Exception: if the ONLY changes are to tests/framework/ helper files (non-spec utilities, fixtures, page objects) with no app code changes, you do NOT need to select performance tests — the CI handles those separately. However, if any tests/performance/*.spec.ts files changed, always select the tags those specs test (check their imports from tags.performance to identify which tags apply).

PERFORMANCE FILE → TAG MAPPING (use this to guide your selection):
- app/components/UI/Bridge/** or app/reducers/swaps** or app/selectors/swaps** → @PerformanceSwaps
- app/components/Views/AccountSelector/** or app/component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/** → @PerformanceAccountList
- app/core/Engine/controllers/assets-controller/** or app/core/Engine/controllers/multichain-balances-controller/** → @PerformanceAssetLoading
- app/components/UI/Perps/** or app/core/Engine/controllers/perps-controller/** → @PerformancePreps
- app/components/UI/Predict/** or app/core/Engine/controllers/predict-controller/** → @PerformancePredict
- app/core/LockManagerService/** → @PerformanceLogin + @PerformanceLaunch`;

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
  const performanceTagsSection = `AVAILABLE PERFORMANCE TEST TAGS (select when changes could impact app performance):\n${performanceTagList}`;
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
