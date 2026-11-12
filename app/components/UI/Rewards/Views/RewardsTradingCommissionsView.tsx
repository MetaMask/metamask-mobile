import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { CommissionEntryView } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { PerformanceCommissionRow } from '../components/Money/PerformanceActivityRows';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useCommissions } from '../hooks/useCommissions';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateToSocialLeaderboard } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

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
  const navigation = useNavigation<AppNavigationProp>();
  const openSocialTab = useCallback(() => {
    navigateToSocialLeaderboard(navigation.navigate);
  }, [navigation]);

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
      emptyDescription={localizedText?.copyTradingEmptyDescription ?? ''}
      emptyActionLabel={localizedText?.copyTradingEmptyAction}
      emptyIconName={IconName.People}
      emptyOnAction={openSocialTab}
    />
  );
};

export default RewardsTradingCommissionsView;
