import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import HeaderRoot from '../../../../component-library/components-temp/HeaderRoot';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectActiveTab,
  selectHasAcceptedVipInvite,
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
  selectPendingDeeplink,
} from '../../../../reducers/rewards/selectors';
import { setPendingDeeplink } from '../../../../reducers/rewards';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from '../hooks/useRewardDashboardModals';
import { useBulkLinkState } from '../hooks/useBulkLinkState';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useGeoRewardsMetadata } from '../hooks/useGeoRewardsMetadata';
import { useReferralDetails } from '../hooks/useReferralDetails';
import { navigateToRewardsRoute } from '../utils';
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';
import EarnRewardsPreview from '../components/EarnRewards/EarnRewardsPreview';
import BenefitsPreview from '../components/Benefits/BenefitsPreview.tsx';
import { Pressable, ScrollView } from 'react-native';
import { useOndoOutcomeToast } from '../hooks/useOndoOutcomeToast';
import { usePerpsTradingCampaignEndedOutcomeToast } from '../hooks/usePerpsTradingCampaignEndedOutcomeToast';
import { useGetPredictThePitchOutcomeToast } from '../hooks/useGetPredictThePitchOutcomeToast';
import VipIcon from '../../../../images/rewards/vip.svg';
import Engine from '../../../../core/Engine';

