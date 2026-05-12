import type { Position } from '@metamask/social-controllers';

export type OpenSortKey = 'value' | 'pnl';
export type ClosedSortKey = 'value' | 'pnl' | 'recent';
export type SortKey = OpenSortKey | ClosedSortKey;

export const OPEN_SORT_CYCLE: readonly OpenSortKey[] = ['value', 'pnl'];
export const CLOSED_SORT_CYCLE: readonly ClosedSortKey[] = [
  'value',
  'pnl',
  'recent',
];

const getOpenValue = (position: Position): number =>
  position.currentValueUSD ?? 0;

const getClosedValue = (position: Position): number => position.soldUsd;

const getOpenPnl = (position: Position): number => position.pnlPercent ?? 0;

const getClosedPnl = (position: Position): number =>
  position.boughtUsd > 0
    ? (position.realizedPnl / position.boughtUsd) * 100
    : 0;

const getRecency = (position: Position): number => position.lastTradeAt ?? 0;

/**
 * Sort a list of positions for the trader profile view.
 *
 * Pure function — never mutates the input array.
 *
 * @param positions - The positions to sort.
 * @param sortKey - The sort criterion.
 * @param tab - Which tab the positions belong to (decides which field to read).
 * @returns A new array sorted in descending order by the chosen criterion.
 */
export const sortPositions = (
  positions: Position[],
  sortKey: SortKey,
  tab: 'open' | 'closed',
): Position[] => {
  const getScore = (position: Position): number => {
    if (sortKey === 'recent') {
      return getRecency(position);
    }
    if (sortKey === 'pnl') {
      return tab === 'open' ? getOpenPnl(position) : getClosedPnl(position);
    }
    return tab === 'open' ? getOpenValue(position) : getClosedValue(position);
  };

  return [...positions].sort((a, b) => getScore(b) - getScore(a));
};
