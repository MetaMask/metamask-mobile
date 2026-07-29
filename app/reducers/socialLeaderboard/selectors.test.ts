import type { RootState } from '..';
import { selectOpenPositionSort, selectClosedPositionSort } from './selectors';

describe('socialLeaderboard selectors', () => {
  const state = {
    socialLeaderboard: {
      positionSort: { open: 'pnl', closed: 'recent' },
    },
  } as RootState;

  it('selectOpenPositionSort returns the open tab sort key', () => {
    expect(selectOpenPositionSort(state)).toBe('pnl');
  });

  it('selectClosedPositionSort returns the closed tab sort key', () => {
    expect(selectClosedPositionSort(state)).toBe('recent');
  });
});
