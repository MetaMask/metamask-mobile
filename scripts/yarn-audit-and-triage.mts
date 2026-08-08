/**
 * Step 1 of the yarn audit pipeline.
 *
 * Runs `yarn npm audit` for both production and development environments,
 * classifies every advisory, and writes a normalised JSON list to
 * `.tmp/audit-current.json`.
 *
 * Classification rules
 * --------------------
 *  - devOnly  : the advisory appears in the dev audit but NOT in the prod audit.
 *  - isBlocking: NOT devOnly AND severity >= moderate.
 *  - Dev-only DoS / ReDoS at high/critical are severity-downgraded to "moderate"
 *    since they don't affect the production runtime.
 *
 * Pre-warmed raw files
 * --------------------
 * If `.tmp/audit-raw-prod.json` and `.tmp/audit-raw-dev.json` already exist
 * (written by `yarn-audit-local.mts` to avoid duplicate audit runs), this
 * script reads them instead of re-running the audits.
 *
 * Exit codes
 * ----------
 *  0 — triage complete (advisory JSON written).
 *  1 — fatal error (parsing failure, missing output, etc.).
 *
 * CI / local usage: called by yarn-audit-local.mts (`import { main as runTriage }`).
 * Standalone      : `tsx scripts/yarn-audit-and-triage.mts`
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import {
  AUDIT_CURRENT_FILE,
  AUDIT_RAW_DEV,
  AUDIT_RAW_PROD,
  SEVERITY_ORDER,
  type ParsedAdvisory,
  type Severity,
} from './shared/audit-utils.mts';

// ---------------------------------------------------------------------------
// Internal types — Yarn Berry v4 `yarn npm audit --json` output shape
// ---------------------------------------------------------------------------

type YarnAuditFinding = {
  version: string;
  paths: string[];
  dev: boolean;
  optional: boolean;
  bundled: boolean;
};

type YarnAuditAdvisory = {
  github_advisory_id?: string;
  id?: number | string;
  module_name: string;
  severity: Severity;
  title: string;
  url: string;
  patched_versions: string;
  vulnerable_versions: string;
  findings: YarnAuditFinding[];
};

type YarnAuditOutput = {
  advisories: Record<string, YarnAuditAdvisory>;
  metadata: {
    vulnerabilities: Partial<Record<Severity | 'total', number>>;
    dependencies: Record<string, number>;
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCKING_SEVERITY: Severity = 'moderate';

/**
 * Dev-only advisories matching this pattern (DoS / ReDoS) at high/critical
 * severity are downgraded to "moderate" — they don't affect production users.
 */
const DOS_PATTERN = /redos|denial[- ]of[- ]service|regular expression/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runAudit(environment: 'production' | 'development'): string {
  const result = spawnSync(
    `yarn npm audit --recursive --environment ${environment} --json`,
    { shell: true, encoding: 'utf8' },
  );
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function parseAuditJson(raw: string): YarnAuditOutput | null {
  // yarn npm audit may emit non-JSON lines (progress output) around the JSON blob.
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return null;
  try {
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as YarnAuditOutput;
  } catch {
    return null;
  }
}

function advisoryId(advisory: YarnAuditAdvisory, fallbackKey: string): string {
  return advisory.github_advisory_id ?? String(advisory.id ?? fallbackKey);
}

function collectPaths(advisory: YarnAuditAdvisory): string[] {
  return advisory.findings.flatMap((f) => f.paths ?? []);
}

// ---------------------------------------------------------------------------
// Main (exported so yarn-audit-local.mts can call it synchronously)
// ---------------------------------------------------------------------------

export function main(): void {
  // 1. Obtain raw audit JSON (from pre-warmed files or fresh runs) -----------
  let prodRaw: string;
  let devRaw: string;

  if (existsSync(AUDIT_RAW_PROD) && existsSync(AUDIT_RAW_DEV)) {
    prodRaw = readFileSync(AUDIT_RAW_PROD, 'utf8');
    devRaw = readFileSync(AUDIT_RAW_DEV, 'utf8');
  } else {
    prodRaw = runAudit('production');
    devRaw = runAudit('development');
  }

  // 2. Parse -----------------------------------------------------------------
  const prodOutput = parseAuditJson(prodRaw);
  const devOutput = parseAuditJson(devRaw);

  if (!prodOutput || !devOutput) {
    console.error(
      'yarn-audit-and-triage: failed to parse audit JSON output.\n' +
        'Ensure `yarn npm audit --json` produces valid JSON.',
    );
    process.exitCode = 1;
    return;
  }

  // 3. Classify advisories ---------------------------------------------------
  const prodIds = new Set(Object.keys(prodOutput.advisories));
  const seen = new Set<string>();
  const advisories: ParsedAdvisory[] = [];

  // Process dev (= all dependencies) advisories first — every advisory appears once.
  for (const [key, advisory] of Object.entries(devOutput.advisories)) {
    const id = advisoryId(advisory, key);
    if (seen.has(id)) continue;
    seen.add(id);

    const devOnly = !prodIds.has(key);
    let { severity } = advisory;

    // Downgrade dev-only DoS/ReDoS at high/critical to moderate.
    if (
      devOnly &&
      DOS_PATTERN.test(advisory.title) &&
      (severity === 'critical' || severity === 'high')
    ) {
      severity = 'moderate';
    }

    const isBlocking =
      !devOnly &&
      SEVERITY_ORDER[severity] >= SEVERITY_ORDER[BLOCKING_SEVERITY];

    advisories.push({
      id,
      severity,
      title: advisory.title,
      url: advisory.url,
      moduleName: advisory.module_name,
      paths: collectPaths(advisory),
      devOnly,
      isBlocking,
    });
  }

  // Capture any prod advisories absent from the dev audit (edge case).
  for (const [key, advisory] of Object.entries(prodOutput.advisories)) {
    const id = advisoryId(advisory, key);
    if (seen.has(id)) continue;
    seen.add(id);

    const { severity } = advisory;
    const isBlocking =
      SEVERITY_ORDER[severity] >= SEVERITY_ORDER[BLOCKING_SEVERITY];

    advisories.push({
      id,
      severity,
      title: advisory.title,
      url: advisory.url,
      moduleName: advisory.module_name,
      paths: collectPaths(advisory),
      devOnly: false,
      isBlocking,
    });
  }

  // 4. Write audit-current.json ---------------------------------------------
  writeFileSync(AUDIT_CURRENT_FILE, JSON.stringify(advisories, null, 2), 'utf8');

  const blockingCount = advisories.filter((a) => a.isBlocking).length;
  const devOnlyCount = advisories.filter((a) => a.devOnly).length;
  console.log(
    `Triage complete: ${advisories.length} total ` +
      `(${blockingCount} blocking, ${devOnlyCount} dev-only) → ${AUDIT_CURRENT_FILE}`,
  );
}

// Run standalone when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
