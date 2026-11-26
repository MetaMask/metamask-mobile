import type {
  ApiCallsSummary,
  ApiStepAttribution,
  ApiStepSummary,
  MetricStep,
  MetricsEntry,
  NetworkLogEntry,
} from '../types';
import { DEFAULT_TOP_ENDPOINTS, summarizeApiCalls } from './summarizeApiCalls';

export const UNATTRIBUTED_STEP = 'unattributed';

/**
 * A tap triggers requests slightly before `measure()` records its start, so
 * calls up to this long before a step start belong to that step.
 */
export const PRE_ROLL_MS = 750;
/** Longest span after a step ends in which calls are still tied to it. */
export const AFTER_MAX_MS = 5_000;

/**
 * Slack around the real test window: the HAR starts with the TestMu session
 * (before the test) and keeps recording through teardown (after it), and the
 * two clocks can differ by a few seconds.
 */
export const TEST_WINDOW_TOLERANCE_MS = 30_000;
/** Share of calls (0-1) outside the test window that flags clock skew. */
export const SKEW_OUTSIDE_WINDOW_SHARE = 0.3;
/** Below this many timestamped calls the share thresholds are not trusted. */
export const SKEW_MIN_CALLS = 10;

interface StepWindow {
  name: string;
  startedAt: number;
  endedAt: number;
}

export interface TestWindow {
  /** Epoch ms. */
  start: number;
  /** Epoch ms. */
  end: number;
}

function getStepWindows(steps: MetricStep[]): StepWindow[] {
  const windows: StepWindow[] = [];
  for (const { name, startedAt, endedAt } of steps) {
    if (
      typeof startedAt === 'number' &&
      typeof endedAt === 'number' &&
      Number.isFinite(startedAt) &&
      Number.isFinite(endedAt) &&
      endedAt >= startedAt
    ) {
      windows.push({ name, startedAt, endedAt });
    }
  }
  return windows;
}

interface Owner {
  name: string;
  phase: 'during' | 'after';
}

/** Keeps the first candidate unless a later one is strictly better. */
function pickBest(
  candidates: StepWindow[],
  isBetter: (candidate: StepWindow, best: StepWindow) => boolean,
): StepWindow | null {
  let best: StepWindow | null = null;
  for (const candidate of candidates) {
    if (!best || isBetter(candidate, best)) {
      best = candidate;
    }
  }
  return best;
}

const lengthOf = (win: StepWindow): number => win.endedAt - win.startedAt;

/**
 * Picks the step owning a call that started at `time`, by strict precedence
 * `during` > pre-roll > `after`, so a call is counted once.
 *
 * `during`: inside a window (inclusive). For nested or overlapping timers the
 * shortest window wins (innermost), then the latest start.
 *
 * Pre-roll (counted as `during`): up to PRE_ROLL_MS before a start. The
 * nearest following start wins, then the shortest window.
 *
 * `after`: up to AFTER_MAX_MS after an end. The most recently ended step wins,
 * then the shortest window. A next step's own `during` or pre-roll outranks
 * this, so `after` stops when the next step begins.
 *
 * Remaining ties go to the earliest recorded step, so the result depends only
 * on the step list.
 */
function findOwner(windows: StepWindow[], time: number): Owner | null {
  const during = pickBest(
    windows.filter((win) => time >= win.startedAt && time <= win.endedAt),
    (win, best) =>
      lengthOf(win) < lengthOf(best) ||
      (lengthOf(win) === lengthOf(best) && win.startedAt > best.startedAt),
  );
  if (during) {
    return { name: during.name, phase: 'during' };
  }

  const preRoll = pickBest(
    windows.filter(
      (win) => time < win.startedAt && time >= win.startedAt - PRE_ROLL_MS,
    ),
    (win, best) =>
      win.startedAt < best.startedAt ||
      (win.startedAt === best.startedAt && lengthOf(win) < lengthOf(best)),
  );
  if (preRoll) {
    return { name: preRoll.name, phase: 'during' };
  }

  const after = pickBest(
    windows.filter(
      (win) => time > win.endedAt && time <= win.endedAt + AFTER_MAX_MS,
    ),
    (win, best) =>
      win.endedAt > best.endedAt ||
      (win.endedAt === best.endedAt && lengthOf(win) < lengthOf(best)),
  );
  return after ? { name: after.name, phase: 'after' } : null;
}

function spansIntersect(
  timestamped: NetworkLogEntry[],
  windows: StepWindow[],
): boolean {
  const harStart = Math.min(...timestamped.map((call) => call.startedAt ?? 0));
  const harEnd = Math.max(
    ...timestamped.map((call) => (call.startedAt ?? 0) + (call.time ?? 0)),
  );
  const stepsStart = Math.min(...windows.map((win) => win.startedAt));
  const stepsEnd = Math.max(...windows.map((win) => win.endedAt));
  return harEnd >= stepsStart && harStart <= stepsEnd;
}

/**
 * Whether a network log's timespan intersects the measured steps' timespan.
 * Used to pick the right session HAR when a test ran more than once.
 */
export function networkLogOverlapsSteps(
  apiCalls: NetworkLogEntry[] | null | undefined,
  steps: MetricStep[] | undefined,
): boolean {
  const windows = getStepWindows(steps ?? []);
  const timestamped = (apiCalls ?? []).filter((call) =>
    Number.isFinite(call.startedAt),
  );
  return (
    windows.length > 0 &&
    timestamped.length > 0 &&
    spansIntersect(timestamped, windows)
  );
}

/**
 * Calls before the first step or between steps (app launch, login, setup) are
 * normal, so the share of unattributed calls says nothing about alignment.
 * Skew is judged only against the real test window, and `no_overlap` when
 * the HAR timespan and the step timespan do not intersect at all.
 */