const VIP_UNLOCK_TAP_COUNT = 5;
const VIP_UNLOCK_TAP_WINDOW_MS = 3000;

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const pendingDeeplink = useSelector(selectPendingDeeplink);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const hasAcceptedVipInvite = useSelector(
    selectHasAcceptedVipInvite(subscriptionId),
  );
  const isVipReferee = useSelector(selectIsVipReferee);
  const hasAcceptedVipRefereeInvite = useSelector(
    selectHasAcceptedVipRefereeInvite(subscriptionId),
  );
  const activeTab = useSelector(selectActiveTab);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedDashboardViewed = useRef(false);

  useTrackRewardsPageView({ page_type: 'home' });
  useOndoOutcomeToast();
  usePerpsTradingCampaignEndedOutcomeToast();
  useGetPredictThePitchOutcomeToast();

  // Data hooks that populate Redux for the dashboard and its pushed sub-pages.
  // The version guard and candidate-subscription fetch live one level up in
  // RewardsHome (MainNavigator) so they also cover the onboarding entry path for
  // non-enrolled users; only dashboard-specific hooks remain here.
  useGeoRewardsMetadata({});
  useReferralDetails();

  // Handle deeplink-driven navigation into a rewards sub-page. The dashboard is
  // what mounts on a rewards deeplink (the Rewards tab); the sub-pages are
  // registered as a group at the root MainNavigator level, so a direct
  // navigate(<screen>) resolves them. We read the pending deeplink from Redux —
  // rather than navigation params — because the Rewards tab is UnmountOnBlur, so
  // params would be lost while on another tab. Once handled, the pending deeplink
  // is cleared so it doesn't re-fire on subsequent mounts.
  useEffect(() => {
    if (!pendingDeeplink) {
      return;
    }

    let handled = true;
    if (pendingDeeplink.page === 'campaigns') {
      navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGNS_VIEW);
    } else if (pendingDeeplink.campaign === 'ondo') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'season1') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'perps-comp') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'predict-the-pitch') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.page === 'musd') {
      navigateToRewardsRoute(navigation, Routes.REWARDS_MUSD_CALCULATOR_VIEW);
    } else if (pendingDeeplink.page === 'benefits') {
      // Benefits full view is registered at the root MainNavigator level.
      navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
    } else {
      // Unrecognized page/campaign: do not clear the pending deeplink so the
      // intent is preserved and can be retried, rather than silently dropped.
      handled = false;
    }

    if (handled) {
      dispatch(setPendingDeeplink(null));
    }
  }, [navigation, dispatch, pendingDeeplink]);

  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const hideCurrentAccountNotOptedInBannerMap = useSelector(
    selectHideCurrentAccountNotOptedInBannerArray,
  );
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const hideCurrentAccountNotOptedInBanner = useMemo((): boolean => {
    if (hideCurrentAccountNotOptedInBannerMap && selectedAccountGroup?.id) {
      return (
        hideCurrentAccountNotOptedInBannerMap.find(
          (item) => item.accountGroupId === selectedAccountGroup?.id,
        )?.hide || false
      );
    }
    return false;
  }, [selectedAccountGroup?.id, hideCurrentAccountNotOptedInBannerMap]);

  // Use the reward dashboard modals hook
  const {
    showUnlinkedAccountsModal,
    showNotOptedInModal,
    showNotSupportedModal,
    hasShownModal,
  } = useRewardDashboardModals();

  // Use the opt-in summary hook to check for unlinked accounts
  const {
    byWallet: optInByWallet,
    bySelectedAccountGroup: optInBySelectedAccountGroup,
    currentAccountGroupPartiallySupported,
    currentAccountGroupOptedInStatus,
  } = useRewardOptinSummary();

  // Use the bulk link state hook for resuming interrupted opt-in processes
  const { wasInterrupted, isRunning, resumeBulkLink } = useBulkLinkState();

  const totalOptedInAccountsSelectedGroup = useMemo(
    () => optInBySelectedAccountGroup?.optedInAccounts?.length,
    [optInBySelectedAccountGroup],
  );

  const totalAccountGroupsWithOptedOutAccounts = useMemo(
    () =>
      optInByWallet.reduce(
        (accWallet, wallet) =>
          accWallet +
          wallet.groups.reduce(
            (accGroup, group) => accGroup + group.optedOutAccounts.length,
            0,
          ),
        0,
      ),
    [optInByWallet],
  );

  // Auto-resume interrupted bulk link process when screen comes into focus.
  // This handles the case where the app was closed during a bulk opt-in process.
  // The saga is idempotent - it re-fetches opt-in status to skip already-linked accounts.
  useFocusEffect(
    useCallback(() => {
      if (wasInterrupted && !isRunning) {
        resumeBulkLink();
      }
    }, [wasInterrupted, isRunning, resumeBulkLink]),
  );

  // Auto-trigger dashboard modals based on account/rewards state (session-aware)
  // This effect runs whenever key dependencies change and determines which informational
  // modal should be shown to guide the user. Each modal type is only shown once per app session.
  useFocusEffect(
    useCallback(() => {
      if (
        (totalOptedInAccountsSelectedGroup === 0 ||
          currentAccountGroupPartiallySupported === false) &&
        !hideCurrentAccountNotOptedInBanner &&
        selectedAccountGroup?.id
      ) {
        if (currentAccountGroupPartiallySupported === false) {
          // Account group entirely not not supported (e.g. hardware wallet account group)
          if (!hasShownModal('not-supported' as RewardsDashboardModalType)) {
            showNotSupportedModal();
          }
        } else if (
          !hasShownModal('not-opted-in' as RewardsDashboardModalType)
        ) {
          // Account can be opted in but hasn't been yet
          showNotOptedInModal();
        }
        return; // Don't check for unlinked accounts if current account has issues
      }

      // Priority 2: Check for unlinked accounts (only if current account is good)
      if (
        subscriptionId &&
        (currentAccountGroupOptedInStatus === 'fullyOptedIn' ||
          currentAccountGroupOptedInStatus === 'partiallyOptedIn' ||
          hideCurrentAccountNotOptedInBanner) &&
        totalAccountGroupsWithOptedOutAccounts > 0 &&
        !hideUnlinkedAccountsBanner
      ) {
        // User has other accounts that could be earning rewards
        if (!hasShownModal('unlinked-accounts' as RewardsDashboardModalType)) {
          showUnlinkedAccountsModal();
        }
      }
    }, [
      totalOptedInAccountsSelectedGroup,
      currentAccountGroupPartiallySupported,
      hideCurrentAccountNotOptedInBanner,
      selectedAccountGroup?.id,
      subscriptionId,
      currentAccountGroupOptedInStatus,
      totalAccountGroupsWithOptedOutAccounts,
      hideUnlinkedAccountsBanner,
      hasShownModal,
      showNotSupportedModal,
      showNotOptedInModal,
      showUnlinkedAccountsModal,
    ]),
  );

  useEffect(() => {
    if (!hasTrackedDashboardViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_DASHBOARD_VIEWED).build(),
      );
      hasTrackedDashboardViewed.current = true;
    }
  }, [trackEvent, createEventBuilder]);

  // Hidden VIP unlock: 5 taps on the title within 3s, once per dashboard visit,
  // only attempted when the user isn't already VIP. A non-null
  // getVIPDashboard response means the backend considers them VIP-eligible,
  // so we flip the cached subscription flag locally.
  const vipUnlockTapCountRef = useRef(0);
  const vipUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vipUnlockTriggeredRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      vipUnlockTapCountRef.current = 0;
      vipUnlockTriggeredRef.current = false;
      return () => {
        if (vipUnlockTimerRef.current) {
          clearTimeout(vipUnlockTimerRef.current);
          vipUnlockTimerRef.current = null;
        }
        vipUnlockTapCountRef.current = 0;
      };
    }, []),
  );

  const handleTitlePress = useCallback(() => {
    if (isVipEnabled || vipUnlockTriggeredRef.current || !subscriptionId) {
      return;
    }

    vipUnlockTapCountRef.current += 1;

    if (vipUnlockTimerRef.current) {
      clearTimeout(vipUnlockTimerRef.current);
    }
    vipUnlockTimerRef.current = setTimeout(() => {
      vipUnlockTapCountRef.current = 0;
      vipUnlockTimerRef.current = null;
    }, VIP_UNLOCK_TAP_WINDOW_MS);

    if (vipUnlockTapCountRef.current < VIP_UNLOCK_TAP_COUNT) {
      return;
    }

    vipUnlockTriggeredRef.current = true;
    vipUnlockTapCountRef.current = 0;
    if (vipUnlockTimerRef.current) {
      clearTimeout(vipUnlockTimerRef.current);
      vipUnlockTimerRef.current = null;
    }

    (async () => {
      try {
        // The controller flips `subscription.features.vip.enabled` as a side
        // effect when the VIP dashboard fetch returns a non-null payload, so
        // calling this is enough to update the icon visibility.
        await Engine.controllerMessenger.call(
          'RewardsController:getVIPDashboard',
          subscriptionId,
        );
      } catch {
        // Network/other error — leave the flag as-is. The easter-egg can be
        // retried by re-entering the dashboard.
        vipUnlockTriggeredRef.current = false;
      }
    })();
  }, [isVipEnabled, subscriptionId]);

  const handleVipPress = useCallback(() => {
    navigateToRewardsRoute(
      navigation,
      hasAcceptedVipInvite
        ? Routes.REWARDS_VIP_VIEW
        : Routes.REWARDS_VIP_SPLASH_VIEW,
    );
  }, [hasAcceptedVipInvite, navigation]);

  const handleVipRefereePress = useCallback(() => {
    navigateToRewardsRoute(
      navigation,
      hasAcceptedVipRefereeInvite
        ? Routes.REWARDS_VIP_REFEREE_VIEW
        : Routes.REWARDS_VIP_REFEREE_SPLASH_VIEW,
    );
  }, [hasAcceptedVipRefereeInvite, navigation]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_DASHBOARD_TAB_VIEWED)
        .addProperties({ tab: activeTab })
        .build(),
    );
  }, [activeTab, trackEvent, createEventBuilder]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW}
      >
        <HeaderRoot
          endAccessory={
            <Box twClassName="flex-row gap-2">
              {isVipProgramEnabled && isVipReferee && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleVipRefereePress}
                  style={tw.style('h-8 w-8 items-center justify-center')}
                  testID={REWARDS_VIEW_SELECTORS.VIP_REFEREE_BUTTON}
                >
                  <VipIcon width={24} height={24} name="VipIcon" />
                </Pressable>
              )}
              {isVipProgramEnabled && isVipEnabled && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleVipPress}
                  style={tw.style('h-8 w-8 items-center justify-center')}
                  testID={REWARDS_VIEW_SELECTORS.VIP_BUTTON}
                >
                  <VipIcon width={24} height={24} name="VipIcon" />
                </Pressable>
              )}
              <ButtonIcon
                iconName={IconName.UserCircleAdd}
                onPress={() =>
                  navigateToRewardsRoute(
                    navigation,
                    Routes.REFERRAL_REWARDS_VIEW,
                  )
                }
                size={ButtonIconSize.Md}
                testID={REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON}
              />
              <ButtonIcon
                disabled={!subscriptionId}
                iconName={IconName.Setting}
                onPress={() =>
                  navigateToRewardsRoute(
                    navigation,
                    Routes.REWARDS_SETTINGS_VIEW,
                  )
                }
                size={ButtonIconSize.Md}
                testID={REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON}
              />
            </Box>
          }
        >
          <Pressable
            accessibilityRole="header"
            onPress={handleTitlePress}
            testID={REWARDS_VIEW_SELECTORS.TITLE}
          >
            <Text variant={TextVariant.HeadingLg}>
              {strings('rewards.main_title')}
            </Text>
          </Pressable>
        </HeaderRoot>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
        >
          <Box twClassName="gap-3">
            <CampaignsPreview />
            <EarnRewardsPreview />
            <BenefitsPreview />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
