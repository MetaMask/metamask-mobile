/**
 * Decision Parser
 *
 * Parses AI responses and extracts decision information
 */

import { AIAnalysis } from '../types';

/**
 * Parses the agent's decision from its response
 */
export function parseAgentDecision(
  response: string,
): AIAnalysis | null {
  const jsonMatch = response.match(/\{[\s\S]*"selected_tags"[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Handle confidence: use provided value, or default to 75
      const confidence = parsed.confidence ?? 75;

      return {
        riskLevel: parsed.risk_level || 'medium',
        selectedTags: parsed.selected_tags || [],
        areas: parsed.areas || [],
        reasoning: parsed.reasoning || 'Analysis completed',
        confidence: Math.min(100, Math.max(0, confidence))
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Creates a fallback analysis when AI analysis fails
 */
export function createFallbackAnalysis(
  changedFiles: string[],
  availableTags: string[]
): AIAnalysis {
  return {
    riskLevel: 'high',
    selectedTags: availableTags,
    areas: ['all'],
    reasoning: `Fallback: AI analysis did not complete successfully. Running all ${availableTags.length} available test tags to ensure comprehensive coverage for ${changedFiles.length} changed files.`,
    confidence: 0
  };
}
