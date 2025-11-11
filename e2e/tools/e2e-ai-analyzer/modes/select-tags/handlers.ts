/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { writeFileSync } from 'node:fs';
import { SelectTagsAnalysis } from '../../types';
import { aiE2EConfig } from '../../../../tags';

// Single source of truth for tags
export const SELECT_TAGS_CONFIG = aiE2EConfig;

/**
 * Safe minimum: When no work needed, return empty result
 */
export function createEmptyResult(): SelectTagsAnalysis {
  return {
    selectedTags: ['None (no tests recommended)'],
    confidence: 100,
    riskLevel: 'low',
    reasoning: 'No files changed - no analysis needed',
  };
}

/**
 * Processes analysis results from the AI (middle case - normal operation)
 */
export async function processAnalysis(
  analysis: SelectTagsAnalysis,
  _baseDir: string,
): Promise<SelectTagsAnalysis> {
  return analysis;
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
