import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { exitRewardsFlow } from '../utils';
import { acceptVipInvite } from '../../../../reducers/rewards';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import ForcedDarkThemeProvider from '../components/ForcedDarkThemeProvider/ForcedDarkThemeProvider';
import VipFeeTile, {
  VIP_FEE_TILE_TEST_IDS,
  VIP_FEE_TILE_WIDTH,
} from '../components/Vip/VipFeeTile';
import VipPointsSection from '../components/Vip/VipPointsSection';
import VipTierProgressCard from '../components/Vip/VipTierProgressCard';
import VipVolumeSection from '../components/Vip/VipVolumeSection';
import VipSwapsVolumeInfoSheet from '../components/Vip/VipSwapsVolumeInfoSheet';
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_BORDER_DEFAULT,
} from '../components/Vip/Vip.constants';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import {
  selectHasAcceptedVipInvite,
  selectReferralCode,
} from '../../../../reducers/rewards/selectors';
import {
  formatCompactValue,
  formatRewardsTimeOnly,
} from '../utils/formatUtils';

export const REWARDS_VIP_VIEW_TEST_IDS = {
  INVITE_BUTTON: 'rewards-vip-view-invite-button',
  TRANSACTIONS_BUTTON: 'rewards-vip-view-transactions-button',
  SCROLL: 'rewards-vip-view-scroll',
  SKELETON: 'rewards-vip-view-skeleton',
  ERROR: 'rewards-vip-view-error',
  TIER_BENEFITS_HEADER: 'rewards-vip-view-tier-benefits-header',
  TIER_BENEFITS_CAROUSEL: 'rewards-vip-view-tier-benefits-carousel',
  FEE_TILE_SKELETON: 'rewards-vip-view-fee-tile-skeleton',
  REVENUE_SHARE_TILE: 'rewards-vip-view-revenue-share-tile',
  SWAPS_FEE_TILE: 'rewards-vip-view-swaps-fee-tile',
  PERPS_FEE_TILE: 'rewards-vip-view-perps-fee-tile',
  REFERRAL_POINTS_TILE: 'rewards-vip-view-referral-points-tile',
  EQUITY_REBATE_TILE: 'rewards-vip-view-equity-rebate-tile',
  LAST_UPDATED: 'rewards-vip-view-last-updated',
} as const;

const BENEFIT_TILE_GAP = 12;
const BENEFIT_TILE_SNAP_INTERVAL = VIP_FEE_TILE_WIDTH + BENEFIT_TILE_GAP;

const vipTierCardSkeletonStyle = {
  borderColor: VIP_GOLD_BORDER_DEFAULT,
  backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
};

