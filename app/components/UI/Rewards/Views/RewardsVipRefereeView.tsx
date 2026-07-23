import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconColor,
  IconName,
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
import { exitRewardsFlow, getBetaSupportUrl } from '../utils';
import {
  buildVipPrioritySupportUrl,
  METAMASK_SUPPORT_URL,
} from '../../../../constants/urls';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import VipIcon from '../../../../images/rewards/vip.svg';
import { acceptVipRefereeInvite } from '../../../../reducers/rewards';
import {
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useSupportConsent } from '../../../hooks/useSupportConsent';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipRefereeDashboard } from '../hooks/useVipRefereeDashboard';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import ForcedDarkThemeProvider from '../components/ForcedDarkThemeProvider/ForcedDarkThemeProvider';
import VipSwapsVolumeInfoSheet from '../components/Vip/VipSwapsVolumeInfoSheet';
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
  SWAPS_VOLUME: 'rewards-vip-referee-view-swaps-volume',
  SWAPS_VOLUME_INFO: 'rewards-vip-referee-view-swaps-volume-info',
  PERPS_VOLUME: 'rewards-vip-referee-view-perps-volume',
  POINTS_TO: 'rewards-vip-referee-view-points-to',
  LAST_UPDATED: 'rewards-vip-referee-view-last-updated',
  CONTACT_SUPPORT_BUTTON: 'rewards-vip-referee-view-contact-support-button',
} as const;

const referredByCardStyle = {
  borderColor: VIP_GOLD_BORDER_DEFAULT,
  backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
};
const referredByTextStyle = { color: VIP_GOLD_TEXT_MUTED };

