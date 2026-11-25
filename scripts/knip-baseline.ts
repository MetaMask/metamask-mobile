#!/usr/bin/env tsx
/**
 * Knip baseline driver for the dead-code check.
 *
 * `knip` reports unused files, dependencies and unlisted imports, but gating
 * CI on a greenfield knip report would fail every branch. Instead of gating on
 * knip directly, this script gates on the DIFF between the current knip report
 * and the committed baseline in `knip-baseline.json` (same pattern as the
 * Extension's development/circular-deps.ts + circular-deps.jsonc).
 *
 * `yarn knip:check` runs `knip --reporter json`, compares against the baseline
 * and fails on NEW findings (as GitHub annotations when running in CI). It
 * also fails when baselined findings no longer appear, because the baseline
 * must be shrunk to stay meaningful: run `yarn knip:update` and commit the
 * result.
 *
 * `yarn knip:update` rewrites the baseline from the current report. It refuses
 * to GROW the baseline unless `--allow-grow` is passed, so a routine
 * `knip:update` cannot silently whitelist new dead code.
 *
 * Baseline entries are keyed by `<type>|<file>|<symbol>` with no line numbers,
 * so they survive unrelated edits and stay diff-friendly.
 *
 * Findings that are intentional should be suppressed in knip.config.ts
 * (entry/ignore/ignoreDependencies) with a reason comment — not grown into the
 * baseline.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASELINE_FILE = 'knip-baseline.json';

/** Issue type order for stable, human-readable output and baseline ordering. */
const ISSUE_TYPE_ORDER: readonly string[] = [
  'files',
  'dependencies',
  'devDependencies',
  'unlisted',
  'binaries',
  'unresolved',
  'exports',
  'nsExports',
  'types',
  'nsTypes',
  'duplicates',
  'enumMembers',
  'namespaceMembers',
  'subpaths',
  'optionalPeerDependencies',
  'catalog',
  'catalogReferences',
  'cycles',
];

const ISSUE_LABELS: Record<string, string> = {
  files: 'Unused files',
  dependencies: 'Unused dependencies',
  devDependencies: 'Unused devDependencies',
  unlisted: 'Unlisted dependencies',
  binaries: 'Unused binaries',
  unresolved: 'Unresolved imports',
  exports: 'Unused exports',
  nsExports: 'Unused exports (namespaces)',
  types: 'Unused types',
  nsTypes: 'Unused types (namespaces)',
  duplicates: 'Duplicate exports',
  enumMembers: 'Unused enum members',
  namespaceMembers: 'Unused namespace members',
  subpaths: 'Unused export subpaths',
  optionalPeerDependencies: 'Unused optional peer dependencies',
  catalog: 'Unused catalog entries',
  catalogReferences: 'Unused catalog references',
  cycles: 'Dependency cycles',
};

/** One flagged symbol as emitted by knip's JSON reporter. */
interface KnipIssueSymbol {
  name: string;
  line?: number;
  col?: number;
  pos?: number;
}

/**
 * A knip issue group: all issues found in one file, keyed by issue type. The
 * JSON reporter only emits the issue types that are configured to report.
 */
interface KnipIssueGroup {
  file: string;
  owners?: { name: string }[];
  files?: KnipIssueSymbol[];
  dependencies?: KnipIssueSymbol[];
  unlisted?: KnipIssueSymbol[];
  [issueType: string]: unknown;
}

interface NormalizedReport {
  entries: string[];
  linesByEntry: Map<string, number>;
}

interface ReportDiff {
  added: string[];
  removed: string[];
}

/**
 * Orders baseline entries by issue type (known types in `ISSUE_TYPE_ORDER`
 * first, unknown future types after them), then by code point so the order
 * does not depend on the machine's locale.
 *
 * @param a - Baseline-format entry.
 * @param b - Baseline-format entry.
 * @returns A negative, zero or positive number, as expected by `Array.sort`.
 */
