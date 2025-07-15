import { createSelector } from 'reselect';
import type { RootState } from '../reducers';

const selectBufferedTracesState = (state: RootState) => state.bufferedTraces;

export const selectBufferedTraces = createSelector(
  [selectBufferedTracesState],
  (bufferedTracesState) => bufferedTracesState?.bufferedTraces || [],
);
