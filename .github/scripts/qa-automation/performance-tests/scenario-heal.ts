/* eslint-disable import-x/no-nodejs-modules */
/**
 * Classifies agent-driven scenario outcomes from a performance run and builds
 * the heal (stale `*.scenario.cache.json` entries only) for healable ones.
 *
 *   yarn tsx .github/scripts/qa-automation/performance-tests/scenario-heal.ts \
 *     --artifacts <downloaded artifacts dir> [--out tmp/scenario-heal] \
 *     [--apply] [--existing-prs prs.json] [--run-url URL] [--base-ref BRANCH]
 *
 * Without --apply, or with SCENARIO_HEAL_DRY_RUN=true, nothing in the repo is
 * written: the summary, plan, PR body and heal.diff go to --out.
 * With --apply, the files are written and the working tree is checked again
 * against the heal rules; any other change reverts everything.
 *
 * After the PR is opened, `--notices <out>/slack-notices.json --pr-url URL
 * --commit-sha SHA` writes the Slack text to <out>/slack.txt.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildHealChanges,
  classifyOutcome,
  completeSlackNotices,
  healKeys,
  healRuleViolations,
  indexHealPrs,
  OUTCOME_FILE_PREFIX,
  renderHealPr,
  renderHealSlackMessage,
  renderSummary,
  type Classification,
  type ExistingHealPr,
  type SlackHealNotice,
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
  /** Open heal PRs, used to dedupe and to link the Slack message. */
  existingPrs: ExistingHealPr[];
}

export interface HealRunResult {
  hasPr: boolean;
  title: string;
  bodyFile: string;
  summary: string;
  changes: FileChange[];
  diff: string;
  /** Healed scenarios to announce. New PRs have an empty prUrl until opened. */
  slackNotices: SlackHealNotice[];
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

const readJson = <T>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    // A truncated file from a crashed task carries nothing.
    return null;
  }
};

/** Outcomes by scenario; HyperExecute may keep a -HYPL-<task> copy too. */
export function readOutcomes(artifactsDir: string): ScenarioOutcome[] {
  const byScenario = new Map<string, ScenarioOutcome>();
  for (const file of walk(artifactsDir)) {
    const name = path.basename(file);
    if (!name.startsWith(OUTCOME_FILE_PREFIX) || !name.endsWith('.json')) continue;
    const outcome = readJson<ScenarioOutcome>(file);
    if (outcome?.schema === 1 && outcome.scenarioPath) {
      byScenario.set(outcome.scenarioPath, outcome);
    }
  }
  return [...byScenario.values()].sort((a, b) =>
    a.scenarioPath.localeCompare(b.scenarioPath),
  );
}

