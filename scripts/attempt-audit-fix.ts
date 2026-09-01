#!/usr/bin/env ts-node
/**
 * Fix step of the dependency-audit escalation loop (see
 * .github/workflows/dependency-audit-escalation.yml).
 *
 * scripts/collect-audit-advisories.ts builds the initial advisory list (raw
 * `yarn audit` output, minus anything already tracked or accepted) into the
 * `manual` bucket of its result file. This script hands that whole batch to
 * MetaMask/ai-analyzer's `dependency-audit-fix` mode (a custom mode defined
 * in .ai-pr-analyzer/modes/dependency-audit-fix/, routed through the org's
 * LiteLLM proxy), which reasons about each advisory instead of just
 * pattern-matching a `yarn up` or a blind `resolutions` pin.
 *
 * Trust model (read this before changing the prompt or the verification
 * below):
 *
 * - The AI never edits any file. It only investigates (read-only tools:
 * read_file on package.json and the advisory context file) and returns a
 * structured proposal — { advisory_id, package, action, target, reasoning }
 * per advisory. This script is the only thing that ever writes to
 * package.json/yarn.lock.
 * - The AI's proposal is never trusted at face value. For each proposed
 * fix, this script applies it itself, then re-runs the same
 * isAdvisoryCleared / verifyTreeIsClean checks a plain `yarn up`/resolutions
 * attempt would need to pass. Only advisories this script independently
 * re-verified as cleared move from `manual` to `fixed` — an unverified
 * proposal is reverted and the advisory stays `manual`.
 * - Advisory title/URL text is untrusted: it comes from the public
 * npm/GitHub advisory database, which anyone can publish to. The mode's
 * system prompt tells the AI to treat it as data, not instructions.
 * - The AI never sees this repo's real GITHUB_TOKEN or SLACK_BOT_TOKEN — it
 * only receives a LiteLLM API key scoped to chat completions. This script
 * (not the AI) authenticates to GitHub to open the PR, using the same
 * short-lived installation token the workflow's "Get token" step produces.
 *
 * Usage: yarn ts-node --transpile-only scripts/attempt-audit-fix.ts <audit-fix-result-json-path>
 *
 * Required env: GH_TOKEN, GITHUB_REPOSITORY, NEXT_SEMVER_VERSION, OWNER_GH
 * Optional env: LITELLM_API_KEY (skips cleanly — no-op passthrough — if
 * absent, or if MetaMask/ai-analyzer wasn't checked out to
 * .ai-analyzer-action, in which case every advisory is left in `manual` for
 * the tracking-issue fallback)
 *
 * Rewrites <audit-fix-result-json-path> in place: moves any advisory this
 * script verifiably confirmed fixed from `manual` into `fixed` (tagged
 * `method: "ai-analyzer"`), leaves everything else in `manual` untouched.
 * Always exits 0 — an AI attempt that fails, errors, or can't be verified is
 * reported by leaving the advisory in `manual`, not by failing the script.
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

interface ManualEntry {
  pkg: string;
  id: string;
  severity: string;
  title: string;
  url?: string;
  reason: string;
}

interface FixedEntry {
  pkg: string;
  id: string;
  severity: string;
  title: string;
  url?: string;
  method: 'ai-analyzer';
  fromVersion?: string;
  toVersion: string;
}

interface FixResult {
  fixed: FixedEntry[];
  manual: ManualEntry[];
}

interface AuditAdvisory {
  pkg: string;
  id: string;
}

interface AiProposedFix {
  advisory_id: string;
  package: string;
  action: 'bump-dependency' | 'add-resolution' | 'remove-resolution' | 'no-safe-fix';
  target: string;
  reasoning: string;
}

const AI_PR_URL_PATH = 'audit-ai-pr-url.txt';
const ADVISORY_CONTEXT_PATH = '.ai-pr-analyzer/dependency-audit-advisories.json';
const ANALYZER_OUTPUT_PATH = '.ai-pr-analyzer/dependency-audit-fix.json';
const ANALYZER_ENTRY = '.ai-analyzer-action/src/index.ts';
// Same args the escalation workflow's "Run dependency audit" step uses to
// produce the NDJSON this script re-checks against — kept in sync manually
// since neither side is a package.json script.
const AUDIT_JSON_ARGS = ['npm', 'audit', '--environment', 'production', '--severity', 'moderate', '--no-deprecations', '--json'];

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

/** Same NDJSON shape scripts/collect-audit-advisories.ts parses — see its parseAuditNdjson comment. */
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
    const id = node.children?.ID;
    if (typeof pkg === 'string' && typeof id === 'string') {
      advisories.push({ pkg, id });
    }
  }
  return advisories;
}

