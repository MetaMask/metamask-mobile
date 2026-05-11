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
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import HeaderRoot from '../../../../component-library/components-temp/HeaderRoot';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectActiveTab,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
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
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';
import EarnRewardsPreview from '../components/EarnRewards/EarnRewardsPreview';
import BenefitsPreview from '../components/Benefits/BenefitsPreview.tsx';
import { Pressable, ScrollView } from 'react-native';
import { useOndoOutcomeToast } from '../hooks/useOndoOutcomeToast';
import { usePerpsTradingCampaignEndedOutcomeToast } from '../hooks/usePerpsTradingCampaignEndedOutcomeToast';
import CrownIcon from '../../../../images/rewards/crown.svg';
import Engine from '../../../../core/Engine';

const VIP_UNLOCK_TAP_COUNT = 5;
const VIP_UNLOCK_TAP_WINDOW_MS = 3000;

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const activeTab = useSelector(selectActiveTab);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedDashboardViewed = useRef(false);

  useTrackRewardsPageView({ page_type: 'home' });
  useOndoOutcomeToast();
  usePerpsTradingCampaignEndedOutcomeToast();

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
              {isVipEnabled && (
                <Pressable
                  accessibilityLabel={strings('rewards.vip.title')}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(Routes.REWARDS_VIP_VIEW)}
                  style={tw.style('h-8 w-8 items-center justify-center')}
                  testID={REWARDS_VIEW_SELECTORS.VIP_BUTTON}
                >
                  <CrownIcon
                    color={colors.icon.default}
                    name="crown"
                    width={24}
                    height={24}
                  />
                </Pressable>
              )}
              <ButtonIcon
                iconName={IconName.UserCircleAdd}
                onPress={() =>
                  navigation.navigate(Routes.REFERRAL_REWARDS_VIEW)
                }
                size={ButtonIconSize.Md}
                testID={REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON}
              />
              <ButtonIcon
                disabled={!subscriptionId}
                iconName={IconName.Setting}
                onPress={() =>
                  navigation.navigate(Routes.REWARDS_SETTINGS_VIEW)
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
