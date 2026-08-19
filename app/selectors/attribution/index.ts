import { createSelector } from 'reselect';
import type { AttributionState } from '../../core/redux/slices/attribution';
import type { RootState } from '../../reducers';
import type { SecurityState } from '../../reducers/security';
import { getWalletSetupCompletedAttributionAnalyticsProps } from '../../util/analytics/walletSetupCompletedAttribution';

/**
 * Store shape used by attribution selectors.
 */
export interface AttributionSelectorsRootState {
  attribution?: AttributionState;
  security: SecurityState;
}

const selectAttributionSlice = (state: AttributionSelectorsRootState) =>
  state.attribution;

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