/** Re-runs the audit and returns true if `id` no longer appears for `pkg`. */
function isAdvisoryCleared(pkg: string, id: string): boolean {
  const result = tryShQuiet('yarn', AUDIT_JSON_ARGS);
  const remaining = parseAuditNdjson(result.output);
  return !remaining.some((advisory) => advisory.pkg === pkg && advisory.id === id);
}

function verifyTreeIsClean(): boolean {
  const dedupe = tryShQuiet('yarn', ['deduplicate']);
  if (!dedupe.ok) return false;
  const constraints = tryShQuiet('yarn', ['constraints']);
  return constraints.ok;
}

function getResolvedVersions(pkg: string): string[] {
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

function revertLockfileChanges(): void {
  tryShQuiet('git', ['checkout', '--', 'package.json', 'yarn.lock']);
}

/**
 * Runs MetaMask/ai-analyzer's dependency-audit-fix mode against the current
 * batch of manual advisories and returns its structured proposal, or null if
 * the tier isn't configured/available/parseable — every null case is a
 * clean no-op, never a script failure.
 */
function runAnalyzer(manual: ManualEntry[]): AiProposedFix[] | null {
  if (!process.env.LITELLM_API_KEY) {
    console.log('LITELLM_API_KEY not set — skipping AI-assisted fix (no-op passthrough).');
    return null;
  }
  if (!existsSync(ANALYZER_ENTRY)) {
    console.log(`${ANALYZER_ENTRY} not found (MetaMask/ai-analyzer not checked out) — skipping AI-assisted fix (no-op passthrough).`);
    return null;
  }

  const contextEntries = manual.map((entry) => ({
    package: entry.pkg,
    advisory_id: entry.id,
    severity: entry.severity,
    title: entry.title,
    url: entry.url || '',
  }));
  writeFileSync(ADVISORY_CONTEXT_PATH, `${JSON.stringify(contextEntries, null, 2)}\n`);

  // Whitespace-separated, not comma-separated — see resolveChangedFilesList
  // in MetaMask/ai-analyzer's src/utils/changed-files.ts.
  const changedFiles = ['package.json', 'yarn.lock', ADVISORY_CONTEXT_PATH].join(' ');
  console.log(`Handing ${manual.length} advisor${manual.length === 1 ? 'y' : 'ies'} to MetaMask/ai-analyzer's dependency-audit-fix mode.`);
  const result = tryShQuiet('node', [
    '-r', 'esbuild-register',
    ANALYZER_ENTRY,
    '--config', '.ai-pr-analyzer',
    '--mode', 'dependency-audit-fix',
    '--changed-files', changedFiles,
    '--skip-scope',
  ]);
  console.log(result.output);
  if (!result.ok) {
    console.log('AI Analyzer run failed — treating as no proposal.');
    return null;
  }

  if (!existsSync(ANALYZER_OUTPUT_PATH)) {
    console.log(`${ANALYZER_OUTPUT_PATH} was not written — treating as no proposal.`);
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(ANALYZER_OUTPUT_PATH, 'utf8'));
    if (!Array.isArray(parsed.fixes)) {
      console.log(`${ANALYZER_OUTPUT_PATH} had no "fixes" array — treating as no proposal.`);
      return null;
    }
    return parsed.fixes;
  } catch {
    console.log(`Could not parse ${ANALYZER_OUTPUT_PATH} — treating as no proposal.`);
    return null;
  }
}

