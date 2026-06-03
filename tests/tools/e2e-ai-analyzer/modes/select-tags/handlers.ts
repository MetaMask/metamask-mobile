/**
 * Mode-specific logic for processing analysis results and creating fallbacks
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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
  getChangedSharedInfraFiles,
  isSpecFile,
  SPEC_PATH_PREFIXES,
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
 * Intermediate test directories — page-objects, flows, selectors, locators.
 * Changes here can chain through to spec files via one-hop imports.
 */
const INTERMEDIATE_TEST_DIRS = [
  'tests/page-objects/',
  'tests/flows/',
  'tests/selectors/',
  'tests/locators/',
] as const;

/**
 * Finds smoke/regression spec files that import a given file, resolving up to
 * one level of indirection through intermediate utility/flow/page-object files.
 *
 * Example: wallet.flow.ts → imported by 30 spec files (direct)
 * Example: TokenSelectors.ts → imported by TokenPage.ts → imported by token specs
 *
 * Uses execFileSync with an argument array (no shell) to avoid command injection.
 * Uses -F (fixed-string) so file stem is matched literally, not as a regex.
 */
function findSpecFilesImporting(
  changedFile: string,
  baseDir: string,
): string[] {
  const stem =
    changedFile
      .split('/')
      .pop()
      ?.replace(/\.(ts|tsx|js|jsx)$/, '') ?? '';
  if (!stem) return [];

  // Prefix with '/' so we match import paths (e.g. from './TokenSelectors')
  // rather than arbitrary occurrences of the stem in comments or variable names.
  const importPattern = `/${stem}`;

  const grepInDirs = (pattern: string, dirs: readonly string[]): string[] => {
    try {
      return execFileSync(
        'grep',
        [
          '-r',
          '-l',
          '-F',
          '--include=*.ts',
          '--include=*.tsx',
          '--include=*.js',
          '--include=*.jsx',
          pattern,
          ...dirs,
        ],
        { encoding: 'utf-8', cwd: baseDir },
      )
        .trim()
        .split('\n')
        .filter(Boolean);
    } catch {
      // grep exits non-zero when no matches found
      return [];
    }
  };

  // Step 1: find importers in spec dirs AND intermediate dirs (page-objects, flows, etc.)
  const allTestDirs = [
    ...SPEC_PATH_PREFIXES,
    ...INTERMEDIATE_TEST_DIRS,
  ] as const;
  const directImporters = grepInDirs(importPattern, allTestDirs);
  const specFiles = directImporters.filter(isSpecFile);
  const utilImporters = directImporters.filter((f) => !isSpecFile(f));

  // Step 2: one hop — find spec files that import the intermediate files
  for (const util of utilImporters) {
    const utilStem =
      util
        .split('/')
        .pop()
        ?.replace(/\.(ts|tsx|js|jsx)$/, '') ?? '';
    if (!utilStem) continue;
    const indirect = grepInDirs(`/${utilStem}`, SPEC_PATH_PREFIXES).filter(
      isSpecFile,
    );
    specFiles.push(...indirect);
  }

  return Array.from(new Set(specFiles));
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
    const content = readFileSync(path.join(baseDir, filePath), 'utf-8');
    const matches = content.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/tags(?:\.js)?['"]/g,
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
    name: 'test-shared-infra-impact',
    description:
      'Changes to flows, page-objects, selectors, or locators — find impacted smoke/regression specs and run their tags',
    check: (changedFiles, context) => {
      const infraFiles = getChangedSharedInfraFiles(changedFiles);
      if (infraFiles.length === 0) return null;

      // Only apply when all changes are within tests/ — app changes go to AI
      const hasNonTestChanges = changedFiles.some(
        (f) => !f.startsWith('tests/'),
      );
      if (hasNonTestChanges) return null;

      const validTags = new Set(SELECT_TAGS_CONFIG.map((c) => c.tag));

      // Find spec files transitively affected by the infra changes
      const affectedSpecFiles = Array.from(
        new Set(
          infraFiles.flatMap((f) => findSpecFilesImporting(f, context.baseDir)),
        ),
      );

      // Also include any spec files that were directly changed in the same PR
      const directlyChangedSpecFiles = getChangedSpecFiles(changedFiles);

      const allSpecFiles = Array.from(
        new Set([...affectedSpecFiles, ...directlyChangedSpecFiles]),
      );

      const selectedTags = Array.from(
        new Set(
          allSpecFiles.flatMap((f) =>
            extractTagsFromSpecFile(f, context.baseDir, validTags),
          ),
        ),
      );

      console.log(`   Changed shared infra files (${infraFiles.length}):`);
      infraFiles.forEach((f) => console.log(`     - ${f}`));
      console.log(`   Affected spec files (${affectedSpecFiles.length}):`);
      affectedSpecFiles.forEach((f) => console.log(`     - ${f}`));

      if (selectedTags.length === 0) {
        console.log(
          '   No Detox spec files import these files — falling through to next rule.',
        );
        // Bug 4 fix: return null so test-spec-tag-extraction can handle directly-changed specs
        return null;
      }

      console.log(`   Extracted tags: ${selectedTags.join(', ')}`);
      return {
        selectedTags,
        riskLevel: 'medium',
        confidence: 92,
        reasoning: `Shared test infra changed (${infraFiles.join(', ')}). Found ${affectedSpecFiles.length} affected spec file(s). Running tags: ${selectedTags.join(', ')}`,
        performanceTests: {
          selectedTags: [],
          reasoning: 'No performance impact from shared test infra changes',
        },
      };
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
      return result;
    }
  }
  return null;
}

