/**
 * Shared ascending/descending direction used by Pro positions and orders sorts.
 */
export type ProSortDirection = 'asc' | 'desc';

/**
 * Numeric sort for Pro positions and orders, with unknown values last.
 */
export const compareProSortValues = (
  leftValue: number | undefined,
  rightValue: number | undefined,
  direction: ProSortDirection,
  tieBreak: () => number,
): number => {
  if (leftValue === rightValue) {
    return tieBreak();
  }

  if (leftValue === undefined) return 1;
  if (rightValue === undefined) return -1;
  return (leftValue - rightValue) * (direction === 'asc' ? 1 : -1);
};
