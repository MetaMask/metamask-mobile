import type { Scenario } from './scenario.ts';
import type { AgentAction, AgentRunResult, StepCache } from './types.ts';

/**
 * What one scenario run left behind for CI: enough to judge the failure and,
 * when only the learned cache is stale, to show the corrected cache entries
 * without the device. Written by scenarioTest.ts as
 * `scenario-outcome-<name>.json`.
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
  /**
   * Step text -> why its cached resolution failed, in this attempt or an
   * earlier one of the same job.
   */
  cacheErrors?: Record<string, string>;
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
  /** cacheErrors of an earlier attempt of the same job. */
  earlierCacheErrors?: Record<string, string>;
  attempt?: number;
}): ScenarioOutcome {
  const { scenario, result, cacheBefore, cacheAfter } = input;
  const cacheBaseline = input.cacheBaseline ?? cacheBefore;
  const stepByNumber = new Map(scenario.steps.map((s) => [s.number, s]));
  const failed = result.steps.find((s) => s.error);
  const cacheErrors = { ...input.earlierCacheErrors };
  for (const step of result.steps) {
    if (step.cacheError) cacheErrors[step.text] = step.cacheError;
  }
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
    cacheErrors,
    ...(result.failureScreen ? { failureScreen: result.failureScreen } : {}),
    modelCalls: result.modelCalls,
  };
}

/**
 * Cache entries the agent corrected, in step order: what a failed run changed,
 * plus the drift a retry would otherwise hide. The first attempt's resolution
 * is the real "before".
 */
export function cacheCorrections(outcome: ScenarioOutcome): CacheChange[] {
  const rows = new Map<string, CacheChange>();
  for (const step of outcome.changedSteps) {
    if (outcome.status !== 'PASS' || step.before) rows.set(step.text, step);
  }
  for (const entry of outcome.cacheDrift ?? []) rows.set(entry.text, entry);
  return [...rows.values()].sort(
    (a, b) => (a.number ?? 1e9) - (b.number ?? 1e9),
  );
}

/**
 * passed: nothing to do. heal: the corrected cache entries are safe to copy.
 * report: a possible app bug or regression; the reason says why.
 */
export type OutcomeCategory = 'passed' | 'heal' | 'report';

export interface Classification {
  category: OutcomeCategory;
  /** Step the outcome is about (the failed step or a timer's end step). */
  step: number | null;
  /** Why, in words a person reads in the summary. */
  reason: string;
}

const report = (step: number | null, reason: string): Classification => ({
  category: 'report',
  step,
  reason,
});

/**
 * Heal means only the learned data is stale: every step ran, so all
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
  const rows = cacheCorrections(outcome);
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

export const cachePathOf = (scenarioPath: string) =>
  scenarioPath.replace(/\.md$/, '.cache.json');

export const summarizeActions = (actions: AgentAction[] | null): string =>
  !actions || actions.length === 0
    ? '_none_'
    : actions
        .map((a) =>
          'locator' in a && a.locator
            ? `${a.type} ${a.locator.strategy}=${a.locator.value}`
            : a.type === 'swipe'
              ? `swipe ${a.direction}`
              : a.type,
        )
        .join(', ');

const cell = (value: string) =>
  value.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 300);

const code = (value: string) => `\`${value.replace(/`/g, "'")}\``;

/** One cache entry as it appears inside `*.scenario.cache.json`. */
export function cacheEntrySnippet(
  text: string,
  actions: AgentAction[],
): string {
  return JSON.stringify({ [text]: actions }, null, 2)
    .split('\n')
    .slice(1, -1)
    .map((line) => line.slice(2))
    .join('\n');
}

const STATUS_LABEL: Record<OutcomeCategory, string> = {
  passed: 'passed',
  heal: 'cache fix below',
  report: 'report only',
};

/**
 * The job summary: every scenario's status, and for each step whose cache
 * failed or drifted, the old action, the error, the agent's correction and,
 * when every pinned check and threshold passed, the entry to paste into the
 * cache. Only cache entries are ever suggested; pins, timers and thresholds
 * live in the Markdown and are never part of a fix.
 */
export function renderCacheReport(outcomes: ScenarioOutcome[]): string {
  const lines = ['## Agent-driven scenario results', ''];
  if (outcomes.length === 0) {
    return `${[...lines, '_No scenario outcomes were found in the artifacts._'].join('\n')}\n`;
  }
  lines.push(
    '| Scenario | Status | Cache | Reason |',
    '| --- | --- | --- | --- |',
    ...outcomes.map((outcome) => {
      const { category, reason } = classifyOutcome(outcome);
      return `| ${cell(outcome.title)} | ${outcome.status} | ${STATUS_LABEL[category]} | ${cell(reason)} |`;
    }),
  );
  for (const outcome of outcomes) {
    const rows = cacheCorrections(outcome);
    if (rows.length === 0) continue;
    const { category, reason } = classifyOutcome(outcome);
    const cachePath = cachePathOf(outcome.scenarioPath);
    lines.push(
      '',
      `### ${outcome.title}`,
      '',
      `${code(outcome.scenarioPath)}: ${outcome.status}${outcome.attempt ? ` on retry ${outcome.attempt}` : ''}${reason ? `. ${reason}` : ''}`,
    );
    for (const row of rows) {
      const after = outcome.healedCache?.[row.text] ?? row.after;
      lines.push(
        '',
        `**Step ${row.number ?? '?'}. ${row.text}**`,
        '',
        `- Cached: ${row.before ? code(summarizeActions(row.before)) : '_none (learned in this run)_'}`,
        `- Failed: ${outcome.cacheErrors?.[row.text] ?? (row.before ? 'resolved differently in an earlier attempt' : 'not cached yet')}`,
        `- Haiku's correction: ${code(summarizeActions(after))}`,
      );
      if (category === 'heal') {
        lines.push(
          '',
          `Paste into ${code(cachePath)}, replacing the entry with the same key:`,
          '',
          '```json',
          cacheEntrySnippet(row.text, after),
          '```',
        );
      } else {
        lines.push(
          '- Not suggested for the cache: the run did not pass every pinned check and threshold, so fix that first.',
        );
      }
    }
  }
  return `${lines.join('\n')}\n`;
}