// Regex for performance spec files (e.g. tests/performance/login/eth-swap-flow.spec.ts)
const PERF_SPEC_REGEX = /^tests\/performance\/.+\.spec\.ts$/;
// Non-spec files under tests/performance/ or tests/framework/ that performance tests depend on
const PERF_INFRA_REGEX = /^tests\/(performance|framework)\//;

/**
 * Parses a spec file's content and returns the @Performance* area tags it imports.
 * E.g. `import { PerformanceSwaps } from '../../tags.performance.js'` → ['@PerformanceSwaps']
 */
function extractTagsFromSpecContent(content: string): string[] {
  const importPattern =
    /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*tags\.performance[^'"]*['"]/g;
  const tags: string[] = [];

  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      // Only keep area tags like PerformanceSwaps, not the base Performance or System tags
      .filter((n) => /^Performance[A-Z]/.test(n));
    tags.push(...names.map((n) => `@${n}`));
  }

  return [...new Set(tags)];
}

/**
 * Deterministically detects which performance tests should run based on directly
 * changed files — bypassing AI for two clear-cut cases:
 *
 * 1. A performance **spec file** changed → run that spec's specific tags.
 * 2. A performance **infrastructure file** changed (page-objects, flows, framework
 * helpers used by perf tests) → run all performance tags conservatively, because
 * shared utilities can affect every scenario.
 *
 * Returns null when no performance-test-related files are changed.
 */
export function detectDirectPerformanceChanges(
  changedFiles: string[],
  baseDir: string,
): PerformanceTestSelection | null {
  const changedSpecFiles = changedFiles.filter((f) => PERF_SPEC_REGEX.test(f));
  const changedInfraFiles = changedFiles.filter(
    (f) => !PERF_SPEC_REGEX.test(f) && PERF_INFRA_REGEX.test(f),
  );

  if (changedSpecFiles.length === 0 && changedInfraFiles.length === 0) {
    return null;
  }

  const allPerfTags = PERFORMANCE_TAGS_CONFIG.map((c) => c.tag);
  const selectedTags: string[] = [];
  const reasons: string[] = [];

  // Case 1: spec file changes — extract their specific tags
  if (changedSpecFiles.length > 0) {
    const unreadableFiles: string[] = [];
    for (const specFile of changedSpecFiles) {
      try {
        const content = readFileSync(path.join(baseDir, specFile), 'utf-8');
        const fileTags = extractTagsFromSpecContent(content).filter((t) =>
          allPerfTags.includes(t),
        );
        if (fileTags.length > 0) {
          selectedTags.push(...fileTags);
        } else {
          // File readable but no tags found (e.g. deleted spec, or unusual format);
          // run all perf tags to be safe
          unreadableFiles.push(specFile);
        }
      } catch {
        // File not accessible (e.g. deleted); run all perf tags conservatively
        unreadableFiles.push(specFile);
      }
    }
    if (unreadableFiles.length > 0) {
      selectedTags.push(...allPerfTags);
      reasons.push(
        `Changed spec files (unreadable/deleted, running all): ${unreadableFiles.map((f) => path.basename(f)).join(', ')}`,
      );
    }
    const readableChanged = changedSpecFiles.filter(
      (f) => !unreadableFiles.includes(f),
    );
    if (readableChanged.length > 0 && selectedTags.length > 0) {
      reasons.push(
        `Changed spec files: ${readableChanged.map((f) => path.basename(f)).join(', ')}`,
      );
    }
  }

  // Case 2: infrastructure changes — conservative: run all performance tags
  if (changedInfraFiles.length > 0) {
    selectedTags.push(...allPerfTags);
    const shown = changedInfraFiles.slice(0, 3).map((f) => path.basename(f));
    const extra =
      changedInfraFiles.length > 3
        ? ` (+${changedInfraFiles.length - 3} more)`
        : '';
    reasons.push(
      `Changed shared performance infrastructure: ${shown.join(', ')}${extra} — running all tags conservatively`,
    );
  }

  const uniqueTags = [...new Set(selectedTags)];
  if (uniqueTags.length === 0) {
    return null;
  }

  console.log(`\n📌 Deterministic performance test detection:`);
  reasons.forEach((r) => console.log(`   ${r}`));
  console.log(`   Tags: ${uniqueTags.join(', ')}`);

  return {
    selectedTags: uniqueTags,
    reasoning: reasons.join('. '),
  };
}

