/**
 * Format-agnostic matching for ramps entity ids (providers, payment methods,
 * currencies, regions).
 *
 * Backend entity ids are migrating from the legacy path form
 * (e.g. `/providers/transak`) to the canonical form (e.g. `transak`), gated
 * server-side. A comparison can therefore see either form on either side: a
 * value persisted or hardcoded before the migration compared against a fresh
 * response, or the flag being toggled between builds. Canonicalizing both
 * operands makes the comparison correct regardless of which form each side is
 * in.
 */

/**
 * Strips a single leading collection prefix (`/providers/`, `/payments/`,
 * `/currencies/`, `/regions/`) from a ramps entity id, so the legacy path form
 * and the canonical form reduce to the same value. Idempotent on
 * already-canonical ids, and preserves nested currency structure
 * (`/currencies/crypto/1/eth` -> `crypto/1/eth`).
 *
 * @param id - A ramps entity id in either the legacy path form or canonical
 * form.
 * @returns The canonical id with any known leading collection prefix removed.
 */
export function canonicalizeRampId(id: string): string {
  return id.replace(/^\/(?:providers|payments|currencies|regions)\//u, '');
}

/**
 * Returns true when two ramps ids refer to the same entity, ignoring whether
 * either is in the legacy path form or the canonical form. Case-insensitive, to
 * match the slug-style ids the backend uses. Returns false if either id is
 * nullish.
 *
 * @param a - First ramps id, in either form.
 * @param b - Second ramps id, in either form.
 * @returns Whether the two ids canonically match.
 */
export function rampIdsEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) {
    return false;
  }
  return (
    canonicalizeRampId(a).toLowerCase() === canonicalizeRampId(b).toLowerCase()
  );
}

/**
 * Returns true when `id` canonically matches any entry in `list`, ignoring
 * legacy-vs-canonical form on either side. Useful for mixed-format lists such
 * as the combined legacy + v2 "previously used providers" list.
 *
 * @param list - Candidate ramps ids, each in either form.
 * @param id - The ramps id to look for, in either form.
 * @returns Whether `id` canonically matches any entry.
 */
export function rampIdInList(
  list: readonly (string | null | undefined)[],
  id: string | null | undefined,
): boolean {
  if (id == null) {
    return false;
  }
  return list.some((entry) => rampIdsEqual(entry, id));
}