const RewardsVipRefereeViewContent: React.FC = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openSupportWithConsent } = useSupportConsent();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const accountAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
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
      exitRewardsFlow(navigation);
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

  // Opens the help center in the in-app WebView, tagging the request as VIP priority
  // and passing the user's account address so the support-side automation can verify
  // enrollment (via the existing GET /support/subscriptions/check?account= endpoint).
  const handleContactPrioritySupport = useCallback(() => {
    if (!accountAddress) {
      return;
    }

    const openWebview = (url: string) =>
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url,
          title: strings('app_settings.contact_support'),
        },
      });

    const betaSupportUrl = getBetaSupportUrl();

    if (betaSupportUrl) {
      openWebview(buildVipPrioritySupportUrl(accountAddress, betaSupportUrl));
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
      );
      return;
    }

    const vipSupportUrl = buildVipPrioritySupportUrl(
      accountAddress,
      METAMASK_SUPPORT_URL,
    );

    openSupportWithConsent(openWebview, vipSupportUrl);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [
    accountAddress,
    createEventBuilder,
    navigation,
    trackEvent,
    openSupportWithConsent,
  ]);

  const [isSwapsVolumeInfoVisible, setIsSwapsVolumeInfoVisible] =
    useState(false);

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
        edges={{ top: 'additive', bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.VIEW}
      >
        <HeaderStandard
          title=""
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />
        <Box twClassName="flex-1">
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('py-4 gap-4')}
            testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SCROLL}
          >
            {showSkeleton ? (
              <Box
                twClassName="gap-4 px-4"
                testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SKELETON}
              >
                <Skeleton style={tw.style('h-10 w-36 rounded-lg')} />

                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="items-center justify-between rounded-2xl border px-4 py-3"
                  style={referredByCardStyle}
                >
                  <Skeleton style={tw.style('h-9 w-9 rounded-lg')} />
                  <Skeleton style={tw.style('h-5 w-40 rounded-lg')} />
                </Box>

                <Box twClassName="mt-4 -mx-4 border-b border-border-muted" />

                <Box twClassName="gap-1">
                  <Skeleton style={tw.style('h-8 w-32 rounded-lg')} />
                  <Skeleton style={tw.style('h-4 w-44 rounded-lg')} />
                </Box>

                <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-20 rounded-lg')} />
                  </Box>
                  <Box twClassName="flex-1 gap-1">
                    <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
                    <Skeleton style={tw.style('h-6 w-20 rounded-lg')} />
                  </Box>
                </Box>

                <Box twClassName="gap-1">
                  <Skeleton style={tw.style('h-4 w-28 rounded-lg')} />
                  <Skeleton style={tw.style('h-6 w-16 rounded-lg')} />
                </Box>

                <Skeleton style={tw.style('h-4 w-36 rounded-lg')} />
              </Box>
            ) : showError ? (
              <Box twClassName="px-4">
                <RewardsErrorBanner
                  title={strings('rewards.vip.referee_error_title')}
                  description={strings('rewards.vip.referee_error_description')}
                  onConfirm={fetchVipRefereeDashboard}
                  confirmButtonLabel={strings('rewards.vip.retry_button')}
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.ERROR}
                />
              </Box>
            ) : dashboard ? (
              <Box twClassName="px-4 gap-4">
                <Text
                  variant={TextVariant.HeadingLg}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('rewards.vip.referee_page_title')}
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="items-center justify-between rounded-2xl border px-4 py-3"
                  style={referredByCardStyle}
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.REFERRED_BY_CARD}
                >
                  <VipIcon width={36} height={36} name="VipIcon" />
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
                {/* Divider */}
                <Box twClassName="mt-4 -mx-4 border-b border-border-muted" />

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
                    testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME}
                  >
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      twClassName="gap-1"
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings('rewards.vip.referee_swaps_volume_label')}
                      </Text>
                      <ButtonIcon
                        iconName={IconName.Info}
                        iconProps={{ color: IconColor.IconAlternative }}
                        size={ButtonIconSize.Sm}
                        onPress={() => setIsSwapsVolumeInfoVisible(true)}
                        accessibilityLabel={strings(
                          'rewards.vip.swaps_volume_info_label',
                        )}
                        testID={
                          REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME_INFO
                        }
                      />
                    </Box>
                    <Text
                      variant={TextVariant.HeadingSm}
                      fontWeight={FontWeight.Bold}
                    >
                      {formatUsd(dashboard.swapsVolume)}
                    </Text>
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
                </Box>

                <Box
                  twClassName="flex-1"
                  testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.POINTS_TO}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('rewards.vip.referee_points_to_label', {
                      code: dashboard.referredByCode ?? '',
                    })}
                  </Text>
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Bold}
                  >
                    {formatNumber(dashboard.points)}
                  </Text>
                </Box>

                {dashboard.computedAt ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={REWARDS_VIP_REFEREE_VIEW_TEST_IDS.LAST_UPDATED}
                  >
                    {strings('rewards.vip.last_updated', {
                      time: formatRewardsTimeOnly(
                        new Date(dashboard.computedAt),
                      ),
                    })}
                  </Text>
                ) : null}
              </Box>
            ) : null}
          </ScrollView>

          {showSkeleton ? (
            <Box twClassName="px-4 pb-4">
              <Skeleton style={tw.style('h-12 w-full rounded-lg')} />
            </Box>
          ) : dashboard ? (
            <Box twClassName="px-4 pb-4">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                disabled={!accountAddress}
                onPress={handleContactPrioritySupport}
                twClassName="w-full"
                testID={
                  REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON
                }
              >
                {strings('rewards.vip.referee_contact_support')}
              </Button>
            </Box>
          ) : null}
        </Box>
      </SafeAreaView>
      {isSwapsVolumeInfoVisible ? (
        <VipSwapsVolumeInfoSheet
          onClose={() => setIsSwapsVolumeInfoVisible(false)}
        />
      ) : null}
    </ErrorBoundary>
  );
};

const RewardsVipRefereeView: React.FC = () => (
  <ForcedDarkThemeProvider>
    <RewardsVipRefereeViewContent />
  </ForcedDarkThemeProvider>
);

export default RewardsVipRefereeView;
