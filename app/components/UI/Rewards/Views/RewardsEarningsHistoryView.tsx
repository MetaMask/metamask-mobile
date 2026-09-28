import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { LedgerEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { EarningsHistoryRow } from '../components/Money/EarningsHistoryRows';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useEarningsHistory } from '../hooks/useEarningsHistory';

export const REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-earnings-history-view',
  LIST: 'rewards-earnings-history-list',
  SKELETON_SLOT: 'rewards-earnings-history-skeleton-slot',
} as const;

const RewardsEarningsHistoryView: React.FC = () => {
  const { profileId } = useSessionProfileId();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const list = useEarningsHistory(profileId);

  const renderItem = useCallback(
    (item: LedgerEntryDto) =>
      localizedText ? (
        <EarningsHistoryRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  return (
    <TradingActivityListView
      view="RewardsEarningsHistoryView"
      title={localizedText?.history ?? ''}
      testIDs={REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS}
      list={list}
      renderItem={renderItem}
    />
  );
};

export default RewardsEarningsHistoryView;