export function compareEntries(a: string, b: string): number {
  const rank = (entry: string): number => {
    const index = ISSUE_TYPE_ORDER.indexOf(entry.split('|')[0]);
    return index === -1 ? ISSUE_TYPE_ORDER.length : index;
  };
  const byType = rank(a) - rank(b);
  if (byType !== 0) {
    return byType;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Normalizes the knip JSON report into baseline entries keyed by
 * `<type>|<file>|<symbol>` (no line numbers), plus a line-number lookup used
 * for GitHub annotations. A flagged file is its own symbol; every other issue
 * type is keyed by the file it was found in.
 *
 * @param groups - Issue groups as emitted by the knip JSON reporter.
 * @returns Baseline entries sorted with `compareEntries`, and their optional
 * line numbers.
 */
export function normalizeReport(groups: KnipIssueGroup[]): NormalizedReport {
  const entries = new Set<string>();
  const linesByEntry = new Map<string, number>();

  for (const group of groups) {
    const groupTypes = Object.keys(group).filter(
      (key) => key !== 'file' && key !== 'owners' && Array.isArray(group[key]),
    );

    for (const type of groupTypes) {
      for (const item of group[type] as KnipIssueSymbol[]) {
        if (!item?.name) {
          continue;
        }
        const entry =
          type === 'files' ? `${type}|${item.name}` : `${type}|${group.file}|${item.name}`;
        entries.add(entry);
        if (typeof item.line === 'number' && !linesByEntry.has(entry)) {
          linesByEntry.set(entry, item.line);
        }
      }
    }
  }

  return { entries: [...entries].sort(compareEntries), linesByEntry };
}

/**
 * Diffs the current report against the baseline entries.
 *
 * @param actual - Sorted baseline-format entries from the current report.
 * @param baseline - Sorted baseline-format entries from knip-baseline.json.
 * @returns Findings added to (new dead code) and removed from (fixed dead
 * code) the report since the baseline was written.
 */
export function diffFindings(actual: string[], baseline: string[]): ReportDiff {
  const baselineSet = new Set(baseline);
  const actualSet = new Set(actual);
  return {
    added: actual.filter((entry) => !baselineSet.has(entry)),
    removed: baseline.filter((entry) => !actualSet.has(entry)),
  };
}

/**
 * Formats one normalized entry for terminal output, e.g.
 * `files|app/foo.ts` → `app/foo.ts` and
 * `unlisted|app/foo.ts|pkg` → `pkg (in app/foo.ts)`. The `package.json` file
 * is treated as implicit for dependency findings.
 *
 * @param entry - Baseline-format entry.
 * @returns Human-readable description of the finding.
 */
export function formatEntry(entry: string): string {
  const [, ...rest] = entry.split('|');
  if (rest.length === 1) {
    return rest[0];
  }
  const file = rest.slice(0, -1).join('|');
  const symbol = rest[rest.length - 1];
  return file === 'package.json' ? symbol : `${symbol} (in ${file})`;
}

/**
 * Runs knip with the JSON reporter from the given repository root.
 *
 * @param repoRoot - Absolute path to the repository root.
 * @returns The parsed issue groups.
 * @throws When knip fails or emits output that is not valid JSON.
 */
export function runKnip(repoRoot: string): KnipIssueGroup[] {
  const knipBin = path.join(repoRoot, 'node_modules', '.bin', 'knip');
  const result = spawnSync(process.execPath, [knipBin, '--reporter', 'json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: process.env,
  });

  try {
    const parsed = JSON.parse(result.stdout ?? '') as { issues?: KnipIssueGroup[] };
    return Array.isArray(parsed.issues) ? parsed.issues : [];
  } catch {
    throw new Error(
      `knip did not produce valid JSON output (exit code ${result.status}).\n${result.stderr ?? ''}`,
    );
  }
}

/**
 * Reads the committed baseline. A missing file is treated as empty so the
 * first `yarn knip:update` can create it.
 *
 * @param baselinePath - Absolute path to knip-baseline.json.
 * @returns Baseline entries.
 */
export function readBaseline(baselinePath: string): string[] {
  if (!fs.existsSync(baselinePath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as {
    entries?: string[];
  };
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`Unexpected format in ${baselinePath}`);
  }
  return parsed.entries;
}

/**
 * Writes the baseline file with a fixed shape so diffs stay minimal.
 *
 * @param baselinePath - Absolute path to knip-baseline.json.
 * @param entries - Sorted baseline entries.
 */
export function writeBaseline(baselinePath: string, entries: string[]): void {
  const contents = {
    '//': [
      'Machine-generated by `yarn knip:update` (scripts/knip-baseline.ts); do not edit by hand.',
      'Each entry is "<type>|<file>|<symbol>". New knip findings fail `yarn knip:check`;',
      'shrink this file by fixing the findings and running `yarn knip:update`.',
      'Suppress intentional findings in knip.config.ts with a reason comment instead.',
    ].join(' '),
    entries: [...entries].sort(compareEntries),
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(contents, null, 2)}\n`);
}

/**
 * Prints findings grouped by issue type and emits GitHub error annotations
 * (rendered on the PR when run from GitHub Actions). Narrative output goes to
 * stderr; workflow commands go to stdout, the only stream the runner reliably
 * parses.
 *
 * @param entries - Sorted baseline-format entries to report.
 * @param linesByEntry - Entry to line-number lookup from the current report.
 */
export function printFindings(entries: string[], linesByEntry: Map<string, number>): void {
  const grouped = new Map<string, { entry: string; file: string; symbol: string }[]>();
  for (const entry of entries) {
    const [type, ...rest] = entry.split('|');
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    const symbol = rest[rest.length - 1];
    const file = type === 'files' ? symbol : rest.slice(0, -1).join('|');
    grouped.get(type)?.push({ entry, file, symbol });
  }

  for (const [type, items] of grouped) {
    console.error(`\n${ISSUE_LABELS[type] ?? type} (${items.length}):`);
    for (const { entry, file, symbol } of items) {
      console.error(`  ${symbol}${file !== symbol ? ` (in ${file})` : ''}`);
      const line = linesByEntry.get(entry);
      if (process.env.GITHUB_ACTIONS === 'true') {
        const lineSuffix = line ? `,line=${line}` : '';
        process.stdout.write(
          `::error file=${file}${lineSuffix},title=Knip: ${ISSUE_LABELS[type] ?? type}::${symbol}\n`,
        );
      }
    }
  }
}

/**
 * Compares the current knip report against the baseline and exits non-zero on
 * any difference in either direction.
 *
 * @param repoRoot - Absolute path to the repository root.
 */
function check(repoRoot: string): void {
  const { entries: actual, linesByEntry } = normalizeReport(runKnip(repoRoot));
  const baseline = readBaseline(path.join(repoRoot, BASELINE_FILE));
  const { added, removed } = diffFindings(actual, baseline);

  if (added.length === 0 && removed.length === 0) {
    console.log(
      `knip:check passed — ${actual.length} known finding${actual.length === 1 ? '' : 's'} match the baseline.`,
    );
    return;
  }

  if (added.length > 0) {
    console.error(
      `\n${added.length} new dead-code finding${added.length === 1 ? '' : 's'} (not in ${BASELINE_FILE}):`,
    );
    printFindings(added, linesByEntry);
    console.error(
      '\nFix the finding(s) (preferred), or suppress intentional cases in knip.config.ts (with a reason comment).\n' +
        'Only if growing the baseline is genuinely intended, run `yarn knip:update --allow-grow` and commit the change.',
    );
  }

  if (removed.length > 0) {
    console.error(
      `\n${removed.length} baselined finding${removed.length === 1 ? '' : 's'} no longer reported (thank you for fixing them!):`,
    );
    for (const entry of removed) {
      console.error(`  ${formatEntry(entry)}`);
    }
    console.error(
      `\nThe baseline must be shrunk to stay in sync: run \`yarn knip:update\` and commit the change.`,
    );
  }

  process.exit(1);
}

