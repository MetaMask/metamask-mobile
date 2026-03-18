/**
 * Mode-specific prompt for root cause analysis of bug reports
 */

import {
  buildToolsSection,
  buildReasoningSection,
  buildConfidenceGuidanceSection,
} from '../shared/base-system-prompt';
import { SkillMetadata, AnalysisContext } from '../../types';

/**
 * Builds the system prompt for root cause analysis
 */
export function buildSystemPrompt(availableSkills: SkillMetadata[]): string {
  const role = `You are an expert investigator of the MetaMask Mobile codebase (React Native). Your job is to analyze bug reports, trace the code paths involved, identify the root cause, find regression PRs via git history, and assess the scope of impact across the codebase.`;

  const goal = `GOAL: Given a bug report from a GitHub issue, investigate the codebase to determine:
1. The root cause of the bug
2. Which PR(s) likely introduced the regression (if it is a regression)
3. The code flow from entry point to failure point
4. Other areas of the codebase affected by the same pattern
5. A suggested fix approach`;

  const skillsSection =
    availableSkills.length > 0
      ? `AVAILABLE SKILLS:\n\n${availableSkills
          .map(
            (skill) =>
              `- ${skill.name}: ${skill.description}${skill.tools ? `\n  Tools: ${skill.tools}` : ''}`,
          )
          .join('\n')}`
      : '';

  const investigationGuidance = `INVESTIGATION APPROACH:
1. Start by understanding the bug from the issue description
2. Use grep_codebase and read_file to find the relevant code paths
3. Use git_log on key files to identify recent changes and potential regression PRs
4. Trace the error flow from user action to the failure point
5. Search for the same pattern/function in other parts of the codebase to assess scope
6. Call finalize_root_cause when you have enough evidence

IMPORTANT:
- Be thorough but efficient — focus on the most likely code paths first
- When checking git history, look for PRs that modified the logic around the bug
- Include file:line references in your error flow
- If you cannot determine the root cause with confidence, say so honestly
- Do not speculate without evidence from the code`;

  const prompt = [
    role,
    goal,
    skillsSection,
    buildReasoningSection(),
    buildToolsSection(),
    buildConfidenceGuidanceSection(),
    investigationGuidance,
  ]
    .filter((section) => section)
    .join('\n\n');

  return prompt;
}

/**
 * Builds the task prompt from the issue details
 */
export function buildTaskPrompt(
  _allFiles: string[],
  _criticalFiles: string[],
  context?: AnalysisContext,
): string {
  const issueTitle = context?.issueTitle || 'Unknown issue';
  const issueBody = context?.issueBody || 'No description provided';
  const issueNumber = context?.issueNumber;

  const header = issueNumber
    ? `Investigate the following bug report (Issue #${issueNumber}):`
    : `Investigate the following bug report:`;

  const prompt = `${header}

**Title:** ${issueTitle}

**Description:**
${issueBody}

---

Investigate this bug by:
1. Finding the relevant code paths mentioned in or implied by the bug description
2. Reading the code to understand the current behavior
3. Using git_log on key files to find recent changes that may have introduced the bug
4. Searching for the same pattern elsewhere to assess the scope of impact
5. Determining a suggested fix approach

When you have gathered enough evidence, call finalize_root_cause with your findings.`;

  return prompt;
}
