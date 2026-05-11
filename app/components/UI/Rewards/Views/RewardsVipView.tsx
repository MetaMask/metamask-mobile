import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  HeaderStandard,
  IconName,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import Routes from '../../../../constants/navigation/Routes';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useVipViewGuard } from '../hooks/useVipViewGuard';
import VipErrorBanner from '../components/Vip/VipErrorBanner';
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

  const { canViewVip, dashboard, showSkeleton, showError, fetchVipDashboard } =
    useVipViewGuard('vip');

  const handleTiersPress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIP_TIERS_VIEW as never);
  }, [navigation]);

  if (!canViewVip) {
    return null;
  }

  const headerTitle = dashboard?.program?.name ?? '';

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
            <VipErrorBanner
              onRetry={fetchVipDashboard}
              testID={REWARDS_VIP_VIEW_TEST_IDS.ERROR}
            />
          ) : dashboard ? (
            <>
              <VipTierProgressCard
                currentTier={dashboard.currentTier}
                progress={dashboard.progress}
                subline={dashboard.localizedText.progressToNextTier}
                onPress={handleTiersPress}
              />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
                <VipFeeTile
                  label={dashboard.localizedText.swapsFeeTitle}
                  currentBps={dashboard.fees.swapsBps}
                  nextTierLabel={dashboard.localizedText.nextTierSwapsFeeDelta}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE}
                />
                <VipFeeTile
                  label={dashboard.localizedText.perpsFeeTitle}
                  currentBps={dashboard.fees.perpsBps}
                  nextTierLabel={dashboard.localizedText.nextTierPerpsFeeDelta}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE}
                />
              </Box>
              <VipVolumeSection
                volume={dashboard.volume}
                title={dashboard.localizedText.volumeTitle}
                period={dashboard.localizedText.period}
                status={dashboard.localizedText.statusMessage}
              />
              <VipPointsSection
                pointsAllocation={dashboard.pointsAllocation}
                title={dashboard.localizedText.pointsTitle}
                subtitle={dashboard.localizedText.pointsAllocationTitle}
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
