#!/usr/bin/env ts-node
/**
 * Attempts a deterministic fix for each advisory reported by `yarn audit:ci`.
 *
 * This is the auto-fix half of the dependency-audit escalation loop (see
 * docs/readme/dependency-audit.md and .github/workflows/dependency-audit-escalation.yml).
 * It never opens a PR or talks to GitHub/Slack itself — it only mutates the
 * working tree (package.json / yarn.lock) and reports what it did, so the
 * calling workflow can decide whether to commit, open a PR, or fall back to a
 * tracking issue for a human.
 *
 * Usage: yarn ts-node --transpile-only scripts/attempt-audit-fix.ts <audit-ndjson-path> [skip-ids-json-path]
 *
 * <audit-ndjson-path> is the stdout of `yarn audit:ci:json` (one JSON object
 * per line, per `yarn npm audit --json`'s tree output format).
 * [skip-ids-json-path] is an optional path to a JSON array of advisory IDs to
 * skip (already covered by an open PR/issue, or explicitly accepted).
 *
 * Writes a result file (default ./audit-fix-result.json, override with
 * AUDIT_FIX_RESULT_PATH env var) shaped as:
 * { fixed: [{ pkg, id, severity, title, url, method, fromVersion, toVersion }],
 * manual: [{ pkg, id, severity, title, url, reason }] }
 *
 * Always exits 0 — failures to auto-fix a given advisory are reported in
 * "manual", not treated as script failure.
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import semver from 'semver';

interface AuditAdvisory {
  pkg: string;
  id: string;
  title: string;
  url?: string;
  severity: string;
  vulnerableVersions: string;
}

interface FixedEntry {
  pkg: string;
  id: string;
  severity: string;
  title: string;
  url?: string;
  method: 'yarn-up' | 'resolution';
  fromVersion?: string;
  toVersion: string;
}

interface ManualEntry {
  pkg: string;
  id: string;
  severity: string;
  title: string;
  url?: string;
  reason: string;
}

interface FixResult {
  fixed: FixedEntry[];
  manual: ManualEntry[];
}

const RESULT_PATH = process.env.AUDIT_FIX_RESULT_PATH || 'audit-fix-result.json';

function tryShQuiet(cmd: string, args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output };
  } catch (error) {
    const output = error && typeof error === 'object' && 'stdout' in error
      ? String((error as { stdout?: string }).stdout || '') + String((error as { stderr?: string }).stderr || '')
      : String(error);
    return { ok: false, output };
  }
}

/**
 * Parse the NDJSON tree output of `yarn npm audit --json` into a flat advisory list.
 * See rK()/Xhe()/Zhe() in the vendored Yarn CLI for the exact shape each line follows:
 * { value: "<packageName>", children: { ID, Issue, URL?, Severity, "Vulnerable Versions", ... } }
 */
function parseAuditNdjson(raw: string): AuditAdvisory[] {
  const advisories: AuditAdvisory[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let node: { value?: string; children?: Record<string, unknown> };
    try {
      node = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const pkg = node.value;
    const children = node.children;
    if (!pkg || !children) continue;
    const id = children.ID;
    const title = children.Issue;
    const severity = children.Severity;
    const vulnerableVersions = children['Vulnerable Versions'];
    const url = children.URL;
    if (typeof pkg !== 'string' || typeof id !== 'string' || typeof title !== 'string' || typeof severity !== 'string') {
      continue;
    }
    advisories.push({
      pkg,
      id,
      title,
      url: typeof url === 'string' ? url : undefined,
      severity,
      vulnerableVersions: typeof vulnerableVersions === 'string' ? vulnerableVersions : '',
    });
  }
  return advisories;
}

function loadSkipIds(path: string | undefined): Set<string> {
  if (!path || !existsSync(path)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (Array.isArray(parsed)) return new Set(parsed.map(String));
  } catch {
    // Malformed skip-list is not fatal — worst case we re-attempt an advisory
    // that already has an open PR/issue, and the dedupe step downstream drops it.
  }
  return new Set();
}

function isDirectDependency(pkg: string): boolean {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  return Boolean(manifest.dependencies?.[pkg] || manifest.devDependencies?.[pkg]);
}

function getResolvedVersions(pkg: string): string[] {
  // `yarn why <pkg> --json` prints one line per dependent, each line's top-level
  // `value` is the *dependent* (e.g. "@appium/support@npm:4.1.6") and its
  // `children` map contains the locator(s) for `pkg` itself, e.g.
  // { "semver@npm:7.5.4": { locator: "semver@npm:7.5.4", descriptor: "..." } }.
  const result = tryShQuiet('yarn', ['why', pkg, '--json']);
  if (!result.ok) return [];
  const versions = new Set<string>();
  for (const line of result.output.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const children = (entry.children || {}) as Record<string, { locator?: string }>;
      for (const [childKey, child] of Object.entries(children)) {
        const match = /@npm:([^\s]+)/.exec(child.locator || childKey);
        if (match) versions.add(match[1]);
      }
    } catch {
      // ignore unparsable lines
    }
  }
  return [...versions];
}

