/**
 * Output Formatting Utilities
 *
 * Formats analysis results for different output modes (default, json, tags)
 */

import { AIAnalysis, FileCategorization, ParsedArgs } from '../types';

/**
 * Formats and outputs the analysis results based on the output mode
 */
export function formatAndOutput(
  analysis: AIAnalysis,
  options: ParsedArgs,
  categorization: FileCategorization
): void {
  if (options.output === 'json') {
    outputJSON(analysis, categorization);
  } else if (options.output === 'tags') {
    outputTags(analysis);
  } else {
    outputDefault(analysis);
  }
}

/**
 * Outputs results in JSON format for CI/CD consumption
 */
function outputJSON(
  analysis: AIAnalysis,
  categorization: FileCategorization
): void {
  console.log(
    JSON.stringify(
      {
        selectedTags: analysis.selectedTags,
        riskLevel: analysis.riskLevel,
        totalSplits: analysis.totalSplits,
        testFileBreakdown: analysis.testFileInfo?.map(info => ({
          tag: info.tag,
          fileCount: info.fileCount,
          recommendedSplits: info.recommendedSplits
        })),
        changedFiles: {
          total: categorization.allFiles.length,
          relevant: categorization.allFiles.length,
          filteredOut: 0
        },
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      },
      null,
      2
    )
  );
}

/**
 * Outputs only the selected tags (one per line) for easy parsing
 */
function outputTags(analysis: AIAnalysis): void {
  console.log(analysis.selectedTags.join('\n'));
}

/**
 * Outputs human-readable format with all details
 */
function outputDefault(analysis: AIAnalysis): void {
  console.log('🤖 AI E2E Tag Selector');
  console.log('===================================');
  console.log(`🎯 Risk level: ${analysis.riskLevel}`);
  console.log(
    `✅ Selected ${analysis.selectedTags.length} tags: ${analysis.selectedTags.join(', ')}`
  );
  console.log(`📊 Confidence: ${analysis.confidence}%`);
  console.log(`💭 Reasoning: ${analysis.reasoning}`);

  if (analysis.testFileInfo && analysis.totalSplits) {
    console.log(`\n📈 Test File Analysis:`);
    analysis.testFileInfo.forEach(info => {
      console.log(
        `   ${info.tag}: ${info.fileCount} files → ${info.recommendedSplits} splits`
      );
    });
    console.log(`🔢 Total splits: ${analysis.totalSplits}`);
  }
}

/**
 * Simple log function that respects quiet mode
 */
export function createLogger(isQuiet: boolean) {
  return (message: string): void => {
    if (!isQuiet) {
      console.log(message);
    }
  };
}
