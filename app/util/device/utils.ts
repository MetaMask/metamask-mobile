/**
 * Compares two versions (string or number).
 * Returns `1` if `v1 > v2`, `-1` if `v1 < v2`, and `0` if `v1 == v2`.
 */
export function compareSemver(
  v1: string | number,
  v2: string | number,
): number {
  const normalize = (v: string | number): number[] =>
    v.toString().split('.').map(Number);

  const p1 = normalize(v1);
  const p2 = normalize(v2);

  // Compare up to the longest version length
  const length = Math.max(p1.length, p2.length);

  for (let i = 0; i < length; i++) {
    const num1 = p1[i] || 0; // Default to 0 if part is missing
    const num2 = p2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}
