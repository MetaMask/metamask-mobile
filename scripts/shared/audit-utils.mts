/**
 * Shared types, constants, and helpers for the yarn audit pipeline.
 *
 * Used by:
 *   - yarn-audit-and-triage.mts  (CI triage step)
 *   - yarn-audit-local.mts       (local DX wrapper, `yarn audit`)
 */

import { existsSync, readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// File paths (all under .tmp/ which is git-ignored)
// ---------------------------------------------------------------------------

export const AUDIT_BASELINE_FILE = '.tmp/audit-baseline.json';
export const AUDIT_CURRENT_FILE = '.tmp/audit-current.json';
export const AUDIT_RAW_PROD = '.tmp/audit-raw-prod.json';
export const AUDIT_RAW_DEV = '.tmp/audit-raw-dev.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

/** A single advisory after parsing and classification. */
export type ParsedAdvisory = {
  /** GHSA ID (e.g. "GHSA-xxxx-xxxx-xxxx") or numeric npm advisory ID as string. */
  id: string;
  severity: Severity;
  title: string;
  url: string;
  moduleName: string;
  /** Dependency paths that pull in the vulnerable package. */
  paths: string[];
  /** True if the advisory only appears in the dev audit (not in production). */
  devOnly: boolean;
  /**
   * True if this advisory is release-blocking:
   *   - present in production (not dev-only), AND
   *   - severity >= moderate.
   */
  isBlocking: boolean;
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export type DiffResult = {
  /** Advisories that are blocking in the current run but were absent or non-blocking in the baseline. */
  newlyBlockingAdvisories: ParsedAdvisory[];
  /** Advisories that were blocking in the baseline but are no longer blocking (resolved or severity-dropped). */
  resolvedAdvisories: ParsedAdvisory[];
  /** Advisories present in both current and baseline (regardless of blocking status). */
  unchangedAdvisories: ParsedAdvisory[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON advisory list from disk.
 * Returns null if the file doesn't exist or cannot be parsed.
 */
export function readAdvisories(filePath: string): ParsedAdvisory[] | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as ParsedAdvisory[];
  } catch {
    return null;
  }
}

/**
 * Diff a current advisory set against a baseline.
 *
 * "Newly blocking" means the advisory is blocking in the current run but was
 * either absent from the baseline or was not blocking (non-prod / low severity).
 */
export function diffAdvisories(
  current: ParsedAdvisory[],
  baseline: ParsedAdvisory[],
): DiffResult {
  const baselineBlockingIds = new Set(
    baseline.filter((a) => a.isBlocking).map((a) => a.id),
  );
  const baselineIds = new Set(baseline.map((a) => a.id));
  const currentIds = new Set(current.map((a) => a.id));

  const newlyBlockingAdvisories = current.filter(
    (a) => a.isBlocking && !baselineBlockingIds.has(a.id),
  );

  const resolvedAdvisories = baseline.filter(
    (a) =>
      a.isBlocking &&
      (!currentIds.has(a.id) ||
        !current.find((c) => c.id === a.id)?.isBlocking),
  );

  const unchangedAdvisories = current.filter((a) => baselineIds.has(a.id));

  return { newlyBlockingAdvisories, resolvedAdvisories, unchangedAdvisories };
}

/**
 * Format a list of advisories as human-readable terminal text.
 *
 * Tries to extract the matching block from the native `yarn npm audit` colored
 * output first. Falls back to a normalised JSON-style block if the ID is not
 * found in the native output.
 */
export function formatAdvisoryTreeText(
  advisories: ParsedAdvisory[],
  nativeOutput: string,
): string {
  const lines: string[] = [];
  for (const advisory of advisories) {
    const block = extractNativeBlock(advisory, nativeOutput);
    lines.push(block ?? formatAdvisoryFallback(advisory));
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function formatAdvisoryFallback(advisory: ParsedAdvisory): string {
  const shownPaths = advisory.paths.slice(0, 4);
  const extra =
    advisory.paths.length > 4
      ? `  … and ${advisory.paths.length - 4} more path(s)`
      : '';
  return [
    `┌ [${advisory.severity.toUpperCase()}] ${advisory.title}`,
    `│ Advisory:  ${advisory.id}`,
    `│ Package:   ${advisory.moduleName}`,
    `│ URL:       ${advisory.url}`,
    `│ Paths:`,
    ...shownPaths.map((p) => `│   ${p}`),
    extra ? `│${extra}` : '',
    `└─`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Strip ANSI escape codes from a string. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

/**
 * Attempt to locate and extract the section of the native `yarn npm audit`
 * output that corresponds to the given advisory (by GHSA ID or module name +
 * severity). Returns null if no matching block is found.
 */
function extractNativeBlock(
  advisory: ParsedAdvisory,
  nativeOutput: string,
): string | null {
  if (!nativeOutput.trim()) return null;

  const stripped = stripAnsi(nativeOutput);
  const lines = stripped.split('\n');

  const startIdx = lines.findIndex(
    (l) =>
      l.includes(advisory.id) ||
      (l.toLowerCase().includes(advisory.moduleName.toLowerCase()) &&
        l.toLowerCase().includes(advisory.severity)),
  );

  if (startIdx === -1) return null;

  // Collect lines until we hit two consecutive blank lines (next advisory block).
  const blockLines: string[] = [];
  let blankStreak = 0;
  for (let i = startIdx; i < lines.length && i < startIdx + 40; i++) {
    if (lines[i].trim() === '') {
      blankStreak++;
      if (blankStreak >= 2) break;
    } else {
      blankStreak = 0;
    }
    blockLines.push(lines[i]);
  }

  const block = blockLines.join('\n').trim();
  return block.length > 0 ? block : null;
}
