/**
 * Shared System Prompt Components
 *
 * Reusable parts of the system prompt across all modes
 */

import { APP_CONFIG, CLAUDE_CONFIG } from '../../config';
import { getToolDefinitions } from '../../ai-tools/tool-registry';

export function buildCriticalPatternsSection(): string {
  return `CRITICAL FILE PATTERNS (files pre-marked as critical for you):
- Exact files: ${APP_CONFIG.critical.files.join(', ')}
- Keywords: ${APP_CONFIG.critical.keywords.join(
    ', ',
  )} (any file containing these)
- Paths: ${APP_CONFIG.critical.paths.join(', ')} (files in these directories)

Note: Files matching these patterns are flagged as CRITICAL in the file list you receive.
You can see WHY each file is critical and agree/disagree based on actual changes.`;
}

export function buildToolsSection(): string {
  const tools = getToolDefinitions();
  const toolDescriptions = tools
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join('\n');

  return `TOOLS AVAILABLE:
${toolDescriptions}`;
}

export function buildReasoningSection(): string {
  return `REASONING APPROACH:
You have extended thinking enabled (${CLAUDE_CONFIG.thinkingBudgetTokens} tokens). Use it to:
- Think deeply about change impacts
- Consider direct and indirect effects
- Reason about risk levels
- Evaluate change significance`;
}