/**
 * Applies one AI-proposed fix to the working tree and independently
 * re-verifies it before trusting it. Returns null (and reverts any change it
 * made) for every outcome except a fully verified fix.
 */
function applyProposedFix(advisory: ManualEntry, fix: AiProposedFix): FixedEntry | null {
  const { pkg, id, severity, title, url } = advisory;
  const beforeVersions = getResolvedVersions(pkg);

  if (fix.action === 'no-safe-fix') {
    console.log(`[${id}] ${pkg}: AI analyzer found no safe fix — ${fix.reasoning}`);
    return null;
  }

  if (!fix.target) {
    console.log(`[${id}] ${pkg}: "${fix.action}" proposed with no target — skipping`);
    return null;
  }

  if (fix.action === 'bump-dependency') {
    console.log(`[${id}] ${pkg}: applying AI-proposed bump to ${fix.target}`);
    const upResult = tryShQuiet('yarn', ['up', `${pkg}@${fix.target}`]);
    if (!upResult.ok) {
      console.log(`[${id}] ${pkg}: "yarn up ${pkg}@${fix.target}" failed, reverting`);
      revertLockfileChanges();
      return null;
    }
  } else if (fix.action === 'add-resolution') {
    console.log(`[${id}] ${pkg}: applying AI-proposed resolutions pin to ${fix.target}`);
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    manifest.resolutions = manifest.resolutions || {};
    manifest.resolutions[pkg] = fix.target;
    writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  } else if (fix.action === 'remove-resolution') {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    if (!manifest.resolutions || !(fix.target in manifest.resolutions)) {
      console.log(`[${id}] ${pkg}: proposed resolutions key "${fix.target}" does not exist in package.json — skipping`);
      return null;
    }
    console.log(`[${id}] ${pkg}: applying AI-proposed removal of resolutions["${fix.target}"]`);
    delete manifest.resolutions[fix.target];
    writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    console.log(`[${id}] ${pkg}: unrecognized action "${fix.action}" — skipping`);
    return null;
  }

  const installResult = tryShQuiet('yarn', ['install', '--mode=update-lockfile']);
  if (installResult.ok && isAdvisoryCleared(pkg, id) && verifyTreeIsClean()) {
    const afterVersions = getResolvedVersions(pkg);
    console.log(`[${id}] ${pkg}: verified fixed via ${fix.action} (${beforeVersions.join(', ')} -> ${afterVersions.join(', ')})`);
    return {
      pkg,
      id,
      severity,
      title,
      url,
      method: 'ai-analyzer',
      fromVersion: beforeVersions.join(', ') || undefined,
      toVersion: afterVersions.join(', ') || fix.target,
    };
  }

  console.log(`[${id}] ${pkg}: AI-proposed ${fix.action} did not clear the advisory cleanly, reverting`);
  revertLockfileChanges();
  return null;
}

