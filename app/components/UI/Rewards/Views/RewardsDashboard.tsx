import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Box, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import HeaderRoot from '../../../../component-library/components-temp/HeaderRoot';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectActiveTab,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
  selectSeasonId,
  selectSeasonEndDate,
  selectOptinAllowedForGeo,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from '../hooks/useRewardDashboardModals';
import { useBulkLinkState } from '../hooks/useBulkLinkState';
import MusdCalculatorTab from '../components/Tabs/MusdCalculatorTab/MusdCalculatorTab';
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import {
  TabsListRef,
  TabViewProps,
} from '../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import PreviousSeasonSummary from '../components/PreviousSeason/PreviousSeasonSummary';
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const toastRef = useRef<ToastRef>(null);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const activeTab = useSelector(selectActiveTab);
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedDashboardViewed = useRef(false);
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const seasonId = useSelector(selectSeasonId);
  const seasonEndDate = useSelector(selectSeasonEndDate);
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
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

  const [showPreviousSeasonSummary, setShowPreviousSeasonSummary] = useState<
    boolean | null
  >(null);
  const tabsListRef = useRef<TabsListRef>(null);

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

  // Evaluate showPreviousSeasonSummary when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const shouldShow = Boolean(
        seasonId &&
          seasonEndDate &&
          new Date(seasonEndDate).getTime() < Date.now() &&
          !isCampaignsEnabled,
      );
      setShowPreviousSeasonSummary(shouldShow);
    }, [seasonId, seasonEndDate, isCampaignsEnabled]),
  );

  // Auto-trigger dashboard modals based on account/rewards state (session-aware)
  // This effect runs whenever key dependencies change and determines which informational
  // modal should be shown to guide the user. Each modal type is only shown once per app session.
  useFocusEffect(
    useCallback(() => {
      if (
        !seasonId ||
        showPreviousSeasonSummary === null ||
        showPreviousSeasonSummary
      )
        return;

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
      seasonId,
      showPreviousSeasonSummary,
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
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW}
      >
        <HeaderRoot
          title={strings('rewards.main_title')}
          includesTopInset
          endButtonIconProps={[
            {
              iconName: IconName.Setting,
              onPress: () => navigation.navigate(Routes.REWARDS_SETTINGS_VIEW),
              disabled: !subscriptionId,
              testID: REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
            },
            ...(showPreviousSeasonSummary === false
              ? [
                  {
                    iconName: IconName.UserCircleAdd,
                    onPress: () =>
                      navigation.navigate(Routes.REFERRAL_REWARDS_VIEW),
                    disabled: !subscriptionId,
                    testID: REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
                  },
                ]
              : []),
          ]}
        />
        <Box twClassName="flex-1 gap-4">
          {isCampaignsEnabled && <CampaignsPreview />}
          {showPreviousSeasonSummary &&
            (optinAllowedForGeo ? (
              <TabsList
                ref={tabsListRef}
                initialActiveIndex={0}
                testID={REWARDS_VIEW_SELECTORS.TAB_CONTROL}
                tabsBarProps={{ twClassName: 'px-4' }}
                tabsListContentTwClassName="px-0"
              >
                <Box
                  key="musd"
                  {...({ tabLabel: 'mUSD' } as TabViewProps)}
                  twClassName="flex-1"
                >
                  <MusdCalculatorTab />
                </Box>
                <Box
                  key="previous-season"
                  {...({
                    tabLabel: strings('rewards.season_1'),
                  } as TabViewProps)}
                  twClassName="flex-1"
                >
                  <PreviousSeasonSummary />
                </Box>
              </TabsList>
            ) : (
              <PreviousSeasonSummary />
            ))}
        </Box>
      </SafeAreaView>
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
