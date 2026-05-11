import React, { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  HeaderStandard,
  IconName,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import VipFeeTile, {
  VIP_FEE_TILE_TEST_IDS,
} from '../components/Vip/VipFeeTile';
import VipPointsSection from '../components/Vip/VipPointsSection';
import VipTierProgressCard from '../components/Vip/VipTierProgressCard';
import VipVolumeSection from '../components/Vip/VipVolumeSection';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

export const REWARDS_VIP_VIEW_TEST_IDS = {
  INVITE_BUTTON: 'rewards-vip-view-invite-button',
  SCROLL: 'rewards-vip-view-scroll',
  SKELETON: 'rewards-vip-view-skeleton',
  ERROR: 'rewards-vip-view-error',
  SWAPS_FEE_TILE: 'rewards-vip-view-swaps-fee-tile',
  PERPS_FEE_TILE: 'rewards-vip-view-perps-fee-tile',
} as const;

const RewardsVipView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(subscriptionId && isVipEnabled);

  const {
    dashboard,
    isLoading,
    hasError,
    hasAttemptedFetch,
    fetchVipDashboard,
  } = useVipDashboard();

  useTrackRewardsPageView({
    page_type: 'vip',
    enabled: canViewVip,
  });

  useEffect(() => {
    if (!canViewVip) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
    }
  }, [canViewVip, navigation]);

  const handleTiersPress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIP_TIERS_VIEW as never);
  }, [navigation]);

  if (!canViewVip) {
    return null;
  }

  // Treat the pre-fetch idle window (mount → first attempt resolved) as
  // loading too, otherwise the view briefly renders nothing while
  // useFocusEffect schedules the initial fetch.
  const showSkeleton = (!hasAttemptedFetch || isLoading) && !dashboard;
  const showError = hasError && !dashboard;
  const localized = dashboard?.localizedText ?? {};
  const headerTitle =
    dashboard?.program?.name ?? strings('rewards.vip.pilot_title');

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.VIP_VIEW}
      >
        <HeaderStandard
          title={headerTitle}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          endButtonIconProps={[
            {
              iconName: IconName.UserCircleAdd,
              onPress: () =>
                navigation.navigate(Routes.REFERRAL_REWARDS_VIEW as never),
              testID: REWARDS_VIP_VIEW_TEST_IDS.INVITE_BUTTON,
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={tw.style('p-4 gap-3 pb-8')}
          testID={REWARDS_VIP_VIEW_TEST_IDS.SCROLL}
        >
          {showSkeleton ? (
            <Box
              twClassName="gap-3"
              testID={REWARDS_VIP_VIEW_TEST_IDS.SKELETON}
            >
              <Skeleton style={tw.style('h-28 rounded-2xl')} />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
                <Skeleton style={tw.style('flex-1 h-24 rounded-2xl')} />
                <Skeleton style={tw.style('flex-1 h-24 rounded-2xl')} />
              </Box>
              <Skeleton style={tw.style('h-36 rounded-2xl')} />
              <Skeleton style={tw.style('h-36 rounded-2xl')} />
            </Box>
          ) : showError ? (
            <RewardsErrorBanner
              title={strings('rewards.vip.error_title')}
              description={strings('rewards.vip.error_description')}
              onConfirm={fetchVipDashboard}
              confirmButtonLabel={strings('rewards.vip.retry_button')}
              testID={REWARDS_VIP_VIEW_TEST_IDS.ERROR}
            />
          ) : dashboard ? (
            <>
              <VipTierProgressCard
                currentTier={dashboard.currentTier}
                nextTier={dashboard.nextTier}
                progress={dashboard.progress}
                sublineOverride={localized.progressToNextTier}
                onPress={handleTiersPress}
              />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
                <VipFeeTile
                  label={
                    localized.swapsFeeTitle ?? strings('rewards.vip.swaps_fee')
                  }
                  currentBps={dashboard.fees.swapsBps}
                  nextTierBps={dashboard.fees.nextTierSwapsBps}
                  nextTierOverride={localized.nextTierSwapsFeeDelta}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE}
                />
                <VipFeeTile
                  label={
                    localized.perpsFeeTitle ?? strings('rewards.vip.perps_fee')
                  }
                  currentBps={dashboard.fees.perpsBps}
                  nextTierBps={dashboard.fees.nextTierPerpsBps}
                  nextTierOverride={localized.nextTierPerpsFeeDelta}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE}
                />
              </Box>
              <VipVolumeSection
                period={dashboard.period}
                volume={dashboard.volume}
                daysToNextTier={dashboard.progress.estimatedDaysToNextTier}
                titleOverride={localized.volumeTitle}
                periodOverride={localized.period}
                statusOverride={localized.statusMessage}
              />
              <VipPointsSection
                pointsAllocation={dashboard.pointsAllocation}
                titleOverride={localized.pointsTitle}
                subtitleOverride={localized.pointsAllocationTitle}
                descriptionOverride={localized.pointsAllocationDescription}
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// Re-export tile test ids for tests that want to assert at the tile level.
export { VIP_FEE_TILE_TEST_IDS };

export default RewardsVipView;
