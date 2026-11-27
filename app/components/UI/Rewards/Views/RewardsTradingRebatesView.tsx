import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import EarnPageHeader from '../components/Money/EarnPageHeader';
import { PerformanceRebateRow } from '../components/Money/PerformanceActivityRows';
import RewardsMoneyListScreen from '../components/Money/RewardsMoneyListScreen';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useCashbackLedger } from '../hooks/useCashbackLedger';

export const REWARDS_TRADING_REBATES_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-trading-rebates-view',
  LIST: 'rewards-trading-rebates-list',
} as const;

const RewardsTradingRebatesView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const profileId = useSelector(selectSessionProfileId);
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
    <RewardsMoneyListScreen
      view="RewardsTradingRebatesView"
      title={localizedText?.tradingRebates ?? ''}
      testID={REWARDS_TRADING_REBATES_VIEW_TEST_IDS.CONTAINER}
    >
      {profileId && localizedText ? (
        <TradingActivityListView
          testIDs={REWARDS_TRADING_REBATES_VIEW_TEST_IDS}
          list={list}
          renderItem={renderItem}
          emptyDescription={localizedText.tradingActivityEmptyDescription}
          header={
            <EarnPageHeader
              profileId={profileId}
              localizedText={localizedText}
              title={localizedText.invitedBenefitTitle}
              description={localizedText.invitedBenefitDescription}
              cta={{
                label: localizedText.tradingActivityEmptyAction,
                onPress: openTradeActions,
              }}
              branch="self_earned"
              family="REFERRAL_TRADE_FEE_CASHBACK"
            />
          }
        />
      ) : null}
    </RewardsMoneyListScreen>
  );
};

export default RewardsTradingRebatesView;
