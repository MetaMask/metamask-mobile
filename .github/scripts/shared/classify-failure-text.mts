/**
 * classify-failure-text.mts
 *
 * Decides whether a job log is deterministic or transient from the patterns in
 * retry-config.jsonc. Deterministic patterns win, matching classify-failures.
 */

export type FailureTextOutcome = 'deterministic' | 'transient' | 'none';

export type FailureTextClassification = {
  outcome: FailureTextOutcome;
  match?: string;
};

export function matchFailurePattern(
  text: string,
  patterns: readonly string[],
): string | undefined {
  for (const pattern of patterns) {
    const match = new RegExp(pattern, 'i').exec(text);
    if (match?.[0]) {
      return match[0];
    }
  }
  return undefined;
}

export function classifyFailureText(
  text: string,
  patterns: {
    deterministicErrorPatterns: readonly string[];
    transientErrorPatterns: readonly string[];
  },
): FailureTextClassification {
  const deterministicMatch = matchFailurePattern(
    text,
    patterns.deterministicErrorPatterns,
  );
  if (deterministicMatch) {
    return { outcome: 'deterministic', match: deterministicMatch };
  }

  const transientMatch = matchFailurePattern(
    text,
    patterns.transientErrorPatterns,
  );
  if (transientMatch) {
    return { outcome: 'transient', match: transientMatch };
  }

  return { outcome: 'none' };
}
