/**
 * MODE: missing-test - Result Handlers
 *
 * Processes finalize_missing_e2e_tests tool output and outputs E2E test suggestions.
 */

import { writeFileSync } from 'node:fs';
import { MissingTestAnalysis } from '../../types';

export function createEmptyResult(): MissingTestAnalysis {
  return {
    test_suggestions: [],
  };
}

export async function processAnalysis(
  aiResponse: string,
  _baseDir: string,
): Promise<MissingTestAnalysis | null> {
  const jsonMatch = aiResponse.match(/\{[\s\S]*"test_suggestions"[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.test_suggestions)) {
      return null;
    }

    return {
      test_suggestions: parsed.test_suggestions,
    };
  } catch {
    return null;
  }
}

export function createConservativeResult(): MissingTestAnalysis {
  return {
    test_suggestions: [],
  };
}

export function outputAnalysis(analysis: MissingTestAnalysis): void {
  const outputFile = 'e2e-test-suggestions.json';

  console.log('\n============================================');
  console.log('   E2E Test Suggestions');
  console.log('============================================\n');

  if (analysis.test_suggestions.length > 0) {
    console.log('\nTest Suggestions:\n');
    analysis.test_suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
      console.log('');
    });
  }

  if (process.env.CI === 'true') {
    writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`Results written to ${outputFile}`);
  }
}
