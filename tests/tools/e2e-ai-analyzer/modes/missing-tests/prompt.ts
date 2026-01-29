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
  const role = `You are an expert in quality assurance for MetaMask Mobile, specializing in writing e2e tests.`;

  // ----------------------------------------
  // STEP 2: Define the goal
  // ----------------------------------------
  // Example: "GOAL: Analyze E2E tests and identify brittle selectors..."
  const goal = `GOAL: Analyze code changes and identify e2etests that are missing.`;

  // ----------------------------------------
  // STEP 3: Define patterns to look for
  // ----------------------------------------
  // List specific things the AI should identify
  const patterns = `PATTERNS TO IDENTIFY:
1. [PATTERN 1 - e.g., "Tests with hardcoded waits (sleep, delay)"]
2. [PATTERN 2 - e.g., "Selectors using CSS class names"]
3. [PATTERN 3 - e.g., "Missing assertions"]
4. [PATTERN 4 - e.g., "Duplicate setup code"]

BEST PRACTICES:
1. [BEST PRACTICE 1 - e.g., "Use testID attributes"]
2. [BEST PRACTICE 2 - e.g., "Keep tests focused on one thing"]
3. [BEST PRACTICE 3 - e.g., "Use page objects"]`;

  // ----------------------------------------
  // STEP 4: Add guidance/constraints
  // ----------------------------------------
  const guidance = `GUIDANCE:
- [CONSTRAINT 1 - e.g., "Focus on the most impactful issues first"]
- [CONSTRAINT 2 - e.g., "Provide concrete suggestions, not just criticism"]
- [CONSTRAINT 3 - e.g., "Consider both iOS and Android"]
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
  // Only analyze relevant files
  const relevantFiles = allFiles.filter(
    (f) =>
      // [MODIFY THIS FILTER]
      // Examples:
      // f.includes('e2e/') - E2E test files
      // f.includes('.spec.') - Spec files
      // f.includes('selectors/') - Selector files
      f.includes('e2e/') || f.includes('.spec.') || f.includes('.test.'),
  );

  const filesToAnalyze = relevantFiles.length > 0 ? relevantFiles : allFiles;
  const fileList = filesToAnalyze.map((f) => `  ${f}`).join('\n');

  // ----------------------------------------
  // STEP 6: Write the instruction
  // ----------------------------------------
  const instruction = `[WHAT SHOULD THE AI DO WITH THESE FILES?]
Example: "Analyze the following E2E test files and identify selectors that could be improved."`;

  // ----------------------------------------
  // STEP 7: Define analysis steps
  // ----------------------------------------
  const steps = `ANALYSIS STEPS:
1. Use read_file to examine each relevant file
2. [WHAT SHOULD AI LOOK FOR?]
3. [HOW SHOULD AI EVALUATE?]
4. [WHAT OUTPUT SHOULD AI PRODUCE?]
5. Call finalize_[YOUR_MODE] when ready`;

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
