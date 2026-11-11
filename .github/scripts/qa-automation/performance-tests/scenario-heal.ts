/* eslint-disable import-x/no-nodejs-modules */
/**
 * Classifies agent-driven scenario outcomes from a performance run and builds
 * the heal for repairable ones (stale cache or step wording only).
 *
 *   yarn tsx .github/scripts/qa-automation/performance-tests/scenario-heal.ts \
 *     --artifacts <downloaded artifacts dir> [--out tmp/scenario-heal] \
 *     [--apply] [--existing-prs prs.json] [--run-url URL] [--base-ref BRANCH]
 *
 * Without --apply, or with SCENARIO_HEAL_DRY_RUN=true, nothing in the repo is
 * written: the summary, plan, PR body and heal.diff go to --out.
 * With --apply, the files are written and the working tree is checked again
 * against the heal rules; any other change reverts everything.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildHealChanges,
  classifyOutcome,
  healKey,
  healRuleViolations,
  OUTCOME_FILE_PREFIX,
  proposedKeys,
  renderHealPr,
  renderSummary,
  type FileChange,
  type HealedScenario,
  type ScenarioOutcome,
} from '../../../../tests/framework/scenario-agent/heal';

export interface HealOptions {
  artifactsDir: string;
  repoRoot: string;
  outDir: string;
  apply: boolean;
  runUrl: string;
  baseRef: string;
  existingPrBodies: string[];
}

export interface HealRunResult {
  hasPr: boolean;
  title: string;
  bodyFile: string;
  summary: string;
  changes: FileChange[];
  diff: string;
}

function walk(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

/** Outcomes by scenario; HyperExecute may keep a -HYPL-<task> copy too. */
export function readOutcomes(artifactsDir: string): ScenarioOutcome[] {
  const byScenario = new Map<string, ScenarioOutcome>();
  for (const file of walk(artifactsDir)) {
    const name = path.basename(file);
    if (!name.startsWith(OUTCOME_FILE_PREFIX) || !name.endsWith('.json')) continue;
    try {
      const outcome = JSON.parse(fs.readFileSync(file, 'utf8')) as ScenarioOutcome;
      if (outcome.schema === 1 && outcome.scenarioPath) {
        byScenario.set(outcome.scenarioPath, outcome);
      }
    } catch {
      // A truncated file from a crashed task carries no outcome.
    }
  }
  return [...byScenario.values()].sort((a, b) =>
    a.scenarioPath.localeCompare(b.scenarioPath),
  );
}

function readHeJobUrls(artifactsDir: string): string[] {
  const urls = new Set<string>();
  for (const file of walk(artifactsDir)) {
    if (!/^hyperexecute-job-.*\.json$/.test(path.basename(file))) continue;
    try {
      const { url } = JSON.parse(fs.readFileSync(file, 'utf8')) as { url?: string };
      if (url) urls.add(url);
    } catch {
      // ignore
    }
  }
  return [...urls];
}

function unifiedDiff(changes: FileChange[]): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-heal-'));
  let diff = '';
  for (const change of changes) {
    const before = path.join(tmp, 'a', change.path);
    const after = path.join(tmp, 'b', change.path);
    fs.mkdirSync(path.dirname(before), { recursive: true });
    fs.mkdirSync(path.dirname(after), { recursive: true });
    fs.writeFileSync(before, change.before ?? '');
    fs.writeFileSync(after, change.after);
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', before, after], {
        encoding: 'utf8',
      });
    } catch (error) {
      // git diff --no-index exits 1 when the files differ.
      diff += String((error as { stdout?: string }).stdout ?? '')
        .split(`${tmp}/a/`)
        .join('')
        .split(`${tmp}/b/`)
        .join('');
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return diff;
}

