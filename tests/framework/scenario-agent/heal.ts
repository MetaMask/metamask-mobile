import { parseScenario, type Scenario } from './scenario.ts';
import type { AgentAction, AgentRunResult, StepCache } from './types.ts';

/**
 * What one scenario run left behind for CI: enough to judge the failure and,
 * when only the learned cache is stale, to build a heal PR without the
 * device. Written by scenarioTest.ts as `scenario-outcome-<name>.json`.
 */
export interface ScenarioOutcome {
  schema: 1;
  /** Repo-relative path of the `*.scenario.md`, with `/` separators. */
  scenarioPath: string;
  title: string;
  status: AgentRunResult['status'];
  failedStep: { number: number; text: string; error: string } | null;
  timers: {
    name: string;
    valid: boolean;
    reason?: string;
    /** The end step has a pinned `[check: ...]` (the original's own assert). */
    endPinned: boolean;
    untilStep: number;
  }[];
  /** QualityGatesValidator violations for the valid timers. */
  thresholdViolations: string[];
  changedSteps: CacheChange[];
  /** The cache the agent saved after the run; null when it saved none. */
  healedCache: StepCache | null;
  /** Playwright retry index of the attempt that wrote this file (0 = first). */
  attempt?: number;
  /**
   * The cache as it was before the FIRST attempt of this job. A retry replays
   * the cache the failed attempt healed, so without this the drift of the
   * first attempt would be lost.
   */
  cacheBaseline?: StepCache | null;
  /** Cached steps that resolve differently than in the baseline (cache drift). */
  cacheDrift?: CacheChange[];
  failureScreen?: string;
  modelCalls: number;
}

export interface CacheChange {
  number: number | null;
  text: string;
  /** Null for a step that had no cached entry. */
  before: AgentAction[] | null;
  after: AgentAction[];
}

export const OUTCOME_FILE_PREFIX = 'scenario-outcome-';

/** Existing cache entries that now resolve differently. New entries are not drift. */
export function computeCacheDrift(
  scenario: Scenario,
  baseline: StepCache | null,
  after: StepCache | null,
): CacheChange[] {
  if (!baseline || !after) return [];
  const numberOf = new Map<string, number>();
  for (const step of scenario.steps) {
    if (!numberOf.has(step.text)) numberOf.set(step.text, step.number);
  }
  return Object.entries(after)
    .filter(
      ([text, actions]) =>
        text in baseline &&
        JSON.stringify(baseline[text]) !== JSON.stringify(actions),
    )
    .map(([text, actions]) => ({
      number: numberOf.get(text) ?? null,
      text,
      before: baseline[text],
      after: actions,
    }));
}

export function buildScenarioOutcome(input: {
  scenario: Scenario;
  scenarioPath: string;
  result: AgentRunResult;
  cacheBefore: StepCache | null;
  cacheAfter: StepCache | null;
  thresholdViolations: string[];
  /** Cache before the first attempt; defaults to `cacheBefore`. */
  cacheBaseline?: StepCache | null;
  attempt?: number;
}): ScenarioOutcome {
  const { scenario, result, cacheBefore, cacheAfter } = input;
  const cacheBaseline = input.cacheBaseline ?? cacheBefore;
  const stepByNumber = new Map(scenario.steps.map((s) => [s.number, s]));
  const failed = result.steps.find((s) => s.error);
  return {
    schema: 1,
    scenarioPath: input.scenarioPath.split('\\').join('/'),
    title: scenario.title,
    status: result.status,
    failedStep: failed
      ? { number: failed.number, text: failed.text, error: failed.error ?? '' }
      : null,
    timers: scenario.timers.map((timer) => {
      const ran = result.timers.find((t) => t.name === timer.name);
      return {
        name: timer.name,
        valid: ran?.valid ?? false,
        ...(ran?.reason ? { reason: ran.reason } : {}),
        endPinned: Boolean(stepByNumber.get(timer.until)?.checks),
        untilStep: timer.until,
      };
    }),
    thresholdViolations: input.thresholdViolations,
    changedSteps: [...new Set(result.changedSteps)].map((number) => {
      const text = stepByNumber.get(number)?.text ?? '';
      const recorded = [...result.steps]
        .reverse()
        .find((s) => s.number === number);
      return {
        number,
        text,
        before: cacheBefore?.[text] ?? null,
        after: recorded?.actions ?? [],
      };
    }),
    healedCache: cacheAfter,
    attempt: input.attempt ?? 0,
    cacheBaseline,
    cacheDrift: computeCacheDrift(scenario, cacheBaseline, cacheAfter),
    ...(result.failureScreen ? { failureScreen: result.failureScreen } : {}),
    modelCalls: result.modelCalls,
  };
}

