import React, { useCallback, useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
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
  TextVariant,
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
  VIP_FEE_TILE_WIDTH,
} from '../components/Vip/VipFeeTile';
import VipPointsSection from '../components/Vip/VipPointsSection';
import VipTierProgressCard from '../components/Vip/VipTierProgressCard';
import VipVolumeSection from '../components/Vip/VipVolumeSection';
import { formatNumber } from '../utils/formatUtils';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';

export const REWARDS_VIP_VIEW_TEST_IDS = {
  INVITE_BUTTON: 'rewards-vip-view-invite-button',
  SCROLL: 'rewards-vip-view-scroll',
  SKELETON: 'rewards-vip-view-skeleton',
  ERROR: 'rewards-vip-view-error',
  TIER_BENEFITS_HEADER: 'rewards-vip-view-tier-benefits-header',
  TIER_BENEFITS_CAROUSEL: 'rewards-vip-view-tier-benefits-carousel',
  FEE_TILE_SKELETON: 'rewards-vip-view-fee-tile-skeleton',
  REVENUE_SHARE_TILE: 'rewards-vip-view-revenue-share-tile',
  SWAPS_FEE_TILE: 'rewards-vip-view-swaps-fee-tile',
  PERPS_FEE_TILE: 'rewards-vip-view-perps-fee-tile',
  EQUITY_REBATE_TILE: 'rewards-vip-view-equity-rebate-tile',
} as const;

const BENEFIT_TILE_GAP = 12;
const BENEFIT_TILE_SNAP_INTERVAL = VIP_FEE_TILE_WIDTH + BENEFIT_TILE_GAP;

const RewardsVipView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(subscriptionId && isVipEnabled);
  const referralCode = useSelector(selectReferralCode);

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
  const headerTitle = dashboard?.program?.name ?? '';

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipView">
      <SafeAreaView
        edges={{ top: 'additive' }}
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
          ]}
        />

        <ScrollView
          contentContainerStyle={tw.style('py-4 pb-8 gap-4')}
          testID={REWARDS_VIP_VIEW_TEST_IDS.SCROLL}
        >
          {showSkeleton ? (
            <Box
              twClassName="gap-4 px-4"
              testID={REWARDS_VIP_VIEW_TEST_IDS.SKELETON}
            >
              <Skeleton style={tw.style('h-10 w-36 rounded-lg')} />
              <Skeleton style={tw.style('h-44 rounded-2xl')} />
              <Skeleton style={tw.style('h-8 w-44 rounded-lg')} />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton
                    key={index}
                    style={tw.style(
                      `h-[108px] w-[${VIP_FEE_TILE_WIDTH}px] rounded-2xl`,
                    )}
                    testID={REWARDS_VIP_VIEW_TEST_IDS.FEE_TILE_SKELETON}
                  />
                ))}
              </Box>
              <Skeleton style={tw.style('h-36 rounded-2xl')} />
              <Skeleton style={tw.style('h-36 rounded-2xl')} />
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
            (() => {
              // `dashboard.currentTier` / `dashboard.nextTier` are
              // VipTierRefDto (only id/name/tier). To surface the new
              // per-tier fields (equityRebateBps, referralCarryoverBps,
              // pointsRequirement) we resolve the full VipTierDto rows from
              // `dashboard.tiers` by id. If a tier isn't in the array we
              // fall back to `undefined` and the dependent UI hides.
              const currentTierFull = dashboard.tiers.find(
                (t) => t.id === dashboard.currentTier.id,
              );
              const nextTierFull = dashboard.tiers.find(
                (t) => t.id === dashboard.nextTier.id,
              );

              return (
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
                      subline={dashboard.localizedText.progressToNextTier}
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
                      {currentTierFull &&
                      currentTierFull.equityRebateBps > 0 ? (
                        <VipFeeTile
                          label={strings('rewards.vip.equity_rebate_label')}
                          currentBps={currentTierFull.equityRebateBps}
                          unit="%"
                          nextTierLabel={
                            nextTierFull &&
                            currentTierFull.tier !== nextTierFull.tier
                              ? strings('rewards.vip.next_tier_value', {
                                  value: `↑ ${formatNumber(
                                    nextTierFull.equityRebateBps / 100,
                                    2,
                                  )}%`,
                                })
                              : undefined
                          }
                          testID={REWARDS_VIP_VIEW_TEST_IDS.EQUITY_REBATE_TILE}
                        />
                      ) : null}
                    </ScrollView>
                  </Box>

                  {/* Divider */}
                  <Box twClassName="mt-4 border-b border-border-muted" />
                  <VipVolumeSection
                    volume={dashboard.volume}
                    title={dashboard.localizedText.statsTitle}
                    period={dashboard.localizedText.period}
                    status={dashboard.localizedText.statusMessage}
                  />

                  {/* Divider */}
                  <Box twClassName="mt-4 border-b border-border-muted" />
                  <VipPointsSection
                    pointsAllocation={dashboard.pointsAllocation}
                    title={dashboard.localizedText.pointsTitle}
                    subtitle={dashboard.localizedText.pointsAllocationTitle}
                    description={
                      dashboard.localizedText.pointsAllocationDescription
                    }
                    currentTier={currentTierFull}
                    nextTier={nextTierFull}
                  />
                </>
              );
            })()
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// Re-export tile test ids for tests that want to assert at the tile level.
export { VIP_FEE_TILE_TEST_IDS };

export default RewardsVipView;
