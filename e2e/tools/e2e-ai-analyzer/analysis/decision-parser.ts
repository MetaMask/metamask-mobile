/**
 * Decision Parser
 *
 * Parses AI responses and extracts decision information
 */

import { SelectTagsAnalysis } from '../types';

/**
 * Parses the agent's decision from its response
 */
export function parseAgentDecision(
  response: string,
): SelectTagsAnalysis | null {
  const jsonMatch = response.match(/\{[\s\S]*"selected_tags"[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Handle confidence: use provided value, or default to 75
      const confidence = parsed.confidence ?? 75;

      return {
        selectedTags: parsed.selected_tags || [],
        riskLevel: parsed.risk_level || 'medium',
        confidence: Math.min(100, Math.max(0, confidence)),
        reasoning: parsed.reasoning || 'Analysis completed',
      };
    } catch {
      return null;
    }
  }

  return null;
}