/**
 * Cache entries a heal writes, in step order. A failed-but-healed run writes
 * what it changed; both kinds carry the drift a retry would otherwise hide.
 * The first attempt's resolution is the real "before".
 */
export function healRows(outcome: ScenarioOutcome): CacheChange[] {
  const rows = new Map<string, CacheChange>();
  for (const step of outcome.changedSteps) {
    if (outcome.status !== 'PASS' || step.before) rows.set(step.text, step);
  }
  for (const entry of outcome.cacheDrift ?? []) rows.set(entry.text, entry);
  return [...rows.values()].sort(
    (a, b) => (a.number ?? 1e9) - (b.number ?? 1e9),
  );
}

/** passed: nothing to do. heal: draft PR with the cache. report: summary only. */
export type OutcomeCategory = 'passed' | 'heal' | 'report';

export interface Classification {
  category: OutcomeCategory;
  /** Step the outcome is about (the failed step or a timer's end step). */
  step: number | null;
  /** Why, in words a person reads in the summary, PR and Slack. */
  reason: string;
}

const report = (step: number | null, reason: string): Classification => ({
  category: 'report',
  step,
  reason,
});

/**
 * Healable means only the learned data is stale: every step ran, so all
 * pinned checks passed; no threshold failed; and each invalid timer ended on
 * a model-chosen element that the agent re-resolved after the window, or the
 * run passed but had to re-resolve cached steps. Everything else may be an
 * app bug or a real regression and is only reported.
 */
export function classifyOutcome(outcome: ScenarioOutcome): Classification {
  if (outcome.thresholdViolations.length > 0) {
    return report(
      null,
      `threshold exceeded: ${outcome.thresholdViolations.join('; ')}`,
    );
  }
  if (outcome.status === 'FAIL') {
    return report(
      outcome.failedStep?.number ?? null,
      outcome.failedStep?.error ?? 'failed without an error',
    );
  }
  const rows = healRows(outcome);
  if (outcome.status === 'PASS') {
    if (rows.length === 0 || !outcome.healedCache) {
      return { category: 'passed', step: null, reason: '' };
    }
    return {
      category: 'heal',
      step: rows[0].number,
      reason: `cache drift (run passed): re-resolved ${rows.length} cached step${rows.length === 1 ? '' : 's'}: ${rows
        .map((d) => `${d.number ?? '?'}. ${d.text}`)
        .join('; ')}`,
    };
  }

  const invalid = outcome.timers.filter((t) => !t.valid);
  const changed = new Set(outcome.changedSteps.map((s) => s.number));
  const pinned = invalid.find((t) => t.endPinned);
  if (pinned) {
    return report(
      pinned.untilStep,
      `pinned end check of "${pinned.name}": ${pinned.reason ?? 'did not hold'}`,
    );
  }
  const notHealed =
    invalid.find((t) => /already on screen/.test(t.reason ?? '')) ??
    invalid.find((t) => !changed.has(t.untilStep));
  if (notHealed) {
    return report(
      notHealed.untilStep,
      `"${notHealed.name}": ${notHealed.reason ?? 'invalid'}${changed.has(notHealed.untilStep) ? '' : '; the end step was not re-resolved'}`,
    );
  }
  if (invalid.length === 0) {
    return report(null, 'INVALID_MEASUREMENT without an invalid timer');
  }
  if (!outcome.healedCache || outcome.changedSteps.length === 0) {
    return report(invalid[0].untilStep, 'the run saved no healed cache');
  }
  return {
    category: 'heal',
    step: invalid[0].untilStep,
    reason: invalid
      .map((t) => `"${t.name}": ${t.reason ?? 'invalid'}`)
      .join('; '),
  };
}

export interface FileChange {
  path: string;
  before: string | null;
  after: string;
}

export const cachePathOf = (scenarioPath: string) =>
  scenarioPath.replace(/\.md$/, '.cache.json');

/**
 * The heal for one outcome: the re-resolved entries written onto the cache
 * committed on the branch. Every other entry, and the Markdown, stay as they
 * are.
 */
export function buildHealChanges(
  outcome: ScenarioOutcome,
  readFile: (repoPath: string) => string | null,
): { changes: FileChange[]; notes: string[] } {
  const path = cachePathOf(outcome.scenarioPath);
  const before = readFile(path);
  let base: StepCache = {};
  try {
    base = before === null ? {} : (JSON.parse(before) as StepCache);
  } catch {
    return {
      changes: [],
      notes: [`${path} is not valid JSON on the base branch`],
    };
  }
  const notes: string[] = [];
  const next: StepCache = { ...base };
  for (const row of healRows(outcome)) {
    if (row.before && !(row.text in base)) {
      notes.push(
        `step ${row.number ?? '?'}: no cached entry on the base branch`,
      );
      continue;
    }
    next[row.text] = outcome.healedCache?.[row.text] ?? row.after;
  }
  const after = `${JSON.stringify(next, null, 2)}\n`;
  return {
    changes: after === before ? [] : [{ path, before, after }],
    notes,
  };
}

