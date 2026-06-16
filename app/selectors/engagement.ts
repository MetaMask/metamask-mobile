import type { RootState } from '../reducers';

export const selectDataCollectionForMarketingEnabled = (state: RootState) =>
  state.security?.dataCollectionForMarketing === true;
