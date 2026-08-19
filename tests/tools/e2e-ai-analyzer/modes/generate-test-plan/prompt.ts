/**
 * Mode-specific prompts for generating exploratory test plans
 */

import { FEATURE_AREAS_CONFIG } from './handlers';
import {
  buildCriticalPatternsSection,
  buildToolsSection,
  buildReasoningSection,
} from '../shared/base-system-prompt';
import { LLM_CONFIG } from '../../config';
import { SkillMetadata, AnalysisContext } from '../../types';

/**
 * Builds the system prompt for test plan generation
 *
 * @param availableSkills - Metadata for available skills (loaded on-demand)
 */
export function buildSystemPrompt(availableSkills: SkillMetadata[]): string {
  const role = `You are a senior QA engineer and test architect specializing in mobile application testing for MetaMask Mobile. Your expertise includes exploratory testing, risk-based testing strategies, and release quality assurance.`;

  const goal = `GOAL: Analyze all code changes in a release branch (compared to main) and generate a comprehensive exploratory test plan. The plan should identify high-risk areas, provide specific test scenarios, and include platform-specific considerations for iOS and Android.`;

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

  const testPlanPrinciples = `TEST PLAN PRINCIPLES:
1. **Risk-Based Prioritization**: Focus testing effort on areas most likely to have defects or highest user impact
2. **Exploratory Over Scripted**: Provide guidance for exploration rather than step-by-step scripts
3. **Platform Awareness**: Consider iOS and Android differences in rendering, permissions, and behavior
4. **Change Correlation**: Link test scenarios directly to code changes that triggered them
5. **Practical Focus**: Scenarios should be achievable within typical release testing timeframes`;

  const exploratoryGuidance = `EXPLORATORY TEST SCENARIO GUIDELINES:
- Each scenario should have a clear exploration goal
- Include "what to look for" rather than exact steps
- Identify risk indicators (signs of problems)
- Consider edge cases and error conditions
- Think about user workflows, not just features
- Consider performance implications
- Include both happy path and negative testing angles

EXPLORATORY PRIORITY SCORE (1-10):
Rate each feature area's need for exploratory testing based on:
- **Complexity** (7-10): Many code paths, state combinations, integrations
- **Newness** (7-10): New features or significant refactors
- **Integration Risk** (6-9): Multiple systems interacting
- **Historical Issues** (5-8): Areas that have had bugs before
- **Standard Changes** (3-5): Routine updates, minor fixes
- **Low Risk** (1-3): Documentation, comments, test-only changes`;

  const explorationThemesGuidance = `EXPLORATION THEMES (cross-cutting approaches):
Generate exploration themes that apply across multiple feature areas. These are general testing approaches, not feature-specific. Examples:

- **Interruption Testing**: Background app, kill app, phone calls, lock/unlock device
- **Connectivity Testing**: Airplane mode, WiFi/cellular switching, slow networks
- **Boundary Testing**: Max/min values, empty inputs, special characters, long strings
- **State Permutation**: Different wallet types, account states, network configurations
- **Hardware Wallet Testing**: Ledger/Trezor flows, disconnection scenarios, signing
- **Test dApp Exploration**: Use test dApps (test-dapp.metamask.io) for dApp interactions

For each theme, identify which feature areas it's especially relevant for based on the current changes.`;

  const platformGuidance = `PLATFORM CONSIDERATIONS:
iOS-specific:
- Push notification permissions and handling
- Face ID / Touch ID integration
- iOS-specific navigation patterns (swipe gestures)
- App backgrounding and state restoration
- iOS keyboard behaviors
- SafeArea and notch handling

Android-specific:
- Back button behavior
- Android permissions model
- Fragment lifecycle considerations
- Various screen sizes and densities
- Android keyboard behaviors
- Deep link handling differences

Cross-platform:
- Feature parity verification
- UI consistency
- Performance comparison
- Network handling differences`;

  const riskAssessmentGuidance = `RISK LEVEL CRITERIA:
- **Critical**: Core wallet functionality (funds, transactions, keys), security-related, affects all users
- **High**: Major features, significant user flows, integration points between systems
- **Medium**: Standard feature changes, UI updates with moderate complexity
- **Low**: Documentation, minor UI tweaks, test-only changes, comments`;

  const outputStructure = `OUTPUT STRUCTURE:
Generate a test plan with:
1. **Summary**: High-level metrics (changed files count, risk area counts, estimated testing hours)
2. **Feature Areas**: Organized by the smoke test categories, prioritized by risk (priority 1 = highest)
   - Include exploratory_priority (1-10) for each area
3. **Exploratory Scenarios**: Specific areas to explore within each feature (id, title, description, preconditions, exploration_guidance, risk_indicators, related_changes)
4. **Platform Guidance**: iOS and Android specific notes at both global and feature-area levels`;

  const prompt = [
    role,
    goal,
    skillsSection,
    buildReasoningSection(),
    buildToolsSection(),
    buildCriticalPatternsSection(),
    testPlanPrinciples,
    exploratoryGuidance,
    explorationThemesGuidance,
    platformGuidance,
    riskAssessmentGuidance,
    outputStructure,
    `Maximum iterations: ${LLM_CONFIG.maxIterations}. Investigate thoroughly but finalize before reaching the limit.`,
  ]
    .filter((section) => section)
    .join('\n\n');

  return prompt;
}