const ACTION_TYPES = new Set([
  'tap',
  'type',
  'swipe',
  'dismissKeyboard',
  'expect',
]);
const ALLOWED_PATH =
  /^tests\/performance\/(?:[\w.-]+\/)*[\w.-]+\.scenario\.cache\.json$/;

/**
 * Rule violations for a heal; empty when every change is allowed. A heal
 * only ever writes `*.scenario.cache.json`, keyed by the do/expect steps of
 * its scenario, with known action types.
 */
export function healRuleViolations(
  changes: FileChange[],
  readFile: (repoPath: string) => string | null,
): string[] {
  return changes.flatMap(({ path, after }) => {
    if (!ALLOWED_PATH.test(path) || path.includes('..')) {
      return [`${path}: only *.scenario.cache.json may change`];
    }
    let cache: unknown;
    try {
      cache = JSON.parse(after);
    } catch {
      return [`${path}: not valid JSON`];
    }
    if (typeof cache !== 'object' || cache === null || Array.isArray(cache)) {
      return [`${path}: must map step text to actions`];
    }
    const markdown = readFile(path.replace(/\.cache\.json$/, '.md'));
    if (markdown === null) return [`${path}: its scenario is missing`];
    const learnable = new Set(
      parseScenario(markdown)
        .steps.filter((s) => s.kind === 'do' || s.kind === 'expect')
        .map((s) => s.text),
    );
    return Object.entries(cache as Record<string, unknown>).flatMap(
      ([text, actions]) => [
        ...(learnable.has(text)
          ? []
          : [`${path}: "${text}" is not a do/expect step of the scenario`]),
        ...(Array.isArray(actions) &&
        actions.every((a) =>
          ACTION_TYPES.has((a as { type?: string } | null)?.type ?? ''),
        )
          ? []
          : [`${path}: "${text}" has an unknown action`]),
      ],
    );
  });
}

export const HEAL_MARKER = 'perf-scenario-heal';

/** Dedupe key for one healed scenario step. */
export const healKey = (outcome: ScenarioOutcome, step: number | null) =>
  `${outcome.scenarioPath}#${step ?? 0}`;

/** Every step a heal PR for this outcome proposes (one marker each). */
export function healKeys(
  outcome: ScenarioOutcome,
  classification: Classification,
): string[] {
  const steps = new Set<number | null>([classification.step]);
  for (const row of healRows(outcome)) steps.add(row.number);
  return [...steps].map((step) => healKey(outcome, step));
}

export interface ExistingHealPr {
  url?: string;
  body?: string;
  /** Head commit of the open heal PR. */
  headSha?: string;
}

const HEAL_KEY_PATTERN = new RegExp(`<!-- ${HEAL_MARKER}: (.+?) -->`, 'g');

/** Open heal PRs keyed by the scenario step they already propose. */
export function indexHealPrs(
  prs: ExistingHealPr[],
): Map<string, ExistingHealPr> {
  const indexed = new Map<string, ExistingHealPr>();
  for (const pr of prs) {
    for (const match of (pr.body ?? '').matchAll(HEAL_KEY_PATTERN)) {
      if (!indexed.has(match[1])) indexed.set(match[1], pr);
    }
  }
  return indexed;
}

/** One healed scenario to announce in #mm-qa-legends-ai-alerts. */
export interface SlackHealNotice {
  scenario: string;
  /** The run passed and only the cache was stale. */
  drift: boolean;
  step: number | null;
  reason: string;
  runUrl: string;
  heJobUrls: string[];
  /** Set when an open heal PR already covers this step. */
  prUrl: string;
  commitSha: string;
  commitUrl: string;
}

/**
 * Fills in the PR and commit for notices whose PR this run is about to open.
 * Notices that still have no PR (the open step failed) are dropped.
 */
export function completeSlackNotices(
  notices: SlackHealNotice[],
  opened?: { prUrl: string; commitSha: string; repositoryUrl: string },
): SlackHealNotice[] {
  return notices.flatMap((notice) => {
    if (notice.prUrl && notice.commitSha) return [notice];
    if (!opened?.prUrl || !opened.commitSha) return [];
    return [
      {
        ...notice,
        prUrl: opened.prUrl,
        commitSha: opened.commitSha,
        commitUrl: opened.repositoryUrl
          ? `${opened.repositoryUrl.replace(/\/$/, '')}/commit/${opened.commitSha}`
          : '',
      },
    ];
  });
}

