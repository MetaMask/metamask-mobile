import type { RootState } from '..';
import type { OpenSortKey, ClosedSortKey } from './types';

export const selectOpenPositionSort = (state: RootState): OpenSortKey =>
  state.socialLeaderboard.positionSort.open;

export const selectClosedPositionSort = (state: RootState): ClosedSortKey =>
  state.socialLeaderboard.positionSort.closed;