/** Re-checks what --apply actually changed; reverts everything on a violation. */
function verifyWorktree(repoRoot: string, changes: FileChange[]): string[] {
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  const changed = git('status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
  const expected = new Set(changes.map((c) => c.path));
  const actual: FileChange[] = changed.map((file) => {
    let before: string | null = null;
    try {
      before = git('show', `HEAD:${file}`);
    } catch {
      before = null;
    }
    const full = path.join(repoRoot, file);
    return {
      path: file,
      before,
      after: fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '',
    };
  });
  const violations = [
    ...changed
      .filter((file) => !expected.has(file))
      .map((file) => `${file}: changed but not part of the heal`),
    ...healRuleViolations(actual, (p) => {
      const full = path.join(repoRoot, p);
      return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    }),
  ];
  if (violations.length > 0) {
    git('checkout', '--', '.');
    git('clean', '-fd', '--', 'tests/performance');
  }
  return violations;
}

export function runHeal(options: HealOptions): HealRunResult {
  const readFile = (repoPath: string) => {
    const full = path.join(options.repoRoot, repoPath);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  };
  const outcomes = readOutcomes(options.artifactsDir);
  const proposed = proposedKeys(options.existingPrBodies);
  const rows: Parameters<typeof renderSummary>[0] = [];
  const healed: HealedScenario[] = [];
  const extra: string[] = [];

  for (const outcome of outcomes) {
    const classification = classifyOutcome(outcome);
    if (!classification.repairable) {
      rows.push({ outcome, classification });
      continue;
    }
    if (proposed.has(healKey(outcome, classification.step))) {
      rows.push({
        outcome,
        classification,
        note: 'already proposed by an open heal PR',
      });
      continue;
    }
    const { changes, notes } = buildHealChanges(outcome, readFile);
    if (changes.length === 0) {
      rows.push({
        outcome,
        classification,
        note: `nothing to change${notes.length ? ` (${notes.join('; ')})` : ''}`,
      });
      continue;
    }
    rows.push({ outcome, classification, note: 'heal PR' });
    healed.push({ outcome, classification, changes, notes });
  }

  let changes = healed.flatMap((h) => h.changes);
  const violations = healRuleViolations(changes, readFile);
  if (violations.length > 0) {
    extra.push(
      '**Heal aborted.** The diff would touch more than caches and step wording:',
      ...violations.map((v) => `- ${v}`),
    );
    changes = [];
  }

  fs.mkdirSync(options.outDir, { recursive: true });
  const diff = unifiedDiff(changes);
  fs.writeFileSync(path.join(options.outDir, 'heal.diff'), diff);

  if (options.apply && changes.length > 0) {
    for (const change of changes) {
      fs.writeFileSync(path.join(options.repoRoot, change.path), change.after);
    }
    const actual = verifyWorktree(options.repoRoot, changes);
    if (actual.length > 0) {
      extra.push(
        '**Heal aborted after applying.** The working tree changed outside the heal rules; all changes were reverted:',
        ...actual.map((v) => `- ${v}`),
      );
      changes = [];
    }
  }

  const hasPr = changes.length > 0;
  const { title, body } = renderHealPr(
    healed.filter(() => hasPr),
    {
      runUrl: options.runUrl,
      heJobUrls: readHeJobUrls(options.artifactsDir),
      baseRef: options.baseRef,
    },
  );
  const bodyFile = path.join(options.outDir, 'heal-pr-body.md');
  fs.writeFileSync(bodyFile, body);
  const summary = renderSummary(rows, extra);
  fs.writeFileSync(path.join(options.outDir, 'summary.md'), summary);
  fs.writeFileSync(
    path.join(options.outDir, 'heal-plan.json'),
    `${JSON.stringify(
      {
        hasPr,
        title,
        scenarios: rows.map((r) => ({
          scenarioPath: r.outcome.scenarioPath,
          status: r.outcome.status,
          ...r.classification,
          note: r.note,
        })),
        files: changes.map((c) => c.path),
      },
      null,
      2,
    )}\n`,
  );
  return { hasPr, title, bodyFile, summary, changes, diff };
}

function argValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function main(argv = process.argv.slice(2), env = process.env): void {
  const artifactsDir = argValue(argv, '--artifacts');
  if (!artifactsDir) {
    throw new Error('Usage: scenario-heal.ts --artifacts <dir> [--out dir] [--apply]');
  }
  const dryRun = env.SCENARIO_HEAL_DRY_RUN === 'true' || argv.includes('--dry-run');
  const existingFile = argValue(argv, '--existing-prs');
  const existing = existingFile && fs.existsSync(existingFile)
    ? (JSON.parse(fs.readFileSync(existingFile, 'utf8')) as { body?: string }[])
    : [];
  const result = runHeal({
    artifactsDir,
    repoRoot: path.resolve(argValue(argv, '--repo-root') ?? process.cwd()),
    outDir: path.resolve(argValue(argv, '--out') ?? 'tmp/scenario-heal'),
    apply: argv.includes('--apply') && !dryRun,
    runUrl: argValue(argv, '--run-url') ?? '',
    baseRef: argValue(argv, '--base-ref') ?? '',
    existingPrBodies: existing.map((pr) => pr.body ?? ''),
  });

  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, result.summary);
  console.log(result.summary);
  if (dryRun) console.log(result.diff || '(no heal diff)');
  if (env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      env.GITHUB_OUTPUT,
      [
        `has_pr=${result.hasPr && !dryRun}`,
        `title=${result.title.replace(/\n/g, ' ')}`,
        `body_file=${result.bodyFile}`,
        '',
      ].join('\n'),
    );
  }
}

if (require.main === module) {
  main();
}
