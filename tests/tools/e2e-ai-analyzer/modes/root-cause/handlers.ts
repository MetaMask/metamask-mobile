/**
 * Mode-specific logic for root cause analysis results
 */

import { writeFileSync } from 'node:fs';
import { RootCauseAnalysis } from '../../types';

/**
 * Creates an empty result when no analysis is needed
 */
export function createEmptyResult(): RootCauseAnalysis {
  return {
    summary: 'No issue provided for analysis',
    regressionPRs: [],
    errorFlow: '',
    scopeOfImpact: [],
    suggestedFix: '',
    confidence: 0,
    reasoning: 'No issue data available',
  };
}

/**
 * Processes AI response: parses JSON from finalize_root_cause tool call
 */
export async function processAnalysis(
  aiResponse: string,
  _baseDir: string,
): Promise<RootCauseAnalysis | null> {
  const jsonMatch = aiResponse.match(/\{[\s\S]*"summary"[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.summary || !parsed.reasoning) {
      return null;
    }

    return {
      summary: parsed.summary,
      regressionPRs: Array.isArray(parsed.regression_prs)
        ? parsed.regression_prs.map(
            (pr: {
              number?: number;
              title?: string;
              author?: string;
              explanation?: string;
            }) => ({
              number: pr.number || 0,
              title: pr.title || '',
              author: pr.author || '',
              explanation: pr.explanation || '',
            }),
          )
        : [],
      errorFlow: parsed.error_flow || '',
      scopeOfImpact: Array.isArray(parsed.scope_of_impact)
        ? parsed.scope_of_impact.map(
            (item: {
              file?: string;
              lines?: string;
              description?: string;
            }) => ({
              file: item.file || '',
              lines: item.lines || '',
              description: item.description || '',
            }),
          )
        : [],
      suggestedFix: parsed.suggested_fix || '',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback when AI analysis fails
 */
export function createConservativeResult(): RootCauseAnalysis {
  return {
    summary:
      'Unable to determine root cause — AI analysis did not complete successfully',
    regressionPRs: [],
    errorFlow: '',
    scopeOfImpact: [],
    suggestedFix: '',
    confidence: 0,
    reasoning:
      'Fallback: AI analysis did not complete successfully. Manual investigation is recommended.',
  };
}

/**
 * Outputs analysis results to console and JSON file in CI
 */
export function outputAnalysis(analysis: RootCauseAnalysis): void {
  const outputFile = 'root-cause-analysis.json';

  console.log('\n🔍 Root Cause Analysis');
  console.log('===================================');
  console.log(`📋 Summary: ${analysis.summary}`);
  console.log(`📊 Confidence: ${analysis.confidence}%`);

  if (analysis.regressionPRs.length > 0) {
    console.log('\n🔗 Likely Regression PRs:');
    analysis.regressionPRs.forEach((pr) => {
      console.log(`   #${pr.number} - ${pr.title} by ${pr.author}`);
      console.log(`     ${pr.explanation}`);
    });
  }

  if (analysis.errorFlow) {
    console.log(`\n🔄 Error Flow: ${analysis.errorFlow}`);
  }

  if (analysis.scopeOfImpact.length > 0) {
    console.log('\n📁 Scope of Impact:');
    analysis.scopeOfImpact.forEach((item) => {
      console.log(`   ${item.file}:${item.lines} — ${item.description}`);
    });
  }

  if (analysis.suggestedFix) {
    console.log(`\n💡 Suggested Fix: ${analysis.suggestedFix}`);
  }

  console.log(`\n💭 Reasoning: ${analysis.reasoning}`);

  // Write JSON output in CI
  if (process.env.CI === 'true') {
    writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Results written to ${outputFile}`);
  }
}
