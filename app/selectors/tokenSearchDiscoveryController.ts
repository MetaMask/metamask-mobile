import { createSelector } from 'reselect';
import { RootState } from '../reducers';

const selectTokenSearchDiscoveryControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenSearchDiscoveryController;

export const selectRecentTokenSearches = createSelector(
  selectTokenSearchDiscoveryControllerState,
  (state) => state?.recentSearches ?? [],
);
