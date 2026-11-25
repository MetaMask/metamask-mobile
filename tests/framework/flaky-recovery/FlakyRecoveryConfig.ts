export const DEFAULT_MAX_RECOVERIES_PER_TEST = 2;
export const DEFAULT_MAX_DIAGNOSES_PER_TEST = 4;

export interface FlakyRecoveryLimits {
  /** Fixes that may be applied (and retried) in one test. */
  maxRecoveriesPerTest: number;
  /** Model calls allowed in one test, including "real failure" verdicts. */
  maxDiagnosesPerTest: number;
}

type Env = Record<string, string | undefined>;

/**
 * AI flaky recovery is opt-in: `AI_FLAKY_RECOVERY_ENABLED=true` and a
 * non-empty `ANTHROPIC_API_KEY`. Without both, the framework behaves exactly
 * as it does without this feature.
 */
export function isFlakyRecoveryEnabled(env: Env = process.env): boolean {
  return (
    env.AI_FLAKY_RECOVERY_ENABLED?.trim() === 'true' &&
    Boolean(env.ANTHROPIC_API_KEY?.trim())
  );
}

function parseNonNegativeInteger(
  raw: string | undefined,
  fallback: number,
): number {
  const trimmed = raw?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return fallback;
  }
  return Number(trimmed);
}

/**
 * `AI_FLAKY_RECOVERY_MAX_PER_TEST` (default 2) caps applied fixes and
 * `AI_FLAKY_RECOVERY_MAX_DIAGNOSES_PER_TEST` (default 4) caps model calls.
 * Invalid values fall back to the defaults.
 */
export function resolveFlakyRecoveryLimits(
  env: Env = process.env,
): FlakyRecoveryLimits {
  return {
    maxRecoveriesPerTest: parseNonNegativeInteger(
      env.AI_FLAKY_RECOVERY_MAX_PER_TEST,
      DEFAULT_MAX_RECOVERIES_PER_TEST,
    ),
    maxDiagnosesPerTest: parseNonNegativeInteger(
      env.AI_FLAKY_RECOVERY_MAX_DIAGNOSES_PER_TEST,
      DEFAULT_MAX_DIAGNOSES_PER_TEST,
    ),
  };
}
