/**
 * Custom equality function to compare Map contents instead of reference.
 * Returns true if both Maps have the same keys and values.
 *
 * @param prevMap - Previous Map
 * @param nextMap - Next Map
 * @returns true if Maps are equal, false otherwise
 */
export const mapEqual = <K, V>(
  prevMap: Map<K, V>,
  nextMap: Map<K, V>,
): boolean => {
  if (prevMap.size !== nextMap.size) return false;

  for (const [key, value] of prevMap.entries()) {
    if (nextMap.get(key) !== value) return false;
  }

  return true;
};
