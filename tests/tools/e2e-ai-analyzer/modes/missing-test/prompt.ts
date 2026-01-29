/**
 * ============================================
 * MODE: [YOUR-MODE-NAME]
 * ============================================
 *
 * TEAM: _______________
 * DATE: _______________
 *
 * INSTRUCTIONS:
 * 1. Replace all [PLACEHOLDERS] with your content
 * 2. Keep the function signatures the same
 * 3. Use the shared prompt builders where helpful
 */

import { buildToolsSection } from '../shared/base-system-prompt';
import { LLM_CONFIG } from '../../config';
import { SkillMetadata } from '../../types';

/**
 * ============================================
 * SYSTEM PROMPT - Defines WHO the AI is
 * ============================================
 */
export function buildSystemPrompt(availableSkills: SkillMetadata[]): string {
  // ----------------------------------------
  // STEP 1: Define the AI's role
  // ----------------------------------------
  // Example: "You are an expert in E2E testing for MetaMask Mobile..."
  const role = `You are an expert in quality assurance for MetaMask Mobile, specializing in identifying missing E2E tests in the codebase.`;

  // ----------------------------------------
  // STEP 2: Define the goal
  // ----------------------------------------
  // Example: "GOAL: Analyze E2E tests and identify brittle selectors..."
  const goal = `GOAL: Find missing E2E tests in the PR and suggest new tests to write.`;

  // ----------------------------------------
  // STEP 3: Define patterns to look for
  // ----------------------------------------
  // List specific things the AI should identify (missing coverage)
  const patterns = `PATTERNS TO IDENTIFY:
1. New or changed UI flows in the PR with no corresponding E2E spec in e2e/specs/
2. New screens, features, or user journeys that lack an E2E test file
3. Critical paths (e.g. login, send, swap, connect dapp) that are not covered by existing specs
4. New or changed fixtures/controllers that enable testable scenarios but have no E2E scenario yet
5. Features under e2e/specs/ where new behavior was added but no new test case was added

BEST PRACTICES (for suggested new tests):
1. Place tests in e2e/specs/<feature-name>/<descriptive-name>.spec.ts following the mandatory structure
2. Use Page Object Model: selectors in Page Objects or selector files, not in specs
3. Use fixtures (FixtureBuilder) to set up state; minimize UI-only setup
4. Use Assertions and Gestures from the framework; never TestHelpers.delay()
5. One main behavior per test; name tests by what they verify (e.g. "adds Bob to the address book")`;

  // ----------------------------------------
  // STEP 4: Add guidance/constraints
  // ----------------------------------------
  const guidance = `GUIDANCE:
- Focus on high-impact user flows and critical paths first
- Suggest concrete test scenarios: file path, test name, and brief steps (fixture + actions + assertions)
- Align suggestions with project E2E guidelines (POM, fixtures, no delay, framework imports from tests/framework/index.ts)
- Consider both iOS and Android when suggesting tests
- Do not exceed ${LLM_CONFIG.maxIterations} iterations`;

  // Build available skills section (keep this as-is)
  const skillsSection =
    availableSkills.length > 0
      ? `AVAILABLE SKILLS:\n${availableSkills
          .map((skill) => `- ${skill.name}: ${skill.description}`)
          .join('\n')}`
      : '';

  // Combine all sections (order matters!)
  return [
    role,
    goal,
    skillsSection,
    buildToolsSection(), // Lists available tools
    patterns,
    guidance,
  ]
    .filter((section) => section)
    .join('\n\n');
}

/**
 * ============================================
 * TASK PROMPT - Defines WHAT to analyze
 * ============================================
 */
export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
): string {
  // ----------------------------------------
  // STEP 5: Filter files (optional)
  // ----------------------------------------
  // Only analyze relevant files (e2e specs, selectors, and app/ for feature coverage)

  const filesToAnalyze = allFiles;
  const fileList = filesToAnalyze.map((f) => `  ${f}`).join('\n');

  // ----------------------------------------
  // STEP 6: Write the instruction
  // ----------------------------------------
  const instruction = `Analyze the PR changes and the existing E2E test suite to find gaps in coverage. For each gap, suggest a new E2E test: file path (e2e/specs/<feature>/<name>.spec.ts), test name, and brief steps (fixture + actions + assertions). Prioritize critical user flows and features that were added or changed in the PR.`;

  // ----------------------------------------
  // STEP 7: Define analysis steps
  // ----------------------------------------
  const steps = `ANALYSIS STEPS:
1. Use read_file to examine PR-changed files (app/, e2e/) and existing e2e/specs/ for the same or related features
2. For each new or changed feature/flow, check whether e2e/specs/ already has a spec that covers it
3. Evaluate: Is this a critical path? Is it a new screen or user journey? Does the PR add testable behavior without a new test?
4. Produce a list of suggested new tests: each with file path, test name (e.g. "adds Bob to the address book"), and brief scenario (fixture + key actions + assertions). Follow e2e/specs/<feature-name>/ structure and project E2E guidelines
5. Call finalize_missing_e2e_tests when ready with your suggestions`;

  // Build the final prompt
  return [
    instruction,
    `FILES TO ANALYZE (${filesToAnalyze.length} files):\n${fileList}`,
    criticalFiles.length > 0
      ? `CRITICAL FILES:\n${criticalFiles.map((f) => `  ${f}`).join('\n')}`
      : '',
    steps,
    'Begin your analysis.',
  ]
    .filter((section) => section)
    .join('\n\n');
}
