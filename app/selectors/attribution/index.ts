import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { getWalletSetupCompletedAttributionAnalyticsProps } from '../../util/analytics/walletSetupCompletedAttribution';

const selectAttributionState = (state: RootState) => state.attribution;

export const selectAttributionRecord = createSelector(
  selectAttributionState,
  (s) => s.attribution,
);

export const selectWalletSetupCompletedAttributionAnalyticsProps =
  createSelector(
    [
      selectAttributionRecord,
      (state: RootState) => state.security.dataCollectionForMarketing,
    ],
    (record, dataCollectionForMarketing) =>
      getWalletSetupCompletedAttributionAnalyticsProps(
        record,
        dataCollectionForMarketing,
      ),
  );
