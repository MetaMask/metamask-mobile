import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { getWalletSetupCompletedAttributionAnalyticsProps } from '../../util/analytics/walletSetupCompletedAttribution';

const selectAttributionSlice = (state: RootState) => state.attribution;

/**
 * Persisted attribution record, or null when the slice / record is absent
 * (e.g. partial store in tests before rehydration).
 */
export const selectAttributionRecord = createSelector(
  selectAttributionSlice,
  (slice) => slice?.attribution ?? null,
);

export const selectWalletSetupCompletedAttributionAnalyticsProps =
  createSelector(
    [
      selectAttributionRecord,
      (state: RootState) => state.security?.dataCollectionForMarketing ?? null,
    ],
    (record, dataCollectionForMarketing) =>
      getWalletSetupCompletedAttributionAnalyticsProps(
        record,
        dataCollectionForMarketing,
      ),
  );
