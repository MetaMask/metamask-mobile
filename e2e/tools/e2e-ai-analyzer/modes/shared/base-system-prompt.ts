/**
 * Shared System Prompt Components
 *
 * Reusable parts of the system prompt across all modes
 */

import { APP_CONFIG } from '../../config';
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
- Think deeply about change impacts
- Consider direct and indirect effects
- Reason about risk levels
- Evaluate change significance`;
}

export function buildConfidenceGuidanceSection(): string {
  return `CONFIDENCE:
Provide an honest confidence score (0-100) for your decision.
- Higher confidence: Clear impact, used tools to investigate, straightforward changes
- Lower confidence: Uncertain impact, couldn't fully investigate, complex changes
Be truthful about uncertainty - it's okay to have low confidence.`;
}

export function buildRiskAssessmentSection(): string {
  return `RISK ASSESSMENT:
- Low: Pure documentation, README, comments
- Medium: Standard code changes with clear impact assessment
- High: Core modules, controllers, Engine, critical dependencies, critical paths, security
Still consider tests for low/medium changes if they affect user flows or testing infrastructure`;
}