/**
 * Regenerates the baseline from the current knip report. Refuses to grow the
 * baseline unless explicitly allowed.
 *
 * @param repoRoot - Absolute path to the repository root.
 * @param allowGrow - Whether growing the baseline is allowed.
 */
function update(repoRoot: string, allowGrow: boolean): void {
  const baselinePath = path.join(repoRoot, BASELINE_FILE);
  const { entries: actual } = normalizeReport(runKnip(repoRoot));
  const baseline = readBaseline(baselinePath);
  const { added, removed } = diffFindings(actual, baseline);

  if (added.length > 0 && !allowGrow) {
    console.error(
      `\nRefusing to grow ${BASELINE_FILE} with ${added.length} new finding${added.length === 1 ? '' : 's'}:`,
    );
    for (const entry of added) {
      console.error(`  ${formatEntry(entry)}`);
    }
    console.error(
      '\nFix the finding(s), or suppress intentional cases in knip.config.ts (with a reason comment).',
      'Only if the growth is genuinely intended, re-run with: yarn knip:update --allow-grow',
    );
    process.exit(1);
  }

  writeBaseline(baselinePath, actual);
  console.log(
    `Wrote ${actual.length} finding${actual.length === 1 ? '' : 's'} to ${BASELINE_FILE} (${added.length} added, ${removed.length} removed).`,
  );
}

/**
 * CLI entry point.
 *
 * @param argv - Command-line arguments (after node/tsx and the script path).
 */
function main(argv: string[]): void {
  const command = argv[0];
  const allowGrow = argv.includes('--allow-grow');
  const repoRoot = path.resolve(__dirname, '..');

  if (command === 'check') {
    check(repoRoot);
  } else if (command === 'update') {
    update(repoRoot, allowGrow);
  } else {
    console.error('Usage: tsx scripts/knip-baseline.ts [check|update] [--allow-grow]');
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}