interface AppCodePerfTagEntry {
  patterns: RegExp[];
  tags: string[];
  description: string;
}

/**
 * Maps app source paths to performance test tags.
 * When changed files match a pattern, the listed tags are automatically triggered.
 */
const APP_CODE_TO_PERF_TAG_MAP: AppCodePerfTagEntry[] = [
  {
    patterns: [
      /^app\/components\/UI\/Bridge\//,
      /^app\/reducers\/swaps/,
      /^app\/selectors\/swaps/,
    ],
    tags: ['@PerformanceSwaps'],
    description: 'Swap/Bridge UI or state',
  },
  {
    patterns: [
      /^app\/components\/Views\/AccountSelector\//,
      /^app\/component-library\/components-temp\/MultichainAccounts\/MultichainAccountSelectorList\//,
    ],
    tags: ['@PerformanceAccountList'],
    description: 'Account selector or multichain account list',
  },
  {
    patterns: [
      /^app\/core\/Engine\/controllers\/assets-controller\//,
      /^app\/core\/Engine\/controllers\/multichain-balances-controller\//,
    ],
    tags: ['@PerformanceAssetLoading'],
    description: 'Asset or balance controller',
  },
  {
    patterns: [
      /^app\/components\/UI\/Perps\//,
      /^app\/components\/Views\/Homepage\/Sections\/Perpetuals\//,
      /^app\/core\/Engine\/controllers\/perps-controller\//,
    ],
    tags: ['@PerformancePreps'],
    description: 'Perps UI or controller',
  },
  {
    patterns: [
      /^app\/components\/UI\/Predict\//,
      /^app\/core\/Engine\/controllers\/predict-controller\//,
    ],
    tags: ['@PerformancePredict'],
    description: 'Predict UI or controller',
  },
  {
    patterns: [/^app\/core\/LockManagerService\//],
    tags: ['@PerformanceLogin', '@PerformanceLaunch'],
    description: 'Lock manager / login-launch flow',
  },
];

/**
 * Deterministically maps changed app source files to performance test tags.
 *
 * This complements detectDirectPerformanceChanges — that function handles changes
 * to test files themselves; this one handles changes to app/ source code that
 * can regress specific performance scenarios.
 *
 * Returns null when no changed files match any mapped pattern.
 */
export function detectAppCodePerformanceChanges(
  changedFiles: string[],
): PerformanceTestSelection | null {
  const selectedTags: string[] = [];
  const reasons: string[] = [];

  for (const entry of APP_CODE_TO_PERF_TAG_MAP) {
    const matchingFiles = changedFiles.filter((f) =>
      entry.patterns.some((p) => p.test(f)),
    );
    if (matchingFiles.length > 0) {
      selectedTags.push(...entry.tags);
      const shown = matchingFiles.slice(0, 2).map((f) => path.basename(f));
      const extra =
        matchingFiles.length > 2 ? ` (+${matchingFiles.length - 2} more)` : '';
      reasons.push(
        `${entry.description}: ${shown.join(', ')}${extra} → ${entry.tags.join(', ')}`,
      );
    }
  }

  const uniqueTags = [...new Set(selectedTags)];
  if (uniqueTags.length === 0) {
    return null;
  }

  console.log(`\n🗺️  App code → performance tag mapping:`);
  reasons.forEach((r) => console.log(`   ${r}`));
  console.log(`   Tags: ${uniqueTags.join(', ')}`);

  return {
    selectedTags: uniqueTags,
    reasoning: `App code changes trigger performance tests: ${reasons.join('. ')}`,
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