const RewardsVipViewContent: React.FC = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(
    isVipProgramEnabled && subscriptionId && isVipEnabled,
  );
  const referralCode = useSelector(selectReferralCode);
  const hasAcceptedVipInvite = useSelector(
    selectHasAcceptedVipInvite(subscriptionId),
  );

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
      exitRewardsFlow(navigation);
    }
  }, [canViewVip, navigation]);

  useEffect(() => {
    if (!canViewVip || !subscriptionId || hasAcceptedVipInvite) {
      return;
    }

    dispatch(acceptVipInvite({ subscriptionId }));
  }, [canViewVip, dispatch, hasAcceptedVipInvite, subscriptionId]);

  const handleTiersPress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIP_TIERS_VIEW as never);
  }, [navigation]);

  const [isSwapsVolumeInfoVisible, setIsSwapsVolumeInfoVisible] =
    useState(false);

  if (!canViewVip) {
    return null;
  }

  // Treat the pre-fetch idle window (mount → first attempt resolved) as
  // loading too, otherwise the view briefly renders nothing while
  // useFocusEffect schedules the initial fetch.
  const showSkeleton = (!hasAttemptedFetch || isLoading) && !dashboard;
  const showError = hasError && !dashboard;
  const headerTitle = dashboard?.program?.name ?? '';
  const currentTierDetails = dashboard
    ? dashboard.tiers.find(
        (tier) =>
          tier.id === dashboard.currentTier.id ||
          tier.tier === dashboard.currentTier.tier,
      )
    : undefined;
  const progressSubline = (() => {
    if (!dashboard) return '';
    if (dashboard.progress.percent >= 100) {
      return dashboard.localizedText.topTierDescription;
    }

    return strings('rewards.vip.progress_to_next_tier', {
      pointsRemaining: formatCompactValue(
        dashboard.progress.remainingPointsToNextTier,
      ),
    });
  })();

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipView">
      <SafeAreaView
        edges={{ top: 'additive', bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.VIP_VIEW}
      >
        <HeaderStandard
          title=""
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          endButtonIconProps={[
            {
              iconName: IconName.UserCircleAdd,
              onPress: () =>
                navigation.navigate(Routes.REFERRAL_REWARDS_VIEW as never),
              testID: REWARDS_VIP_VIEW_TEST_IDS.INVITE_BUTTON,
            },
            {
              iconName: IconName.Activity,
              onPress: () =>
                navigation.navigate(
                  Routes.REWARDS_VIP_TRANSACTIONS_VIEW as never,
                ),
              testID: REWARDS_VIP_VIEW_TEST_IDS.TRANSACTIONS_BUTTON,
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={tw.style('py-4 pb-8 gap-4')}
          testID={REWARDS_VIP_VIEW_TEST_IDS.SCROLL}
        >
          {showSkeleton ? (
            <Box
              twClassName="gap-4"
              testID={REWARDS_VIP_VIEW_TEST_IDS.SKELETON}
            >
              <Box twClassName="px-4 gap-4">
                <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />

                <Box
                  twClassName="gap-4 rounded-2xl border p-4"
                  style={vipTierCardSkeletonStyle}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    twClassName="items-start justify-between"
                  >
                    <Skeleton style={tw.style('h-8 w-8 rounded-lg')} />
                    <Box twClassName="items-end gap-1">
                      <Skeleton style={tw.style('h-4 w-16 rounded-lg')} />
                      <Skeleton style={tw.style('h-4 w-20 rounded-lg')} />
                    </Box>
                  </Box>
                  <Box twClassName="gap-1">
                    <Skeleton style={tw.style('h-6 w-24 rounded-lg')} />
                    <Skeleton style={tw.style('h-4 w-32 rounded-lg')} />
                  </Box>
                  <Box twClassName="gap-1">
                    <Skeleton style={tw.style('h-3 w-full rounded-full')} />
                    <Skeleton style={tw.style('h-4 w-40 rounded-lg')} />
                  </Box>
                </Box>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="items-center gap-2 px-4 my-3"
              >
                <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />
                <Skeleton style={tw.style('h-5 w-5 rounded-full')} />
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="gap-3 px-4"
              >
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton
                    key={index}
                    style={tw.style(
                      `h-[108px] w-[${VIP_FEE_TILE_WIDTH}px] rounded-2xl`,
                    )}
                    testID={REWARDS_VIP_VIEW_TEST_IDS.FEE_TILE_SKELETON}
                  />
                ))}
              </Box>

              <Box twClassName="mt-4 border-b border-border-muted" />

              <Box twClassName="gap-3 px-4">
                <Box twClassName="gap-1">
                  <Skeleton style={tw.style('h-8 w-32 rounded-lg')} />
                  <Skeleton style={tw.style('h-4 w-44 rounded-lg')} />
                </Box>

                <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-20 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-16 rounded-lg')} />
                  </Box>
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-20 rounded-lg')} />
                  </Box>
                </Box>

                <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-28 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-16 rounded-lg')} />
                  </Box>
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-20 rounded-lg')} />
                  </Box>
                </Box>

                <Box twClassName="gap-1">
                  <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
                  <Skeleton style={tw.style('h-6 w-16 rounded-lg')} />
                </Box>
              </Box>

              <Box twClassName="px-4 items-end">
                <Skeleton style={tw.style('h-4 w-36 rounded-lg')} />
              </Box>

              <Box twClassName="mt-4 border-b border-border-muted" />

              <Box twClassName="gap-3 px-4">
                <Skeleton style={tw.style('h-8 w-40 rounded-lg')} />
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="items-center gap-3"
                >
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-full rounded-lg')} />
                    <Skeleton style={tw.style('h-4 w-4/5 rounded-lg')} />
                    <Skeleton style={tw.style('h-4 w-3/4 rounded-lg')} />
                  </Box>
                  <Skeleton style={tw.style('h-24 w-24 rounded-full')} />
                </Box>
              </Box>
            </Box>
          ) : showError ? (
            <Box twClassName="px-4">
              <RewardsErrorBanner
                title={strings('rewards.vip.error_title')}
                description={strings('rewards.vip.error_description')}
                onConfirm={fetchVipDashboard}
                confirmButtonLabel={strings('rewards.vip.retry_button')}
                testID={REWARDS_VIP_VIEW_TEST_IDS.ERROR}
              />
            </Box>
          ) : dashboard ? (
            <>
              <Box twClassName="px-4 gap-4">
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Bold}
                >
                  {headerTitle}
                </Text>
                <VipTierProgressCard
                  currentTier={dashboard.currentTier}
                  programName={dashboard.program.name}
                  progress={dashboard.progress}
                  subline={progressSubline}
                  memberIdTitle={dashboard.localizedText.memberIdTitle}
                  memberId={referralCode ?? ''}
                />
              </Box>
              <Box>
                <Pressable
                  onPress={handleTiersPress}
                  style={tw.style(
                    'flex-row items-center self-start gap-2 my-3 px-4',
                  )}
                  accessibilityRole="button"
                  testID={REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_HEADER}
                >
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Bold}
                  >
                    {strings('rewards.vip.tier_benefits_title')}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                </Pressable>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={BENEFIT_TILE_SNAP_INTERVAL}
                  snapToAlignment="start"
                  contentContainerStyle={tw.style('gap-3 px-4')}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_CAROUSEL}
                >
                  <VipFeeTile
                    label={dashboard.localizedText.revenueShareTitle}
                    currentBps={dashboard.fees.revenueShareBps}
                    unit="%"
                    nextTierLabel={
                      dashboard.localizedText.nextTierRevenueShareDelta
                    }
                    testID={REWARDS_VIP_VIEW_TEST_IDS.REVENUE_SHARE_TILE}
                  />
                  <VipFeeTile
                    label={dashboard.localizedText.swapsFeeTitle}
                    currentBps={dashboard.fees.swapsBps}
                    nextTierLabel={
                      dashboard.localizedText.nextTierSwapsFeeDelta
                    }
                    testID={REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE}
                  />
                  <VipFeeTile
                    label={dashboard.localizedText.perpsFeeTitle}
                    currentBps={dashboard.fees.perpsBps}
                    nextTierLabel={
                      dashboard.localizedText.nextTierPerpsFeeDelta
                    }
                    testID={REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE}
                  />
                  <VipFeeTile
                    label={dashboard.localizedText.referralPointsTitle}
                    currentBps={currentTierDetails?.referralCarryoverBps}
                    unit="%"
                    nextTierLabel={
                      dashboard.localizedText.nextTierReferralPointsDelta
                    }
                    testID={REWARDS_VIP_VIEW_TEST_IDS.REFERRAL_POINTS_TILE}
                  />
                </ScrollView>
              </Box>

              {/* Divider */}
              <Box twClassName="mt-4 border-b border-border-muted" />
              <VipVolumeSection
                volume={dashboard.volume}
                title={dashboard.localizedText.statsTitle}
                period={dashboard.localizedText.periodTitle}
                labels={{
                  points: dashboard.localizedText.pointsTitle,
                  swapsVolume: dashboard.localizedText.swapsVolumeTitle,
                  pointsFromReferrals:
                    dashboard.localizedText.pointsFromReferralsTitle,
                  perpsVolume: dashboard.localizedText.perpsVolumeTitle,
                  vipReferrals: dashboard.localizedText.vipReferralsTitle,
                }}
                onSwapsVolumeInfoPress={() => setIsSwapsVolumeInfoVisible(true)}
              />

              {dashboard.computedAt ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="text-left px-4"
                  testID={REWARDS_VIP_VIEW_TEST_IDS.LAST_UPDATED}
                >
                  {strings('rewards.vip.last_updated', {
                    time: formatRewardsTimeOnly(new Date(dashboard.computedAt)),
                  })}
                </Text>
              ) : null}

              {/* Divider */}
              <Box twClassName="mt-4 border-b border-border-muted" />
              <VipPointsSection
                pointsAllocation={dashboard.pointsAllocation}
                title={dashboard.localizedText.totalPointsTitle}
                equityLockedTitle={dashboard.localizedText.equityLockedTitle}
                equityLockedDescription={
                  dashboard.localizedText.equityLockedDescription
                }
                equityUnlockedTitle={
                  dashboard.localizedText.equityUnlockedTitle
                }
                equityUnlockedDescription={
                  dashboard.localizedText.equityUnlockedDescription
                }
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      {isSwapsVolumeInfoVisible ? (
        <VipSwapsVolumeInfoSheet
          onClose={() => setIsSwapsVolumeInfoVisible(false)}
        />
      ) : null}
    </ErrorBoundary>
  );
};

const RewardsVipView: React.FC = () => (
  <ForcedDarkThemeProvider>
    <RewardsVipViewContent />
  </ForcedDarkThemeProvider>
);

// Re-export tile test ids for tests that want to assert at the tile level.
export { VIP_FEE_TILE_TEST_IDS };

export default RewardsVipView;