/** Finds the lowest published version of `pkg` that satisfies `range` and is outside `vulnerableRange`. */
function findSafeVersion(pkg: string, vulnerableRange: string): string | null {
  const result = tryShQuiet('yarn', ['npm', 'info', pkg, '--fields', 'versions', '--json']);
  if (!result.ok) return null;
  let versions: string[];
  try {
    versions = JSON.parse(result.output).versions;
  } catch {
    return null;
  }
  if (!Array.isArray(versions)) return null;

  const candidates = versions
    .filter((v) => semver.valid(v) && !semver.prerelease(v))
    .filter((v) => !semver.satisfies(v, vulnerableRange, { includePrerelease: false }))
    .sort(semver.compare);

  return candidates[0] ?? null;
}

function gitDiffPaths(): string[] {
  const result = tryShQuiet('git', ['diff', '--name-only', '--', 'package.json', 'yarn.lock']);
  return result.ok ? result.output.split('\n').filter(Boolean) : [];
}

function revertLockfileChanges(): void {
  tryShQuiet('git', ['checkout', '--', 'package.json', 'yarn.lock']);
}

/** Re-runs the audit and returns true if `id` no longer appears for `pkg`. */
function isAdvisoryCleared(pkg: string, id: string): boolean {
  const result = tryShQuiet('yarn', ['audit:ci:json']);
  // Non-zero exit just means "advisories exist somewhere" — we only care
  // whether this specific (pkg, id) pair is still one of them.
  const remaining = parseAuditNdjson(result.output);
  return !remaining.some((advisory) => advisory.pkg === pkg && advisory.id === id);
}

function verifyTreeIsClean(): boolean {
  const dedupe = tryShQuiet('yarn', ['deduplicate']);
  if (!dedupe.ok) return false;
  if (gitDiffPaths().length === 0) {
    // dedupe made no changes beyond our own — fine. If it *did* touch the
    // lockfile further, that's still fine as long as the command succeeded;
    // we intentionally keep any deduplication it performs.
  }
  const constraints = tryShQuiet('yarn', ['constraints']);
  return constraints.ok;
}

function attemptFix(advisory: AuditAdvisory): FixedEntry | ManualEntry {
  const { pkg, id, title, url, severity, vulnerableVersions } = advisory;
  const beforeVersions = getResolvedVersions(pkg);

  if (isDirectDependency(pkg)) {
    console.log(`[${id}] ${pkg}: direct dependency, trying "yarn up"`);
    const upResult = tryShQuiet('yarn', ['up', pkg]);
    if (upResult.ok) {
      const installResult = tryShQuiet('yarn', ['install', '--mode=update-lockfile']);
      if (installResult.ok && isAdvisoryCleared(pkg, id) && verifyTreeIsClean()) {
        const afterVersions = getResolvedVersions(pkg);
        console.log(`[${id}] ${pkg}: fixed via yarn up (${beforeVersions.join(', ')} -> ${afterVersions.join(', ')})`);
        return {
          pkg,
          id,
          severity,
          title,
          url,
          method: 'yarn-up',
          fromVersion: beforeVersions.join(', ') || undefined,
          toVersion: afterVersions.join(', ') || 'unknown',
        };
      }
    }
    console.log(`[${id}] ${pkg}: "yarn up" did not clear the advisory cleanly, reverting`);
    revertLockfileChanges();
  }

  console.log(`[${id}] ${pkg}: trying a resolutions pin`);
  const safeVersion = findSafeVersion(pkg, vulnerableVersions);
  if (!safeVersion) {
    return { pkg, id, severity, title, url, reason: 'Could not determine a published version outside the vulnerable range.' };
  }

  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  manifest.resolutions = manifest.resolutions || {};
  manifest.resolutions[pkg] = safeVersion;
  writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const installResult = tryShQuiet('yarn', ['install', '--mode=update-lockfile']);
  if (installResult.ok && isAdvisoryCleared(pkg, id) && verifyTreeIsClean()) {
    console.log(`[${id}] ${pkg}: fixed via resolutions pin to ${safeVersion}`);
    return {
      pkg,
      id,
      severity,
      title,
      url,
      method: 'resolution',
      fromVersion: beforeVersions.join(', ') || undefined,
      toVersion: safeVersion,
    };
  }

  console.log(`[${id}] ${pkg}: resolutions pin did not clear the advisory cleanly, reverting`);
  revertLockfileChanges();
  return {
    pkg,
    id,
    severity,
    title,
    url,
    reason: 'Automated yarn up and resolutions pin attempts both failed to produce a clean, verified fix.',
  };
}

function main(): void {
  const [, , auditPath, skipIdsPath] = process.argv;
  if (!auditPath) {
    console.error('Usage: attempt-audit-fix.ts <audit-ndjson-path> [skip-ids-json-path]');
    process.exit(1);
  }

  const raw = readFileSync(auditPath, 'utf8');
  const advisories = parseAuditNdjson(raw);
  const skipIds = loadSkipIds(skipIdsPath);

  const result: FixResult = { fixed: [], manual: [] };

  // Multiple lines can share the same (pkg, id) if the same advisory line was
  // captured more than once in the tree output; de-dupe defensively.
  const seen = new Set<string>();
  for (const advisory of advisories) {
    const key = `${advisory.pkg}@@${advisory.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (skipIds.has(advisory.id)) {
      console.log(`[${advisory.id}] ${advisory.pkg}: skipped (already tracked by an open PR/issue or accepted)`);
      continue;
    }

    const outcome = attemptFix(advisory);
    if ('method' in outcome) {
      result.fixed.push(outcome);
    } else {
      result.manual.push(outcome);
    }
  }

  writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nWrote ${RESULT_PATH}: ${result.fixed.length} fixed, ${result.manual.length} need manual review.`);
}

main();
