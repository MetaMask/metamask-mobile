import type { RootState } from '../reducers';
import { selectMarketingConsent } from './analyticsController';

export const selectDataCollectionForMarketingEnabled = (state: RootState) =>
  selectMarketingConsent(state) === true;
