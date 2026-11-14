import type { VolatileParam } from './deeplinkUriCases';

export interface SplitVolatileResult {
  /** The value with every volatile path removed, safe for exact comparison. */
  stable: unknown;
  /** Volatile paths whose runtime value is missing or has an unexpected type. */
  violations: string[];
}

const cloneWithoutPath = (
  value: unknown,
  segments: string[],
): { next: unknown; removed: unknown; found: boolean } => {
  if (segments.length === 0 || typeof value !== 'object' || value === null) {
    return { next: value, removed: undefined, found: false };
  }

  const [head, ...rest] = segments;
  const source = value as Record<string, unknown>;
  if (!(head in source)) {
    return { next: value, removed: undefined, found: false };
  }

  if (rest.length === 0) {
    const { [head]: removed, ...remaining } = source;
    return { next: remaining, removed, found: true };
  }

  const child = cloneWithoutPath(source[head], rest);
  return {
    next: { ...source, [head]: child.next },
    removed: child.removed,
    found: child.found,
  };
};

/**
 * Removes volatile fields (timestamps, trace ids) from `value` so the rest can
 * be compared exactly, and reports volatile fields that are absent or of the
 * wrong type. Paths use dot notation relative to `value`.
 */
export const splitVolatileParams = (
  value: unknown,
  volatile: readonly VolatileParam[] = [],
): SplitVolatileResult => {
  let stable = value;
  const violations: string[] = [];

  volatile.forEach(({ path, type }) => {
    const { next, removed, found } = cloneWithoutPath(stable, path.split('.'));
    stable = next;
    if (!found || typeof removed !== type) {
      violations.push(path);
    }
  });

  return { stable, violations };
};
