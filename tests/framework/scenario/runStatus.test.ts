import {
  computeRunStatus,
  getStatusFailureReason,
  resolveHealPolicy,
} from './runStatus.ts';
import type { HealEvent, StepOutcome, TimerOutcome } from './types.ts';

function step(overrides: Partial<StepOutcome> = {}): StepOutcome {
  return {
    id: 'step',
    kind: 'do',
    text: 'Do it',
    role: 'untimed',
    status: 'passed',
    resolvedBy: 'binding',
    locator: null,
    durationMs: 1,
    errors: [],
    skippedTiers: [],
    ...overrides,
  };
}

function timer(overrides: Partial<TimerOutcome> = {}): TimerOutcome {
  return {
    name: 'timer',
    after: 'a',
    until: 'b',
    valid: true,
    durationMs: 10,
    reason: null,
    ...overrides,
  };
}

function heal(role: HealEvent['role']): HealEvent {
  return {
    stepId: 'step',
    role,
    tier: 'alternative',
    locator: { strategy: 'testID', value: 'x' },
    primaryError: 'not found',
    durationMs: 5,
    diagnosisOnly: false,
    proposedLockPatch: { stepId: 'step', locators: [] },
  };
}

describe('computeRunStatus', () => {
  it('is PASS when every step ran through its binding', () => {
    expect(
      computeRunStatus({
        steps: [step()],
        timers: [timer()],
        heals: [],
        qualityGatesPassed: true,
      }),
    ).toBe('PASS');
  });

  it('is PASS_HEALED when only untimed steps healed', () => {
    expect(
      computeRunStatus({
        steps: [step({ status: 'healed' })],
        timers: [timer()],
        heals: [heal('untimed')],
        qualityGatesPassed: true,
      }),
    ).toBe('PASS_HEALED');
  });

  it('is PASS_HEALED_TRIGGER when a timer trigger healed', () => {
    expect(
      computeRunStatus({
        steps: [step({ status: 'healed', role: 'trigger' })],
        timers: [timer()],
        heals: [heal('untimed'), heal('trigger')],
        qualityGatesPassed: true,
      }),
    ).toBe('PASS_HEALED_TRIGGER');
  });

  it('is FAIL_THRESHOLD over healed statuses when a gate fails', () => {
    expect(
      computeRunStatus({
        steps: [step()],
        timers: [timer()],
        heals: [heal('trigger')],
        qualityGatesPassed: false,
      }),
    ).toBe('FAIL_THRESHOLD');
  });

  it('is INVALID_MEASUREMENT over threshold results when a timer is invalid', () => {
    expect(
      computeRunStatus({
        steps: [step({ status: 'healed', role: 'until' })],
        timers: [timer({ valid: false })],
        heals: [heal('until')],
        qualityGatesPassed: false,
      }),
    ).toBe('INVALID_MEASUREMENT');
  });

  it('is FAIL_FUNCTIONAL when any step failed', () => {
    expect(
      computeRunStatus({
        steps: [step({ status: 'failed' })],
        timers: [timer({ valid: false })],
        heals: [],
        qualityGatesPassed: null,
      }),
    ).toBe('FAIL_FUNCTIONAL');
  });
});

describe('getStatusFailureReason', () => {
  it.each(['FAIL_FUNCTIONAL', 'INVALID_MEASUREMENT'] as const)(
    'always fails %s',
    (status) => {
      expect(getStatusFailureReason(status, 'report')).not.toBeNull();
      expect(getStatusFailureReason(status, 'off')).not.toBeNull();
    },
  );

  it.each(['PASS_HEALED', 'PASS_HEALED_TRIGGER'] as const)(
    'fails %s only under PERF_HEAL_POLICY=fail',
    (status) => {
      expect(getStatusFailureReason(status, 'report')).toBeNull();
      expect(getStatusFailureReason(status, 'fail')).toContain(status);
    },
  );

  it('leaves FAIL_THRESHOLD to the fixture quality gates', () => {
    expect(getStatusFailureReason('FAIL_THRESHOLD', 'fail')).toBeNull();
  });
});

describe('resolveHealPolicy', () => {
  it('defaults to report', () => {
    expect(resolveHealPolicy(undefined)).toBe('report');
    expect(resolveHealPolicy('')).toBe('report');
  });

  it('rejects unknown values', () => {
    expect(() => resolveHealPolicy('sometimes')).toThrow('PERF_HEAL_POLICY');
  });
});
