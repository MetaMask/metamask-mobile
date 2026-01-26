/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { writeFileSync } from 'node:fs';
import { SelectTagsAnalysis, PerformanceTestSelection } from '../../types';
import { smokeTags, flaskTags, performanceTags } from '../../../../../e2e/tags';

/**
 * Tags to exclude from AI selection (broken/disabled tests)
 */
const EXCLUDED_TAGS = [
  'SmokeSwaps',
  'SmokeMultiChainAPI',
  'SmokeCore',
  'SmokeWalletUX',
  'SmokeAssets',
  'SmokeStake',
  'SmokeNotifications',
  'SmokeMultiChainPermissions',
  'SmokeAnalytics',
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
 * Derive AI config from performanceTags
 * Converts tags objects to array format for AI
 */
export const PERFORMANCE_TAGS_CONFIG = Object.values(performanceTags).map(
  (config) => ({
    tag: config.tag.replace(':', ''), // Remove trailing colon for AI
    description: config.description,
  }),
);

/**
 * Creates an empty performance test selection result
 */
function createEmptyPerformanceResult(): PerformanceTestSelection {
  return {
    selectedTags: [],
    reasoning: 'No files changed - no performance tests needed',
  };
}

/**
 * Safe minimum: When no work needed, return empty result
 */
export function createEmptyResult(): SelectTagsAnalysis {
  return {
    selectedTags: [],
    confidence: 100,
    riskLevel: 'low',
    reasoning: 'No files changed - no analysis needed',
    performanceTests: createEmptyPerformanceResult(),
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

    // Parse performance tests (optional, empty array means no performance tests)
    const performanceTests: PerformanceTestSelection = parsed.performance_tests
      ? {
          selectedTags: Array.isArray(parsed.performance_tests.selected_tags)
            ? parsed.performance_tests.selected_tags
            : [],
          reasoning: parsed.performance_tests.reasoning || '',
        }
      : {
          selectedTags: [],
          reasoning: 'No performance impact detected',
        };

    return {
      selectedTags: parsed.selected_tags,
      riskLevel: parsed.risk_level,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning,
      performanceTests,
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
  const availablePerformanceTags = PERFORMANCE_TAGS_CONFIG.map(
    (config) => config.tag,
  );
  return {
    selectedTags: availableTags,
    riskLevel: 'high',
    confidence: 0,
    reasoning:
      'Fallback: AI analysis did not complete successfully. Running all tests.',
    performanceTests: {
      selectedTags: availablePerformanceTags,
      reasoning:
        'Fallback: AI analysis did not complete successfully. Running all performance tests.',
    },
  };
}

/**
 * Outputs analysis results to both JSON file and console
 */
export function outputAnalysis(analysis: SelectTagsAnalysis): void {
  const outputFile = 'e2e-ai-analysis.json';

  console.log('\n🤖 AI E2E Tag Selector');
  console.log('===================================');
  console.log(
    `✅ Selected E2E tags: ${analysis.selectedTags.join(', ') || 'None'}`,
  );
  console.log(`🎯 Risk level: ${analysis.riskLevel}`);
  console.log(`📊 Confidence: ${analysis.confidence}%`);
  console.log(`💭 Reasoning: ${analysis.reasoning}`);

  // Performance test results
  console.log('\n⚡ Performance Tests');
  console.log('-----------------------------------');
  console.log(
    `📋 Selected tags: ${analysis.performanceTests.selectedTags.join(', ') || 'None'}`,
  );
  console.log(`💭 Reasoning: ${analysis.performanceTests.reasoning}`);

  // If running in CI, write the results to a JSON file
  if (process.env.CI === 'true') {
    const jsonOutput = {
      selectedTags: analysis.selectedTags,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      performanceTests: {
        selectedTags: analysis.performanceTests.selectedTags,
        reasoning: analysis.performanceTests.reasoning,
      },
    };
    writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  }
}