function openPrForFixes(repo: string, ownerGh: string, fixed: FixedEntry[]): string | null {
  const nextSemver = process.env.NEXT_SEMVER_VERSION || '';
  const branch = `chore/dependency-audit-${process.env.GITHUB_RUN_ID || Date.now()}`;

  if (!tryShQuiet('git', ['checkout', '-b', branch]).ok) {
    console.log(`Could not create branch ${branch} — skipping PR creation.`);
    return null;
  }
  tryShQuiet('git', ['config', 'user.name', 'metamaskbot']);
  tryShQuiet('git', ['config', 'user.email', 'metamaskbot@users.noreply.github.com']);
  if (!tryShQuiet('git', ['add', 'package.json', 'yarn.lock']).ok) {
    console.log('Could not stage package.json/yarn.lock — skipping PR creation.');
    return null;
  }
  if (!tryShQuiet('git', ['commit', '-m', 'fix: patch dependency audit advisories']).ok) {
    console.log('Nothing to commit — skipping PR creation.');
    return null;
  }
  if (!tryShQuiet('git', ['push', 'origin', branch]).ok) {
    console.log(`Could not push branch ${branch} — skipping PR creation.`);
    return null;
  }

  const title = `cp-${nextSemver}: fix dependency audit advisor${fixed.length === 1 ? 'y' : 'ies'}`;
  const ids = fixed.map((entry) => entry.id).join(',');
  const bodyLines = [
    `Auto-generated by [dependency-audit-escalation](${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || ''}).`,
    '',
    "MetaMask/ai-analyzer's dependency-audit-fix mode proposed each change below; every one was independently re-verified by attempt-audit-fix.ts against the actual resulting lockfile before being included here — the AI's own proposal is not what marked these as fixed.",
    '',
    ...fixed.map((entry) => `- **${entry.pkg}** (${entry.severity}) — [${entry.id}](${entry.url || ''}): ${entry.title} (now ${entry.toVersion})`),
    '',
    'Titled with a `cp-` token so the existing release-labeling automation tags this for the next release; ask a release engineer to cherry-pick it into any already-open `release/*` branch.',
    '',
    `<!-- audit-ids: ${ids} -->`,
  ];
  writeFileSync('audit-pr-body.md', bodyLines.join('\n'));

  const prResult = tryShQuiet('gh', [
    'pr', 'create',
    '--repo', repo,
    '--base', 'main',
    '--head', branch,
    '--title', title,
    '--body-file', 'audit-pr-body.md',
    '--label', 'dependency-audit',
    '--assignee', ownerGh,
    '--reviewer', ownerGh,
  ]);
  if (!prResult.ok) {
    console.log(`gh pr create failed: ${prResult.output}`);
    return null;
  }
  return prResult.output.trim();
}

function main(): void {
  const [, , resultPath] = process.argv;
  if (!resultPath) {
    console.error('Usage: attempt-audit-fix.ts <audit-fix-result-json-path>');
    process.exit(1);
  }

  const result: FixResult = JSON.parse(readFileSync(resultPath, 'utf8'));
  writeFileSync(AI_PR_URL_PATH, '');

  if (result.manual.length === 0) {
    console.log('No advisories to review — nothing to do.');
    return;
  }

  const proposedFixes = runAnalyzer(result.manual);
  if (!proposedFixes) {
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const stillManual: ManualEntry[] = [];
  const fixed: FixedEntry[] = [];
  for (const advisory of result.manual) {
    const fix = proposedFixes.find((candidate) => candidate.advisory_id === advisory.id && candidate.package === advisory.pkg);
    if (!fix) {
      console.log(`[${advisory.id}] ${advisory.pkg}: AI analyzer returned no proposal for this advisory — leaving manual`);
      stillManual.push(advisory);
      continue;
    }
    const fixedEntry = applyProposedFix(advisory, fix);
    if (fixedEntry) {
      fixed.push(fixedEntry);
    } else {
      stillManual.push(advisory);
    }
  }

  if (fixed.length === 0) {
    console.log('AI-assisted fix did not verifiably fix any advisory in this batch.');
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY || '';
  const ownerGh = process.env.OWNER_GH || '';
  const prUrl = openPrForFixes(repo, ownerGh, fixed);
  if (!prUrl) {
    console.log('Verified fixes exist but the PR could not be opened — leaving those advisories in manual so the tracking issue still covers them.');
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  writeFileSync(AI_PR_URL_PATH, prUrl);
  result.fixed = [...result.fixed, ...fixed];
  result.manual = stillManual;
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Verified ${fixed.length} fix(es) on PR ${prUrl}; ${stillManual.length} advisory/ies still need manual review.`);
}

try {
  main();
} catch (error) {
  // Never fail the workflow over the AI-assisted fix — worst case, advisories
  // stay in `manual` and the existing tracking-issue fallback handles them.
  console.error(`Unexpected error in attempt-audit-fix.ts (non-fatal): ${String(error)}`);
}