/** Slack text for heals. Empty when there is nothing to announce. */
export function renderHealSlackMessage(notices: SlackHealNotice[]): string {
  return notices
    .map((notice) =>
      [
        `${notice.drift ? 'Cache drift in performance scenario (run passed, cache was stale)' : 'Repairable performance scenario'}: ${notice.scenario}`,
        `${notice.drift ? 'First re-resolved step' : 'Failed step'}: ${notice.step ?? 'n/a'}`,
        `Reason: ${notice.reason}`,
        `Run: ${notice.runUrl || 'n/a'}`,
        notice.heJobUrls.length
          ? `HyperExecute: ${notice.heJobUrls.join(', ')}`
          : '',
        `Heal PR: ${notice.prUrl}`,
        `Commit: ${notice.commitSha}${notice.commitUrl ? ` (${notice.commitUrl})` : ''}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

export const summarizeActions = (actions: AgentAction[] | null): string =>
  !actions || actions.length === 0
    ? '_none_'
    : actions
        .map((a) =>
          'locator' in a && a.locator
            ? `${a.type} ${a.locator.strategy}=${a.locator.value}`
            : a.type,
        )
        .join(', ');

const cell = (value: string) =>
  value.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 300);

export interface HealedScenario {
  outcome: ScenarioOutcome;
  classification: Classification;
  changes: FileChange[];
  notes: string[];
}

export function renderHealPr(
  healed: HealedScenario[],
  links: { runUrl: string; heJobUrls: string[]; baseRef: string },
): { title: string; body: string } {
  const names = healed.map((h) =>
    h.outcome.scenarioPath.split('/').pop()?.replace('.scenario.md', ''),
  );
  const lines = [
    `Automated heal of agent-driven performance scenarios after [this run](${links.runUrl}).`,
    '',
    `Base: \`${links.baseRef}\`. Only \`*.scenario.cache.json\` files change; step wording, pins, timers and thresholds are untouched (enforced in code).`,
    '',
  ];
  for (const { outcome, classification, changes, notes } of healed) {
    const drift = outcome.status === 'PASS';
    lines.push(
      `### ${outcome.title}`,
      '',
      `- Scenario: \`${outcome.scenarioPath}\``,
      `- Run status: ${outcome.status}${drift ? ` (valid measurement; the run passed${outcome.attempt ? ` on retry ${outcome.attempt}` : ''}, so the committed cache is stale)` : ''}`,
      `- ${drift ? 'First re-resolved step' : 'Failed step'}: ${classification.step ?? 'n/a'}`,
      `- Reason: ${classification.reason}`,
      '',
      '| Step | Old action | New action |',
      '| --- | --- | --- |',
      ...healRows(outcome).map(
        (s) =>
          `| ${s.number ?? '?'}. ${cell(s.text)} | ${cell(summarizeActions(s.before))} | ${cell(summarizeActions(s.after))} |`,
      ),
      ...notes.map((n) => `- Not applied: ${n}`),
      `- Files: ${changes.map((c) => `\`${c.path}\``).join(', ')}`,
      ...healKeys(outcome, classification).map(
        (key) => `<!-- ${HEAL_MARKER}: ${key} -->`,
      ),
      '',
    );
  }
  lines.push(
    `HyperExecute: ${links.heJobUrls.length ? links.heJobUrls.join(', ') : 'see the run'}`,
    '',
    'Review the new actions against the screen before merging. This PR is never merged automatically.',
  );
  return {
    title: `test(perf): heal scenario cache for ${names.join(', ')}`,
    body: lines.join('\n'),
  };
}

const ACTION_BY_CATEGORY: Record<OutcomeCategory, string> = {
  passed: 'none',
  heal: 'heal PR',
  report: 'report only',
};

export function renderSummary(
  rows: {
    outcome: ScenarioOutcome;
    classification: Classification;
    note?: string;
  }[],
  extra: string[] = [],
): string {
  const lines = [
    '## Agent-driven scenario results',
    '',
    '| Scenario | Status | Action | Step | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      ({ outcome, classification, note }) =>
        `| ${cell(outcome.title)} | ${outcome.status} | ${cell(note ?? ACTION_BY_CATEGORY[classification.category])} | ${classification.step ?? ''} | ${cell(classification.reason)} |`,
    ),
  ];
  if (rows.length === 0)
    lines.push('', '_No scenario outcomes were found in the artifacts._');
  if (extra.length) lines.push('', ...extra);
  return `${lines.join('\n')}\n`;
}