function evaluateSkew(
  attribution: Omit<ApiStepAttribution, 'status' | 'reason'>,
  timestamped: NetworkLogEntry[],
  windows: StepWindow[],
): Pick<ApiStepAttribution, 'status' | 'reason'> {
  if (
    timestamped.length >= SKEW_MIN_CALLS &&
    attribution.outsideTestWindow / timestamped.length >=
      SKEW_OUTSIDE_WINDOW_SHARE
  ) {
    return {
      status: 'skewed',
      reason: `${attribution.outsideTestWindow}/${timestamped.length} calls start outside the test window`,
    };
  }

  if (attribution.attributed === 0 && !spansIntersect(timestamped, windows)) {
    return {
      status: 'no_overlap',
      reason: 'the network log and the measured steps do not overlap in time',
    };
  }

  return { status: 'ok' };
}

/**
 * Assigns each call to a measured step by its start time (see `findOwner`
 * for the `during` > pre-roll > `after` precedence); the rest go to
 * `unattributed`. `after` calls are summarized separately from `during`.
 *
 * `testWindow` (the real test start/end, epoch ms) only feeds the clock-skew
 * check; without it, calls are never flagged as outside the test window.
 */
export function attributeApiCallsToSteps(
  apiCalls: NetworkLogEntry[],
  steps: MetricStep[],
  testWindow?: TestWindow | null,
  topN: number = DEFAULT_TOP_ENDPOINTS,
): { steps: ApiStepSummary[]; attribution: ApiStepAttribution } {
  const windows = getStepWindows(steps);
  const timestamped = apiCalls.filter((call) =>
    Number.isFinite(call.startedAt),
  );

  if (windows.length === 0 || timestamped.length === 0) {
    return {
      steps: [],
      attribution: {
        status: 'unavailable',
        attributed: 0,
        unattributed: apiCalls.length,
        outsideTestWindow: 0,
        missingTimestamp: apiCalls.length - timestamped.length,
        reason:
          windows.length === 0
            ? 'no timer windows recorded'
            : 'no request timestamps in the network log',
      },
    };
  }

  const bucketKey = (name: string, phase: Owner['phase']): string =>
    `${phase}\u0000${name}`;
  const buckets = new Map<string, NetworkLogEntry[]>();
  for (const { name } of windows) {
    buckets.set(bucketKey(name, 'during'), []);
  }
  for (const { name } of windows) {
    buckets.set(bucketKey(name, 'after'), []);
  }
  const unattributedCalls: NetworkLogEntry[] = [];
  let outsideTestWindow = 0;

  for (const call of apiCalls) {
    const time = call.startedAt;
    const owner =
      typeof time === 'number' && Number.isFinite(time)
        ? findOwner(windows, time)
        : null;
    if (owner) {
      buckets.get(bucketKey(owner.name, owner.phase))?.push(call);
      continue;
    }
    unattributedCalls.push(call);
  }

  if (testWindow) {
    outsideTestWindow = timestamped.filter(
      ({ startedAt }) =>
        (startedAt as number) < testWindow.start - TEST_WINDOW_TOLERANCE_MS ||
        (startedAt as number) > testWindow.end + TEST_WINDOW_TOLERANCE_MS,
    ).length;
  }

  const summaries: ApiStepSummary[] = [];
  const addSummary = (
    step: string,
    phase: ApiStepSummary['phase'],
    calls: NetworkLogEntry[],
  ): void => {
    const summary = summarizeApiCalls(calls, null, topN);
    if (calls.length > 0 && summary?.status === 'captured') {
      summaries.push({
        step,
        phase,
        total: summary.total,
        appTotal: summary.app.total,
        failed: summary.failed,
        topEndpoints: summary.topEndpoints,
      });
    }
  };
  for (const [key, calls] of buckets) {
    const [phase, step] = key.split('\u0000');
    addSummary(step, phase as Owner['phase'], calls);
  }
  addSummary(UNATTRIBUTED_STEP, 'none', unattributedCalls);

  const base = {
    attributed: apiCalls.length - unattributedCalls.length,
    unattributed: unattributedCalls.length,
    outsideTestWindow,
    missingTimestamp: apiCalls.length - timestamped.length,
  };

  return {
    steps: summaries,
    attribution: { ...base, ...evaluateSkew(base, timestamped, windows) },
  };
}

/**
 * Real test window recorded by the reporter from Playwright's `startTime` and
 * `duration`. Returns null when either bound is missing.
 */
export function getTestWindow(
  metric: Pick<MetricsEntry, 'testStartedAt' | 'testEndedAt'>,
): TestWindow | null {
  const { testStartedAt: start, testEndedAt: end } = metric;
  return typeof start === 'number' &&
    typeof end === 'number' &&
    Number.isFinite(start) &&
    Number.isFinite(end)
    ? { start, end }
    : null;
}

/**
 * `summarizeApiCalls` plus the per-step breakdown and clock-skew verdict for
 * captured logs. Errors and "not attempted" pass through unchanged.
 */
export function summarizeApiCallsByStep(
  metric: Partial<
    Pick<
      MetricsEntry,
      'apiCalls' | 'apiCallsError' | 'steps' | 'testStartedAt' | 'testEndedAt'
    >
  >,
): ApiCallsSummary | null {
  const summary = summarizeApiCalls(metric.apiCalls, metric.apiCallsError);
  if (summary?.status !== 'captured' || !metric.apiCalls) {
    return summary;
  }
  const { steps, attribution } = attributeApiCallsToSteps(
    metric.apiCalls,
    metric.steps ?? [],
    getTestWindow(metric),
  );
  return { ...summary, steps, stepAttribution: attribution };
}
