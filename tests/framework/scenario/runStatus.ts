import type {
  HealEvent,
  HealPolicy,
  ScenarioRunStatus,
  StepOutcome,
  TimerOutcome,
} from './types.ts';

const HEAL_POLICIES: readonly HealPolicy[] = ['off', 'report', 'fail'];

/** Reads `PERF_HEAL_POLICY` (default `report`). */
export function resolveHealPolicy(
  value: string | undefined = process.env.PERF_HEAL_POLICY,
): HealPolicy {
  if (value === undefined || value === '') {
    return 'report';
  }
  if (!HEAL_POLICIES.includes(value as HealPolicy)) {
    throw new Error(
      `PERF_HEAL_POLICY must be one of ${HEAL_POLICIES.join(', ')} (got "${value}")`,
    );
  }
  return value as HealPolicy;
}

/**
 * Most severe first:
 * - FAIL_FUNCTIONAL: a step could not be completed by any allowed tier.
 * - INVALID_MEASUREMENT: a timer's end condition failed with the locked
 * locators, so its duration is not comparable and is not reported.
 * - FAIL_THRESHOLD: every timer is valid but a quality gate failed.
 * - PASS_HEALED_TRIGGER: a timer's trigger step needed a heal, so a different
 * control may have started the measured interval.
 * - PASS_HEALED: only untimed steps needed a heal.
 * - PASS: every step ran through its bound Page Object method.
 */
export function computeRunStatus(input: {
  steps: StepOutcome[];
  timers: TimerOutcome[];
  heals: HealEvent[];
  qualityGatesPassed: boolean | null;
}): ScenarioRunStatus {
  if (input.steps.some((step) => step.status === 'failed')) {
    return 'FAIL_FUNCTIONAL';
  }
  if (input.timers.some((timer) => !timer.valid)) {
    return 'INVALID_MEASUREMENT';
  }
  if (input.qualityGatesPassed === false) {
    return 'FAIL_THRESHOLD';
  }
  if (input.heals.some((heal) => heal.role === 'trigger')) {
    return 'PASS_HEALED_TRIGGER';
  }
  if (input.heals.length > 0) {
    return 'PASS_HEALED';
  }
  return 'PASS';
}

/**
 * Returns the reason the executor must fail the test, or null.
 *
 * FAIL_THRESHOLD returns null on purpose: the performance fixture teardown
 * already throws the non-retryable QualityGateError for it.
 */
export function getStatusFailureReason(
  status: ScenarioRunStatus,
  policy: HealPolicy,
): string | null {
  switch (status) {
    case 'FAIL_FUNCTIONAL':
      return 'a scenario step could not be completed';
    case 'INVALID_MEASUREMENT':
      return 'a timed end condition did not resolve with the locked locators, so the measurement is not trustworthy';
    case 'PASS_HEALED':
    case 'PASS_HEALED_TRIGGER':
      return policy === 'fail'
        ? `PERF_HEAL_POLICY=fail and the run needed healing (${status}); update the lockfile from the heal report`
        : null;
    case 'FAIL_THRESHOLD':
    case 'PASS':
      return null;
  }
}