/**
 * Builds the task prompt with changed files and context
 *
 * @param allFiles - All changed files
 * @param criticalFiles - Critical files that need attention
 * @param _context - Analysis context (unused)
 */
export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
  _context: AnalysisContext,
): string {
  // Build feature area coverage list
  const featureAreaList = FEATURE_AREAS_CONFIG.map(
    (config) => `- ${config.tag}: ${config.description}`,
  ).join('\n');

  // Build file lists
  const otherFiles = allFiles.filter((f) => !criticalFiles.includes(f));
  const fileList: string[] = [];

  if (criticalFiles.length > 0) {
    fileList.push('⚠️  CRITICAL FILES (require careful analysis):');
    criticalFiles.forEach((f) => fileList.push(`  ${f}`));
    fileList.push('');
  }

  if (otherFiles.length > 0) {
    fileList.push(`OTHER FILES (${otherFiles.length}):`);
    // Group by directory for easier reading
    const byDir: Record<string, string[]> = {};
    otherFiles.forEach((f) => {
      const dir = f.split('/').slice(0, -1).join('/') || '.';
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(f);
    });
    Object.entries(byDir).forEach(([dir, files]) => {
      fileList.push(`  ${dir}/`);
      files.forEach((f) => fileList.push(`    ${f.split('/').pop()}`));
    });
  }

  const instruction = `Analyze all changed files for this release and generate a comprehensive exploratory test plan.

Your task:
1. Investigate the changes using available tools (read files, get diffs, find related files)
2. Identify which FEATURE AREAS are impacted
3. Assess risk level for each impacted area (critical, high, medium, low)
4. Generate specific exploratory test scenarios for each impacted area
5. Note any platform-specific (iOS/Android) considerations
6. Identify cross-cutting concerns that span multiple areas

⛔ DO NOT GUESS file paths - only use paths from: the CHANGED FILES list below, list_directory results, or find_related_files results.`;

  const featureAreasSection = `FEATURE AREAS (map changes to these categories - only include areas that are actually impacted):
${featureAreaList}`;

  const filesSection = `CHANGED FILES IN THIS RELEASE (${allFiles.length} total):
${fileList.join('\n')}`;

  const investigationGuidance = `INVESTIGATION APPROACH:
1. Start with CRITICAL FILES - use get_git_diff to understand what changed
2. For complex changes, use find_related_files to understand impact scope
3. For each impacted area, identify specific user-facing behaviors to test
4. Consider both direct impacts (feature changed) and indirect impacts (dependent features)
5. Use grep_codebase to find usage patterns if needed
6. Use read_file to examine implementation details when risk assessment is unclear`;

  const closing = `When ready, call finalize_test_plan_generation with your complete analysis. Include:
- summary: { total_changed_files, total_commits, critical_areas, high_risk_areas, medium_risk_areas, low_risk_areas, estimated_testing_hours, release_version }
- feature_areas: array of {
    feature_area, risk_level, risk_justification, impacted_components,
    exploratory_scenarios (MAX 3 - use SPECIFIC action-based titles like "Test swap with insufficient gas" or "Verify bridge transaction on Polygon", NOT vague titles like "Platform Stability"),
    platform_notes, priority,
    exploratory_priority (1-10 score)
  }
- platform_specific_guidance: { ios: [], android: [], shared: [] } (leave empty arrays)
- reasoning: brief explanation of your analysis approach`;

  return [
    instruction,
    featureAreasSection,
    filesSection,
    investigationGuidance,
    closing,
  ]
    .filter((section) => section)
    .join('\n\n');
}
