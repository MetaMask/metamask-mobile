import React, { useEffect } from 'react';
import { Image, ScrollView } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  HeaderStandard,
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
import VipSplashFox from '../../../../images/rewards/vip_splash.png';
import { acceptVipRefereeInvite } from '../../../../reducers/rewards';
import {
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipRefereeDashboard } from '../hooks/useVipRefereeDashboard';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import ForcedDarkThemeProvider from '../components/ForcedDarkThemeProvider/ForcedDarkThemeProvider';
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
} from '../components/Vip/Vip.constants';
import {
  formatNumber,
  formatRewardsTimeOnly,
  formatUsd,
} from '../utils/formatUtils';

export const REWARDS_VIP_REFEREE_VIEW_TEST_IDS = {
  VIEW: 'rewards-vip-referee-view',
  SCROLL: 'rewards-vip-referee-view-scroll',
  SKELETON: 'rewards-vip-referee-view-skeleton',
  ERROR: 'rewards-vip-referee-view-error',
  REFERRED_BY_CARD: 'rewards-vip-referee-view-referred-by-card',
  POINTS: 'rewards-vip-referee-view-points',
  SWAPS_VOLUME: 'rewards-vip-referee-view-swaps-volume',
  PERPS_VOLUME: 'rewards-vip-referee-view-perps-volume',
  LAST_UPDATED: 'rewards-vip-referee-view-last-updated',
} as const;

const referredByCardStyle = {
  borderColor: VIP_GOLD_BORDER_DEFAULT,
  backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
};
const referredByTextStyle = { color: VIP_GOLD_TEXT_MUTED };

const RewardsVipRefereeViewContent: React.FC = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isVipReferee = useSelector(selectIsVipReferee);
  const canViewReferee = Boolean(
    isVipProgramEnabled && subscriptionId && isVipReferee,
  );
  const hasAcceptedVipRefereeInvite = useSelector(
    selectHasAcceptedVipRefereeInvite(subscriptionId),
  );

  const {
    dashboard,
    isLoading,
    hasError,
    hasAttemptedFetch,
    fetchVipRefereeDashboard,
  } = useVipRefereeDashboard();

  useTrackRewardsPageView({
    page_type: 'vip_referee',
    enabled: canViewReferee,
  });

  useEffect(() => {
    if (!canViewReferee) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
    }
  }, [canViewReferee, navigation]);

  // Persist that the user reached the referee page so the splash is skipped on
  // subsequent gold-fox taps (mirrors the VIP splash → VIP view pattern).
  useEffect(() => {
    if (!canViewReferee || !subscriptionId || hasAcceptedVipRefereeInvite) {
      return;
    }

    dispatch(acceptVipRefereeInvite({ subscriptionId }));
  }, [canViewReferee, dispatch, hasAcceptedVipRefereeInvite, subscriptionId]);

  if (!canViewReferee) {
    return null;
  }

  // Treat the pre-fetch idle window (mount → first attempt resolved) as loading
  // so the view doesn't briefly render nothing while useFocusEffect schedules
  // the initial fetch.
  const showSkeleton = (!hasAttemptedFetch || isLoading) && !dashboard;
  const showError = hasError && !dashboard;

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipRefereeView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.VIEW}
      >
        <HeaderStandard
          title=""
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />

        <ScrollView
          contentContainerStyle={tw.style('py-4 pb-8 gap-6 px-4')}
          testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SCROLL}
        >
          <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
            {strings('rewards.vip.referee_page_title')}
          </Text>

          {showSkeleton ? (
            <Box
              twClassName="gap-6"
              testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SKELETON}
            >
              <Skeleton style={tw.style('h-16 rounded-2xl')} />
              <Skeleton style={tw.style('h-8 w-44 rounded-lg')} />
              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
                <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
                <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
              </Box>
            </Box>
          ) : showError ? (
            <RewardsErrorBanner
              title={strings('rewards.vip.referee_error_title')}
              description={strings('rewards.vip.referee_error_description')}
              onConfirm={fetchVipRefereeDashboard}
              confirmButtonLabel={strings('rewards.vip.retry_button')}
              testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.ERROR}
            />
          ) : dashboard ? (
            <>
              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="items-center justify-between rounded-2xl border px-4 py-3"
                style={referredByCardStyle}
                testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.REFERRED_BY_CARD}
              >
                <Image
                  source={VipSplashFox}
                  style={tw.style('h-9 w-9')}
                  width={36}
                  height={36}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  style={referredByTextStyle}
                >
                  {strings('rewards.vip.referee_referred_by', {
                    code: dashboard.referredByCode ?? '',
                  })}
                </Text>
              </Box>

              <Box twClassName="gap-1">
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('rewards.vip.referee_stats_title')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('rewards.vip.referee_period_last_30d')}
                </Text>
              </Box>

              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
                <Box
                  twClassName="flex-1"
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.POINTS}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('rewards.vip.referee_points_label')}
                  </Text>
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Bold}
                  >
                    {formatNumber(dashboard.points)}
                  </Text>
                </Box>
                <Box
                  twClassName="flex-1"
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('rewards.vip.referee_swaps_volume_label')}
                  </Text>
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Bold}
                  >
                    {formatUsd(dashboard.swapsVolume)}
                  </Text>
                </Box>
              </Box>

              <Box
                twClassName="flex-1"
                testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.PERPS_VOLUME}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('rewards.vip.referee_perps_volume_label')}
                </Text>
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                >
                  {formatUsd(dashboard.perpsVolume)}
                </Text>
              </Box>

              {dashboard.computedAt ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="text-right"
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.LAST_UPDATED}
                >
                  {strings('rewards.vip.last_updated', {
                    time: formatRewardsTimeOnly(new Date(dashboard.computedAt)),
                  })}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const RewardsVipRefereeView: React.FC = () => (
  <ForcedDarkThemeProvider>
    <RewardsVipRefereeViewContent />
  </ForcedDarkThemeProvider>
);

export default RewardsVipRefereeView;
