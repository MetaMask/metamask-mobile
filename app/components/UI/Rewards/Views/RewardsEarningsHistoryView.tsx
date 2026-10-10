import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import {
  selectEarningsSummaryEntry,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import {
  mergeInFlightClaims,
  type EarningsHistoryListItem,
} from '../utils/claimEarnings';
import { underReviewBlockedBaseUnits } from '../utils/earningsSummaryTotals';
import { EarningsHistoryRow } from '../components/Money/EarningsHistoryRows';
import RewardsPausedBanner from '../components/Money/RewardsPausedBanner';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useEarningsHistory } from '../hooks/useEarningsHistory';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import { useInFlightClaims } from '../hooks/useInFlightClaims';

export const REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-earnings-history-view',
  LIST: 'rewards-earnings-history-list',
  SKELETON_SLOT: 'rewards-earnings-history-skeleton-slot',
} as const;

const RewardsEarningsHistoryView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profileId } = useSessionProfileId();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  useEarningsSummary(profileId);
  const list = useEarningsHistory(profileId);
  const openTradeActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  }, [navigation]);
  const inFlight = useInFlightClaims(profileId);
  const items = useMemo(
    () => mergeInFlightClaims(list.items, inFlight.claims),
    [list.items, inFlight.claims],
  );

  const pausedBaseUnits = underReviewBlockedBaseUnits(
    earningsSummaryEntry?.data,
  );
  const header =
    pausedBaseUnits && localizedText ? (
      <RewardsPausedBanner
        baseUnits={pausedBaseUnits}
        localizedText={localizedText}
      />
    ) : null;

  const renderItem = useCallback(
    (item: EarningsHistoryListItem) =>
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
      list={{ ...list, items }}
      renderItem={renderItem}
      emptyDescription={localizedText?.tradingActivityEmptyDescription ?? ''}
      emptyActionLabel={localizedText?.tradingActivityEmptyAction}
      emptyOnAction={openTradeActions}
      header={header}
    />
  );
};

export default RewardsEarningsHistoryView;
