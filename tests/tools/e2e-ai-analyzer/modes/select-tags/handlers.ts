/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SelectTagsAnalysis,
  PerformanceTestSelection,
  AnalysisContext,
  HardRule,
} from '../../types';
import { getFileDiff, getPRFileDiff } from '../../utils/git-utils';
import { smokeTags, flaskTags } from '../../../../tags';
import { performanceTags } from '../../../../tags.performance';
import { getGlobalInfrastructureHardRuleReason } from './global-infrastructure-paths';
import {
  getFrameworkInfraChanges,
  getChangedSpecFiles,
} from './test-infrastructure-paths';

/**
 * Derive AI config from smokeTags and flaskTags
 * Converts tags objects to array format for AI
 */
const allTags = { ...smokeTags, ...flaskTags };

export const SELECT_TAGS_CONFIG = Object.values(allTags).map((config) => ({
  tag: config.tag.replace(':', ''), // Remove trailing colon for AI
  description: config.description,
}));

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
 * Helper: gets the package.json diff lines (added/removed only).
 * Returns empty array if package.json is not in the changed files.
 */
function getPackageJsonDiffLines(
  changedFiles: string[],
  context: AnalysisContext,
): string[] {
  if (!changedFiles.includes('package.json')) {
    return [];
  }

  const diff =
    context.prNumber && context.githubRepo
      ? getPRFileDiff(context.prNumber, context.githubRepo, 'package.json')
      : getFileDiff('package.json', context.baseBranch, context.baseDir);

  return diff
    .split('\n')
    .filter(
      (line) =>
        (line.startsWith('+') || line.startsWith('-')) &&
        !line.startsWith('+++') &&
        !line.startsWith('---'),
    );
}

/**
 * Hard rules for the select-tags mode.
 *
 * Each rule overrides AI analysis and forces all tests to run.
 * If a rule's `check` returns a non-null string, that string becomes the reason
 * and all subsequent rules are skipped.
 *
 * To add a new hard rule, append an entry to this array.
 */
/**
 * Wraps a reason string into a conservative (run-all) SelectTagsAnalysis.
 */
function makeConservativeResult(
  ruleName: string,
  reason: string,
): SelectTagsAnalysis {
  const result = createConservativeResult();
  const fullReason = `Hard rule (${ruleName}): ${reason}. Running all tests.`;
  result.reasoning = fullReason;
  result.confidence = 100;
  result.performanceTests.reasoning = fullReason;
  return result;
}

/**
 * Extracts Detox tag names imported in a spec file.
 * Tags are imported as named exports from the tags module.
 */
function extractTagsFromSpecFile(
  filePath: string,
  baseDir: string,
  validTags: Set<string>,
): string[] {
  try {
    const content = readFileSync(join(baseDir, filePath), 'utf-8');
    const matches = content.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/tags['"]/g,
    );
    const found: string[] = [];
    for (const match of matches) {
      const names = match[1].split(',').map((n) => n.trim());
      for (const name of names) {
        if (validTags.has(name)) {
          found.push(name);
        }
      }
    }
    return found;
  } catch {
    return [];
  }
}

const HARD_RULES: HardRule[] = [
  {
    name: 'controller-version-update',
    description: '@metamask controller package version updated in package.json',
    check: (changedFiles, context) => {
      const diffLines = getPackageJsonDiffLines(changedFiles, context);
      if (diffLines.length === 0) return null;

      // e.g. "@metamask/accounts-controller": "^22.0.0"
      const controllerPattern = /@metamask\/[^"]*controller[^"]*"/i;
      const packageNamePattern = /@metamask\/[^"]*controller[^"]*/i;
      const matchingLines = diffLines.filter((line) =>
        controllerPattern.test(line),
      );
      if (matchingLines.length === 0) return null;

      const updatedControllers = Array.from(
        new Set(
          matchingLines
            .map((line) => line.match(packageNamePattern)?.[0])
            .filter((name): name is string => Boolean(name)),
        ),
      );

      console.log(`   Updated controllers (${updatedControllers.length}):`);
      updatedControllers.forEach((pkg) => console.log(`     - ${pkg}`));

      const reason = `@metamask controller package version updated in package.json: ${updatedControllers.join(', ')}`;
      return makeConservativeResult('controller-version-update', reason);
    },
  },
  {
    name: 'global-infrastructure-change',
    description:
      'Changes to globally-mounted hooks, contexts, Redux store, or Engine wiring',
    check: (changedFiles) => {
      const reason = getGlobalInfrastructureHardRuleReason(changedFiles);
      return reason
        ? makeConservativeResult('global-infrastructure-change', reason)
        : null;
    },
  },
  {
    name: 'test-framework-infra-change',
    description:
      'Changes to tests/framework/ shared utilities (Assertions, Gestures, Matchers, etc.) used by virtually all specs',
    check: (changedFiles) => {
      const infraFiles = getFrameworkInfraChanges(changedFiles);
      if (infraFiles.length === 0) return null;
      const reason = `Test framework infrastructure changed: ${infraFiles.join(', ')}`;
      return makeConservativeResult('test-framework-infra-change', reason);
    },
  },
  {
    name: 'test-spec-tag-extraction',
    description:
      'Spec files in tests/smoke/ or tests/regression/ changed — extract their tags and run directly',
    check: (changedFiles, context) => {
      const specFiles = getChangedSpecFiles(changedFiles);
      if (specFiles.length === 0) return null;

      // If any non-test files changed, let AI handle the full picture
      const hasNonTestChanges = changedFiles.some(
        (f) => !f.startsWith('tests/'),
      );
      if (hasNonTestChanges) return null;

      const validTags = new Set(SELECT_TAGS_CONFIG.map((c) => c.tag));
      const selectedTags = Array.from(
        new Set(
          specFiles.flatMap((f) =>
            extractTagsFromSpecFile(f, context.baseDir, validTags),
          ),
        ),
      );

      if (selectedTags.length === 0) {
        // Tags couldn't be extracted — fall through to AI
        return null;
      }

      console.log(`   Changed spec files (${specFiles.length}):`);
      specFiles.forEach((f) => console.log(`     - ${f}`));
      console.log(`   Extracted tags: ${selectedTags.join(', ')}`);

      return {
        selectedTags,
        riskLevel: 'medium',
        confidence: 95,
        reasoning: `Hard rule (test-spec-tag-extraction): Spec files changed directly. Running their associated tags: ${selectedTags.join(', ')}`,
        performanceTests: {
          selectedTags: [],
          reasoning: 'No performance impact from spec-only changes',
        },
      };
    },
  },
];

/**
 * Evaluates all hard rules for the select-tags mode.
 * Returns the first non-null result, skipping AI analysis entirely.
 */
export function checkHardRules(
  changedFiles: string[],
  context: AnalysisContext,
): SelectTagsAnalysis | null {
  for (const rule of HARD_RULES) {
    const result = rule.check(changedFiles, context);
    if (result) {
      console.log(`🚨 Hard rule triggered: ${rule.name}`);
      console.log(`   ${result.reasoning}`);
      return result;
    }
  }
  return null;
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
