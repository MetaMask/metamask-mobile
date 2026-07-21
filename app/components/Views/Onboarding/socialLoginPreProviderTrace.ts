import {
  endTrace,
  trace,
  TraceContext,
  TraceName,
  TraceOperation,
  TraceValue,
} from '../../../util/trace';

/**
 * Timing capture for the awaited operations that run between the social
 * provider CTA tap and the OAuth provider launch (TO-917).
 *
 * Timestamps are captured locally while the awaits run, and only emitted as
 * backdated Sentry spans once setupSentry() has resolved. Spans started
 * before metrics opt-in would otherwise be dropped by discardBufferedTraces()
 * or buffered without a parent link.
 */

export type SocialLoginPreProviderStep =
  | 'networkCheck'
  | 'metricsEnable'
  | 'sentrySetup';

interface StepTiming {
  start: number;
  end: number;
}

export interface SocialLoginPreProviderTimings {
  tapTime: number;
  steps: Partial<Record<SocialLoginPreProviderStep, StepTiming>>;
}

const STEP_TRACE_NAMES: Record<SocialLoginPreProviderStep, TraceName> = {
  networkCheck: TraceName.OnboardingSocialLoginNetworkCheck,
  metricsEnable: TraceName.OnboardingSocialLoginMetricsEnable,
  sentrySetup: TraceName.OnboardingSocialLoginSentrySetup,
};

const STEP_ORDER: SocialLoginPreProviderStep[] = [
  'networkCheck',
  'metricsEnable',
  'sentrySetup',
];

export const startSocialLoginPreProviderTimings =
  (): SocialLoginPreProviderTimings => ({
    tapTime: Date.now(),
    steps: {},
  });

/**
 * Run one of the pre-provider awaits while recording its wall-clock
 * boundaries. Boundaries are recorded even when the operation throws so the
 * failed step still appears in the emitted spans.
 */
export async function measureSocialLoginPreProviderStep<T>(
  timings: SocialLoginPreProviderTimings,
  step: SocialLoginPreProviderStep,
  operation: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    return await operation();
  } finally {
    timings.steps[step] = { start, end: Date.now() };
  }
}

/**
 * Emit the backdated parent span (CTA tap -> open until
 * endSocialLoginPreProviderTrace) plus one child span per recorded step.
 * Must only be called after setupSentry() has resolved.
 */
export function emitSocialLoginPreProviderTrace(
  timings: SocialLoginPreProviderTimings,
  tags: Record<string, TraceValue>,
): TraceContext {
  const parentContext = trace({
    name: TraceName.OnboardingSocialLoginPreProvider,
    op: TraceOperation.OnboardingUserJourney,
    startTime: timings.tapTime,
    tags,
  });

  for (const step of STEP_ORDER) {
    const timing = timings.steps[step];
    if (!timing) {
      continue;
    }
    trace({
      name: STEP_TRACE_NAMES[step],
      op: TraceOperation.OnboardingUserJourney,
      startTime: timing.start,
      parentContext,
    });
    endTrace({
      name: STEP_TRACE_NAMES[step],
      timestamp: timing.end,
    });
  }

  return parentContext;
}

export interface SocialLoginPreProviderOutcome {
  reachedOAuth: boolean;
  reason?: string;
  iosGoogleWarningShown?: boolean;
}

/**
 * Close the parent span. Safe to call more than once — endTrace() is a no-op
 * when the trace has already been ended.
 */
export function endSocialLoginPreProviderTrace(
  outcome: SocialLoginPreProviderOutcome,
): void {
  endTrace({
    name: TraceName.OnboardingSocialLoginPreProvider,
    data: {
      reached_oauth: outcome.reachedOAuth,
      ...(outcome.reason !== undefined ? { reason: outcome.reason } : {}),
      ...(outcome.iosGoogleWarningShown !== undefined
        ? { ios_google_warning_shown: outcome.iosGoogleWarningShown }
        : {}),
    },
  });
}
