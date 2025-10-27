/**
 * Decision Parser
 *
 * Parses AI responses and extracts decision information
 */

import { aiE2EConfig } from '../../../tags';
import { AIAnalysis, FileCategorization } from '../types';

/**
 * Parses the agent's decision from its response
 */
export function parseAgentDecision(
  response: string,
  pipelineTags: string[]
): AIAnalysis | null {
  const jsonMatch = response.match(/\{[\s\S]*"selected_tags"[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Filter to only valid tags from aiE2EConfig
      const validTagNames = aiE2EConfig.map(config => config.tag);
      const validTags = (parsed.selected_tags || []).filter((tag: string) =>
        validTagNames.includes(tag)
      );

      // Handle confidence: use provided value, or default to 75
      const confidence = parsed.confidence ?? 75;

      return {
        riskLevel: parsed.risk_level || 'medium',
        selectedTags: validTags,
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
  pipelineTags: string[]
): AIAnalysis {
  return {
    riskLevel: 'high',
    selectedTags: pipelineTags,
    areas: ['all'],
    reasoning: `Fallback: AI analysis did not complete successfully. Running all ${pipelineTags.length} available test tags to ensure comprehensive coverage for ${changedFiles.length} changed files.`,
    confidence: 0
  };
}
