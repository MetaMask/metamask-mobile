import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { CommissionEntryView } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateToSocialLeaderboard } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import EarnPageHeader from '../components/Money/EarnPageHeader';
import { PerformanceCommissionRow } from '../components/Money/PerformanceActivityRows';
import RewardsMoneyListScreen from '../components/Money/RewardsMoneyListScreen';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useCommissions } from '../hooks/useCommissions';

export const REWARDS_COPY_TRADING_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-copy-trading-view',
  LIST: 'rewards-copy-trading-list',
} as const;

const RewardsCopyTradingView: React.FC = () => {
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
    <RewardsMoneyListScreen
      view="RewardsCopyTradingView"
      title={localizedText?.tradingCommissionsSection ?? ''}
      testID={REWARDS_COPY_TRADING_VIEW_TEST_IDS.CONTAINER}
    >
      {profileId && localizedText ? (
        <TradingActivityListView
          testIDs={REWARDS_COPY_TRADING_VIEW_TEST_IDS}
          list={list}
          renderItem={renderItem}
          emptyDescription={localizedText.copyTradingEmptyDescription}
          emptyIconName={IconName.People}
          header={
            <EarnPageHeader
              profileId={profileId}
              localizedText={localizedText}
              title={localizedText.copyTradingInfoDescription}
              description={localizedText.copyTradingDescription}
              cta={{
                label: localizedText.copyTradingEmptyAction,
                onPress: openSocialTab,
              }}
              branch="earned_by_others"
              family="SOCIAL_FOLLOW_TRADE"
            />
          }
        />
      ) : null}
    </RewardsMoneyListScreen>
  );
};

export default RewardsCopyTradingView;
