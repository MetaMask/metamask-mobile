/**
 * Canonical `active_ab_tests` entry emitted on analytics business events.
 */
export interface ActiveABTestAssignment {
  /** Canonical experiment identifier, usually the LaunchDarkly flag key. */
  key: string;
  /** Assigned variant name for the active experiment. */
  value: string;
  /** Convenience `key=value` representation derived from `key` and `value`. */
  key_value_pair?: string;
}

/**
 * Creates a normalized `active_ab_tests` entry with a derived `key_value_pair`.
 */
export const createActiveABTestAssignment = (
  key: string,
  value: string,
): ActiveABTestAssignment => ({
  key,
  value,
  key_value_pair: `${key}=${value}`,
});

/**
 * Type guard for objects that have the minimum shape needed to be normalized as
 * active A/B assignments.
 */
const isActiveABTestAssignment = (
  value: unknown,
): value is ActiveABTestAssignment =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'key' in value &&
      typeof value.key === 'string' &&
      'value' in value &&
      typeof value.value === 'string',
  );

/**
 * Normalizes an unknown `active_ab_tests` payload into canonical entries.
 *
 * Legacy objects that only include `key` and `value` are upgraded by deriving
 * `key_value_pair`. Entries that do not have the minimum assignment shape are
 * discarded.
 */
export const normalizeActiveABTestAssignments = (
  value: unknown,
): ActiveABTestAssignment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isActiveABTestAssignment)
    .map(({ key, value: assignmentValue }) =>
      createActiveABTestAssignment(key, assignmentValue),
    );
};
