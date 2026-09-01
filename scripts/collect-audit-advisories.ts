#!/usr/bin/env ts-node
/**
 * Parses `yarn npm audit --json`'s NDJSON output into the advisory list the
 * dependency-audit escalation loop works from, dropping anything already
 * tracked by an open PR/issue (see
 * .github/workflows/dependency-audit-escalation.yml's "Build skip-list"
 * step). Permanently accepted risks never reach this script at all — they're
 * suppressed at the `yarn npm audit` level itself via npmAuditIgnoreAdvisories
 * in .yarnrc.yml.
 *
 * This script never attempts a fix itself — it only builds the initial
 * `manual` list scripts/attempt-audit-fix.ts hands to MetaMask/ai-analyzer.
 * It exists as its own step (rather than folded into attempt-audit-fix.ts)
 * so the workflow can post its "N advisories detected" Slack message right
 * away, before running the AI step that can take a few minutes.
 *
 * Usage: yarn ts-node --transpile-only scripts/collect-audit-advisories.ts <audit-ndjson-path> [skip-ids-json-path]
 *
 * <audit-ndjson-path> is the stdout of `yarn npm audit --json` (one JSON
 * object per line, per Yarn's tree output format).
 * [skip-ids-json-path] is an optional path to a JSON array of advisory IDs to
 * skip.
 *
 * Writes a result file (default ./audit-fix-result.json, override with
 * AUDIT_FIX_RESULT_PATH env var) shaped as:
 * { fixed: [], manual: [{ pkg, id, severity, title, url, reason }] }
 * `fixed` always starts empty — scripts/attempt-audit-fix.ts is what
 * populates it, once (and if) the AI tier verifiably clears an advisory.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

interface AuditAdvisory {
  pkg: string;
  id: string;
  title: string;
  url?: string;
  severity: string;
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
  fixed: never[];
  manual: ManualEntry[];
}

const RESULT_PATH = process.env.AUDIT_FIX_RESULT_PATH || 'audit-fix-result.json';

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
    const url = children.URL;
    if (typeof pkg !== 'string' || typeof id !== 'string' || typeof title !== 'string' || typeof severity !== 'string') {
      continue;
    }
    advisories.push({ pkg, id, title, url: typeof url === 'string' ? url : undefined, severity });
  }
  return advisories;
}

function loadSkipIds(path: string | undefined): Set<string> {
  if (!path || !existsSync(path)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (Array.isArray(parsed)) return new Set(parsed.map(String));
  } catch {
    // Malformed skip-list is not fatal — worst case we re-collect an advisory
    // that already has an open PR/issue, and its own dedupe logic drops it.
  }
  return new Set();
}

function main(): void {
  const [, , auditPath, skipIdsPath] = process.argv;
  if (!auditPath) {
    console.error('Usage: collect-audit-advisories.ts <audit-ndjson-path> [skip-ids-json-path]');
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
      console.log(`[${advisory.id}] ${advisory.pkg}: skipped (already tracked by an open PR/issue)`);
      continue;
    }

    result.manual.push({
      pkg: advisory.pkg,
      id: advisory.id,
      severity: advisory.severity,
      title: advisory.title,
      url: advisory.url,
      reason: 'Pending AI-assisted review.',
    });
  }

  writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nWrote ${RESULT_PATH}: ${result.manual.length} advisor${result.manual.length === 1 ? 'y' : 'ies'} pending review.`);
}

main();
