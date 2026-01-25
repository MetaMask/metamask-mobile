/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { writeFileSync } from 'node:fs';
import { SelectTagsAnalysis } from '../../types';
import { smokeTags, flaskTags } from '../../../../tags';

/**
 * Tags to exclude from AI selection (broken/disabled tests)
 */
const EXCLUDED_TAGS = [
  'SmokeSwaps',
  'SmokeCard',
  'SmokeRamps',
  'SmokeMultiChainAPI',
];

/**
 * Derive AI config from smokeTags and flaskTags
 * Converts tags objects to array format for AI
 */
const allTags = { ...smokeTags, ...flaskTags };

export const SELECT_TAGS_CONFIG = Object.values(allTags)
  .map((config) => ({
    tag: config.tag.replace(':', ''), // Remove trailing colon for AI
    description: config.description,
  }))
  .filter((config) => !EXCLUDED_TAGS.includes(config.tag));

/**
 * Safe minimum: When no work needed, return empty result
 */
export function createEmptyResult(): SelectTagsAnalysis {
  return {
    selectedTags: [],
    confidence: 100,
    riskLevel: 'low',
    reasoning: 'No files changed - no analysis needed',
  };
}

/**
 * Processes AI response: parses JSON and returns analysis
 */
export async function processAnalysis(
  aiResponse: string,
  _baseDir: string,
): Promise<SelectTagsAnalysis | null> {
  // Parse JSON from AI response
  const jsonMatch = aiResponse.match(/\{[\s\S]*"selected_tags"[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      !Array.isArray(parsed.selected_tags) ||
      !parsed.risk_level ||
      !parsed.reasoning
    ) {
      return null;
    }

    return {
      selectedTags: parsed.selected_tags,
      riskLevel: parsed.risk_level,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning,
    };
  } catch {
    return null;
  }
}

/**
 * Safe maximum: When AI fails, be conservative - i.e. run all tags
 */
export function createConservativeResult(): SelectTagsAnalysis {
  const availableTags = SELECT_TAGS_CONFIG.map((config) => config.tag);
  return {
    selectedTags: availableTags,
    riskLevel: 'high',
    confidence: 0,
    reasoning:
      'Fallback: AI analysis did not complete successfully. Running all tests.',
  };
}

/**
 * Outputs analysis results to both JSON file and console
 */
export function outputAnalysis(analysis: SelectTagsAnalysis): void {
  const outputFile = 'e2e-ai-analysis.json';

  console.log('\n🤖 AI E2E Tag Selector');
  console.log('===================================');
  console.log(`✅ Selected E2E tags: ${analysis.selectedTags.join(', ')}`);
  console.log(`🎯 Risk level: ${analysis.riskLevel}`);
  console.log(`📊 Confidence: ${analysis.confidence}%`);
  console.log(`💭 Reasoning: ${analysis.reasoning}`);

  // If running in CI, write the results to a JSON file
  if (process.env.CI === 'true') {
    const jsonOutput = {
      selectedTags: analysis.selectedTags,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
    };
    writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  }
}
