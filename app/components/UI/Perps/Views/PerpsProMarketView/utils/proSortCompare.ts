/**
 * Shared ascending/descending direction used by Pro positions and orders sorts.
 */
export type ProSortDirection = 'asc' | 'desc';

/**
 * Numeric sort comparator used by Pro positions and orders list sorting.
 */
export const compareProSortValues = (
  leftValue: number,
  rightValue: number,
  direction: ProSortDirection,
  tieBreak: () => number,
): number => {
  if (leftValue === rightValue) {
    return tieBreak();
  }

  return (leftValue - rightValue) * (direction === 'asc' ? 1 : -1);
};
