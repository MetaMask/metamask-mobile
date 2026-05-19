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
} from '../components/Vip/VipFeeTile';
import VipPointsSection from '../components/Vip/VipPointsSection';
import VipTierProgressCard from '../components/Vip/VipTierProgressCard';
import VipVolumeSection from '../components/Vip/VipVolumeSection';
import { formatNumber } from '../utils/formatUtils';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

export const REWARDS_VIP_VIEW_TEST_IDS = {
  INVITE_BUTTON: 'rewards-vip-view-invite-button',
  SCROLL: 'rewards-vip-view-scroll',
  SKELETON: 'rewards-vip-view-skeleton',
  ERROR: 'rewards-vip-view-error',
  TIER_BENEFITS_HEADER: 'rewards-vip-view-tier-benefits-header',
  TIER_BENEFITS_CAROUSEL: 'rewards-vip-view-tier-benefits-carousel',
  REVENUE_SHARE_TILE: 'rewards-vip-view-revenue-share-tile',
  SWAPS_FEE_TILE: 'rewards-vip-view-swaps-fee-tile',
  PERPS_FEE_TILE: 'rewards-vip-view-perps-fee-tile',
} as const;

const BENEFIT_TILE_WIDTH = 160;
const BENEFIT_TILE_GAP = 12;
const BENEFIT_TILE_SNAP_INTERVAL = BENEFIT_TILE_WIDTH + BENEFIT_TILE_GAP;

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
          contentContainerStyle={tw.style('p-4 pb-8 gap-4')}
          testID={REWARDS_VIP_VIEW_TEST_IDS.SCROLL}
        >
          {showSkeleton ? (
            <Box
              twClassName="gap-4"
              testID={REWARDS_VIP_VIEW_TEST_IDS.SKELETON}
            >
              <Skeleton style={tw.style('h-10 w-36 rounded-lg')} />
              <Skeleton style={tw.style('h-44 rounded-2xl')} />
              <Skeleton style={tw.style('h-8 w-44 rounded-lg')} />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
                <Skeleton
                  style={tw.style(
                    `h-30 w-[${BENEFIT_TILE_WIDTH}px] rounded-2xl`,
                  )}
                />
                <Skeleton
                  style={tw.style(
                    `h-30 w-[${BENEFIT_TILE_WIDTH}px] rounded-2xl`,
                  )}
                />
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
              />

              <Box>
                <Pressable
                  onPress={handleTiersPress}
                  style={tw.style(
                    'flex-row items-center self-start gap-2 my-3',
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
                  contentContainerStyle={tw.style('gap-3 pr-4')}
                  testID={REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_CAROUSEL}
                >
                  <VipFeeTile
                    label={dashboard.localizedText.revenueShareTitle}
                    currentBps={dashboard.fees.revenueShareBps}
                    unit="%"
                    // Revenue share is rendered in % while swap/perps tiles
                    // consume bps-formatted strings from the backend — build
                    // the next-tier label locally so the unit matches the
                    // current value. Hidden on the top tier (no further
                    // progression), signalled by currentTier === nextTier.
                    nextTierLabel={
                      dashboard.currentTier.tier === dashboard.nextTier.tier
                        ? undefined
                        : strings('rewards.vip.next_tier_value', {
                            value: `${
                              dashboard.fees.nextTierRevenueShareBps >=
                              dashboard.fees.revenueShareBps
                                ? '↑'
                                : '↓'
                            } ${formatNumber(
                              dashboard.fees.nextTierRevenueShareBps / 100,
                              2,
                            )}%`,
                          })
                    }
                    style={{ width: BENEFIT_TILE_WIDTH }}
                    testID={REWARDS_VIP_VIEW_TEST_IDS.REVENUE_SHARE_TILE}
                  />
                  <VipFeeTile
                    label={dashboard.localizedText.swapsFeeTitle}
                    currentBps={dashboard.fees.swapsBps}
                    nextTierLabel={
                      dashboard.localizedText.nextTierSwapsFeeDelta
                    }
                    style={{ width: BENEFIT_TILE_WIDTH }}
                    testID={REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE}
                  />
                  <VipFeeTile
                    label={dashboard.localizedText.perpsFeeTitle}
                    currentBps={dashboard.fees.perpsBps}
                    nextTierLabel={
                      dashboard.localizedText.nextTierPerpsFeeDelta
                    }
                    style={{ width: BENEFIT_TILE_WIDTH }}
                    testID={REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE}
                  />
                </ScrollView>
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
