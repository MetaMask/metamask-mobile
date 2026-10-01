import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { PerformanceRebateRow } from '../components/Money/PerformanceActivityRows';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useCashbackLedger } from '../hooks/useCashbackLedger';

export const REWARDS_TRADING_REBATES_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-trading-rebates-view',
  LIST: 'rewards-trading-rebates-list',
  SKELETON_SLOT: 'rewards-trading-rebates-skeleton-slot',
} as const;

const RewardsTradingRebatesView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profileId } = useSessionProfileId();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const list = useCashbackLedger(profileId);
  const openTradeActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  }, [navigation]);

  const renderItem = useCallback(
    (item: LedgerEarningEntryDto) =>
      localizedText ? (
        <PerformanceRebateRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  return (
    <TradingActivityListView
      view="RewardsTradingRebatesView"
      title={localizedText?.tradingRebates ?? ''}
      testIDs={REWARDS_TRADING_REBATES_VIEW_TEST_IDS}
      list={list}
      renderItem={renderItem}
      emptyDescription={localizedText?.tradingActivityEmptyDescription ?? ''}
      emptyActionLabel={localizedText?.tradingActivityEmptyAction}
      emptyOnAction={openTradeActions}
    />
  );
};

export default RewardsTradingRebatesView;
