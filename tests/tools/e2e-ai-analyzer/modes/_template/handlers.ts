/**
 * ============================================
 * MODE: [YOUR-MODE-NAME] - Result Handlers
 * ============================================
 *
 * TEAM: _______________
 *
 * INSTRUCTIONS:
 * 1. Define your output interface (what data you want back)
 * 2. Implement the processing functions
 * 3. Customize console output
 */

import { writeFileSync } from 'node:fs';

/**
 * ============================================
 * STEP 1: Define your output structure
 * ============================================
 *
 * What data do you want the AI to return?
 *
 * Examples for different modes:
 *
 * suggest-selectors:
 * { suggestions: [{file, current, suggested, reason}], count }
 *
 * analyze-flaky:
 * { flakyTests: [{name, reason, frequency}], patterns: [] }
 *
 * generate-test-ideas:
 * { testIdeas: [{title, description, priority}], coverage: [] }
 */
export interface YourModeAnalysis {
  // [ADD YOUR FIELDS HERE]
  // Example fields:
  items: {
    file: string;
    issue: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  totalFound: number;
  confidence: number;
  summary: string;
}

/**
 * ============================================
 * STEP 2: Empty result (when no files to analyze)
 * ============================================
 */
export function createEmptyResult(): YourModeAnalysis {
  return {
    items: [],
    totalFound: 0,
    confidence: 100,
    summary: 'No relevant files found to analyze',
  };
}

/**
 * ============================================
 * STEP 3: Process AI response
 * ============================================
 *
 * Parse the JSON from the AI's finalize tool call.
 * Match the field names you defined above.
 */
export async function processAnalysis(
  aiResponse: string,
  _baseDir: string,
): Promise<YourModeAnalysis | null> {
  // Look for JSON in the AI response
  // [CHANGE "items" to match your main field name]
  const jsonMatch = aiResponse.match(/\{[\s\S]*"items"[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // [VALIDATE YOUR REQUIRED FIELDS]
    if (!Array.isArray(parsed.items) || !parsed.summary) {
      return null;
    }

    return {
      items: parsed.items,
      totalFound: parsed.total_found || parsed.items.length,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
}

/**
 * ============================================
 * STEP 4: Fallback result (when AI fails)
 * ============================================
 */
export function createConservativeResult(): YourModeAnalysis {
  return {
    items: [],
    totalFound: 0,
    confidence: 0,
    summary: 'AI analysis did not complete. Manual review recommended.',
  };
}

/**
 * ============================================
 * STEP 5: Output to console and file
 * ============================================
 *
 * Customize how results are displayed.
 */
export function outputAnalysis(analysis: YourModeAnalysis): void {
  // [CHANGE THE OUTPUT FILE NAME]
  const outputFile = 'e2e-your-mode-results.json';

  // [CUSTOMIZE THE CONSOLE OUTPUT]
  console.log('\n============================================');
  console.log('   [YOUR MODE NAME] Results');
  console.log('============================================\n');

  console.log(`Total found: ${analysis.totalFound}`);
  console.log(`Confidence: ${analysis.confidence}%`);
  console.log(`Summary: ${analysis.summary}`);

  if (analysis.items.length > 0) {
    console.log('\nFindings:\n');

    analysis.items.forEach((item, index) => {
      // Severity icons
      const icon =
        item.severity === 'high'
          ? '[HIGH]'
          : item.severity === 'medium'
            ? '[MED]'
            : '[LOW]';

      console.log(`${index + 1}. ${icon} ${item.file}`);
      console.log(`   Issue: ${item.issue}`);
      console.log(`   Suggestion: ${item.suggestion}`);
      console.log('');
    });
  }

  // Write to file in CI
  if (process.env.CI === 'true') {
    writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`Results written to ${outputFile}`);
  }
}
