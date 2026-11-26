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

/**
 * Picks the step owning a call that started at `time`. Windows are inclusive.
 * When several contain it (nested or overlapping timers) the shortest window
 * wins (innermost), then the latest start, then the earliest recorded step, so
 * the result never depends on anything but the step list order.
 */
function findOwningStep(windows: StepWindow[], time: number): string | null {
  let best: StepWindow | null = null;
  for (const win of windows) {
    if (time < win.startedAt || time > win.endedAt) {
      continue;
    }
    if (!best) {
      best = win;
      continue;
    }
    const length = win.endedAt - win.startedAt;
    const bestLength = best.endedAt - best.startedAt;
    if (
      length < bestLength ||
      (length === bestLength && win.startedAt > best.startedAt)
    ) {
      best = win;
    }
  }
  return best?.name ?? null;
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

  if (attribution.attributed === 0) {
    const harStart = Math.min(
      ...timestamped.map((call) => call.startedAt ?? 0),
    );
    const harEnd = Math.max(
      ...timestamped.map((call) => (call.startedAt ?? 0) + (call.time ?? 0)),
    );
    const stepsStart = Math.min(...windows.map((win) => win.startedAt));
    const stepsEnd = Math.max(...windows.map((win) => win.endedAt));
    if (harEnd < stepsStart || harStart > stepsEnd) {
      return {
        status: 'no_overlap',
        reason: 'the network log and the measured steps do not overlap in time',
      };
    }
  }

  return { status: 'ok' };
}

/**
 * Assigns each call to the measured step whose [startedAt, endedAt] window
 * contains the call's start time; the rest go to `unattributed`.
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

  const buckets = new Map<string, NetworkLogEntry[]>(
    windows.map((win) => [win.name, []]),
  );
  const unattributedCalls: NetworkLogEntry[] = [];
  let outsideTestWindow = 0;

  for (const call of apiCalls) {
    const time = call.startedAt;
    const owner =
      typeof time === 'number' && Number.isFinite(time)
        ? findOwningStep(windows, time)
        : null;
    if (owner) {
      buckets.get(owner)?.push(call);
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
  const addSummary = (step: string, calls: NetworkLogEntry[]) => {
    const summary = summarizeApiCalls(calls, null, topN);
    if (calls.length > 0 && summary?.status === 'captured') {
      summaries.push({
        step,
        total: summary.total,
        failed: summary.failed,
        topEndpoints: summary.topEndpoints,
      });
    }
  };
  for (const [step, calls] of buckets) {
    addSummary(step, calls);
  }
  addSummary(UNATTRIBUTED_STEP, unattributedCalls);

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
