import {
  DEFAULT_DIAGNOSIS_TIMEOUT_MS,
  DEFAULT_MAX_DIAGNOSES_PER_TEST,
  DEFAULT_MIN_STEP_TIMEOUT_MS,
  DEFAULT_MAX_RECOVERIES_PER_TEST,
  isFlakyRecoveryEnabled,
  resolveFlakyRecoveryLimits,
} from './FlakyRecoveryConfig';

describe('isFlakyRecoveryEnabled', () => {
  it('is off by default', () => {
    expect(isFlakyRecoveryEnabled({})).toBe(false);
  });

  it('needs both the flag and an API key', () => {
    expect(isFlakyRecoveryEnabled({ AI_FLAKY_RECOVERY_ENABLED: 'true' })).toBe(
      false,
    );
    expect(isFlakyRecoveryEnabled({ ANTHROPIC_API_KEY: 'sk-test' })).toBe(
      false,
    );
    expect(
      isFlakyRecoveryEnabled({
        AI_FLAKY_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: '   ',
      }),
    ).toBe(false);
  });

  it('is off when the flag is not exactly true', () => {
    expect(
      isFlakyRecoveryEnabled({
        AI_FLAKY_RECOVERY_ENABLED: 'false',
        ANTHROPIC_API_KEY: 'sk-test',
      }),
    ).toBe(false);
  });

  it('is on with the flag and a key', () => {
    expect(
      isFlakyRecoveryEnabled({
        AI_FLAKY_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'sk-test',
      }),
    ).toBe(true);
  });

  it('is independent of the performance locator-recovery flag', () => {
    expect(
      isFlakyRecoveryEnabled({
        AI_LOCATOR_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'sk-test',
      }),
    ).toBe(false);
  });
});

describe('resolveFlakyRecoveryLimits', () => {
  it('uses small defaults', () => {
    expect(resolveFlakyRecoveryLimits({})).toEqual({
      maxRecoveriesPerTest: DEFAULT_MAX_RECOVERIES_PER_TEST,
      maxDiagnosesPerTest: DEFAULT_MAX_DIAGNOSES_PER_TEST,
      minStepTimeoutMs: DEFAULT_MIN_STEP_TIMEOUT_MS,
      diagnosisTimeoutMs: DEFAULT_DIAGNOSIS_TIMEOUT_MS,
    });
    expect(DEFAULT_MIN_STEP_TIMEOUT_MS).toBe(6_000);
    expect(DEFAULT_DIAGNOSIS_TIMEOUT_MS).toBe(30_000);
    expect(DEFAULT_MAX_RECOVERIES_PER_TEST).toBe(2);
  });

  it('reads the configured limits', () => {
    expect(
      resolveFlakyRecoveryLimits({
        AI_FLAKY_RECOVERY_MAX_PER_TEST: '5',
        AI_FLAKY_RECOVERY_MAX_DIAGNOSES_PER_TEST: '9',
      }),
    ).toMatchObject({ maxRecoveriesPerTest: 5, maxDiagnosesPerTest: 9 });
  });

  it('reads the probe threshold and the diagnosis timeout', () => {
    expect(
      resolveFlakyRecoveryLimits({
        AI_FLAKY_RECOVERY_MIN_STEP_TIMEOUT_MS: '2500',
        AI_FLAKY_RECOVERY_DIAGNOSIS_TIMEOUT_MS: '15000',
      }),
    ).toMatchObject({ minStepTimeoutMs: 2500, diagnosisTimeoutMs: 15000 });
  });

  it('accepts 0 to allow no recoveries', () => {
    expect(
      resolveFlakyRecoveryLimits({ AI_FLAKY_RECOVERY_MAX_PER_TEST: '0' })
        .maxRecoveriesPerTest,
    ).toBe(0);
  });

  it.each(['-1', 'abc', '1.5', ''])(
    'falls back to the default for %p',
    (value) => {
      expect(
        resolveFlakyRecoveryLimits({
          AI_FLAKY_RECOVERY_MAX_PER_TEST: value,
        }).maxRecoveriesPerTest,
      ).toBe(DEFAULT_MAX_RECOVERIES_PER_TEST);
    },
  );
});