function readHeJobUrls(artifactsDir: string): string[] {
  const urls = walk(artifactsDir)
    .filter((file) => /^hyperexecute-job-.*\.json$/.test(path.basename(file)))
    .map((file) => readJson<{ url?: string }>(file)?.url)
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
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
  const readFile = (file: string) => {
    const full = path.join(repoRoot, file);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  };
  const changed = git('status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
  const expected = new Set(changes.map((c) => c.path));
  const violations = [
    ...changed
      .filter((file) => !expected.has(file))
      .map((file) => `${file}: changed but not part of the heal`),
    ...healRuleViolations(
      changed.map((file) => ({
        path: file,
        before: null,
        after: readFile(file) ?? '',
      })),
      readFile,
    ),
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
  const heJobUrls = readHeJobUrls(options.artifactsDir);
  const openPrs = indexHealPrs(options.existingPrs);
  const rows: Parameters<typeof renderSummary>[0] = [];
  const healed: HealedScenario[] = [];
  const slackNotices: SlackHealNotice[] = [];
  const extra: string[] = [];
  const noticeFor = (
    outcome: ScenarioOutcome,
    classification: Classification,
    pr?: ExistingHealPr,
  ): SlackHealNotice => ({
    scenario: outcome.title,
    drift: outcome.status === 'PASS',
    step: classification.step,
    reason: classification.reason,
    runUrl: options.runUrl,
    heJobUrls,
    prUrl: pr?.url ?? '',
    commitSha: pr?.headSha ?? '',
    commitUrl: '',
  });

  for (const outcome of readOutcomes(options.artifactsDir)) {
    const classification = classifyOutcome(outcome);
    if (classification.category !== 'heal') {
      rows.push({ outcome, classification });
      continue;
    }
    // Already proposed when every step this heal covers is in an open heal PR.
    const keys = healKeys(outcome, classification);
    const existing = keys.every((key) => openPrs.has(key))
      ? openPrs.get(keys[0])
      : undefined;
    if (existing) {
      rows.push({ outcome, classification, note: 'already proposed by an open heal PR' });
      slackNotices.push(noticeFor(outcome, classification, existing));
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
    rows.push({ outcome, classification });
    healed.push({ outcome, classification, changes, notes });
    slackNotices.push(noticeFor(outcome, classification));
  }

  let changes = healed.flatMap((h) => h.changes);
  const violations = healRuleViolations(changes, readFile);
  if (violations.length > 0) {
    extra.push(
      '**Heal aborted.** The diff would touch more than scenario caches:',
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
  // A blocked heal must not announce a PR that was never opened.
  const notices = hasPr
    ? slackNotices
    : slackNotices.filter((notice) => notice.prUrl);
  const { title, body } = renderHealPr(hasPr ? healed : [], {
    runUrl: options.runUrl,
    heJobUrls,
    baseRef: options.baseRef,
  });
  const bodyFile = path.join(options.outDir, 'heal-pr-body.md');
  fs.writeFileSync(bodyFile, body);
  const summary = renderSummary(rows, extra);
  fs.writeFileSync(path.join(options.outDir, 'summary.md'), summary);
  const writeJson = (name: string, value: unknown) =>
    fs.writeFileSync(
      path.join(options.outDir, name),
      `${JSON.stringify(value, null, 2)}\n`,
    );
  writeJson('heal-plan.json', {
    hasPr,
    title,
    scenarios: rows.map((r) => ({
      scenarioPath: r.outcome.scenarioPath,
      status: r.outcome.status,
      ...r.classification,
      note: r.note,
    })),
    files: changes.map((c) => c.path),
  });
  writeJson('slack-notices.json', notices);
  return { hasPr, title, bodyFile, summary, changes, diff, slackNotices: notices };
}

function argValue(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  return index >= 0 ? (argv[index + 1] ?? '') : '';
}

export function main(argv = process.argv.slice(2), env = process.env): void {
  const outDir = path.resolve(argValue(argv, '--out') || 'tmp/scenario-heal');
  const noticesFile = argValue(argv, '--notices');
  if (noticesFile) {
    const text = renderHealSlackMessage(
      completeSlackNotices(readJson<SlackHealNotice[]>(noticesFile) ?? [], {
        prUrl: argValue(argv, '--pr-url'),
        commitSha: argValue(argv, '--commit-sha'),
        repositoryUrl: argValue(argv, '--repository-url'),
      }),
    );
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'slack.txt'), text);
    console.log(text || 'Nothing to post to Slack.');
    return;
  }

  const artifactsDir = argValue(argv, '--artifacts');
  if (!artifactsDir) {
    throw new Error('Usage: scenario-heal.ts --artifacts <dir> [--out dir] [--apply]');
  }
  const dryRun = env.SCENARIO_HEAL_DRY_RUN === 'true' || argv.includes('--dry-run');
  const existingFile = argValue(argv, '--existing-prs');
  const existing =
    (existingFile &&
      readJson<(ExistingHealPr & { headRefOid?: string })[]>(existingFile)) ||
    [];
  const result = runHeal({
    artifactsDir,
    repoRoot: path.resolve(argValue(argv, '--repo-root') || process.cwd()),
    outDir,
    apply: argv.includes('--apply') && !dryRun,
    runUrl: argValue(argv, '--run-url'),
    baseRef: argValue(argv, '--base-ref'),
    existingPrs: existing.map((pr) => ({
      url: pr.url,
      body: pr.body,
      headSha: pr.headSha ?? pr.headRefOid,
    })),
  });

  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, result.summary);
  }
  console.log(result.summary);
  if (dryRun) {
    // A dry run opens no PR: show the message with placeholders instead of posting.
    const preview = renderHealSlackMessage(
      completeSlackNotices(result.slackNotices, {
        prUrl: '(the draft PR this run would open)',
        commitSha: '(the heal commit)',
        repositoryUrl: '',
      }),
    );
    console.log(result.diff || '(no heal diff)');
    console.log(preview ? `Would post to Slack:\n${preview}` : 'Would not post to Slack.');
  }
  if (env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      env.GITHUB_OUTPUT,
      [
        `has_pr=${result.hasPr && !dryRun}`,
        `notify_slack=${result.slackNotices.length > 0 && !dryRun}`,
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
