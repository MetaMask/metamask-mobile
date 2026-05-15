import { RootState } from '../../reducers';
import { createSelector } from 'reselect';

const selectAttributionState = (state: RootState) => state.attribution;

export const selectAttributionRecord = createSelector(
  selectAttributionState,
  (s) => s.attribution,
);
