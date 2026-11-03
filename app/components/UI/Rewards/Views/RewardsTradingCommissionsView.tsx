import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { CommissionEntryView } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { PerformanceCommissionRow } from '../components/Money/PerformanceActivityRows';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useCommissions } from '../hooks/useCommissions';

export const REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-trading-commissions-view',
  LIST: 'rewards-trading-commissions-list',
  SKELETON_SLOT: 'rewards-trading-commissions-skeleton-slot',
} as const;

const RewardsTradingCommissionsView: React.FC = () => {
  const profileId = useSelector(selectSessionProfileId);
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const list = useCommissions(profileId);

  const renderItem = useCallback(
    (item: CommissionEntryView) =>
      localizedText ? (
        <PerformanceCommissionRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  return (
    <TradingActivityListView
      view="RewardsTradingCommissionsView"
      title={localizedText?.tradingCommissionsSection ?? ''}
      testIDs={REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS}
      list={list}
      renderItem={renderItem}
      emptyDescription={localizedText?.tradingActivityEmptyDescription ?? ''}
    />
  );
};

export default RewardsTradingCommissionsView;
