import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Text,
  TextVariant,
  IconName as IconNameDS,
} from '@metamask/design-system-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { setActiveTab } from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { RewardsTab } from '../../../../reducers/rewards/types';
import {
  selectActiveTab,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
  selectSeasonId,
  selectSeasonEndDate,
} from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from '../hooks/useRewardDashboardModals';
import RewardsOverview from '../components/Tabs/RewardsOverview';
import RewardsLevels from '../components/Tabs/RewardsLevels';
import RewardsActivity from '../components/Tabs/RewardsActivity';
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import { TabsListRef } from '../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import PreviousSeasonSummary from '../components/PreviousSeason/PreviousSeasonSummary';

const RewardsDashboard: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const toastRef = useRef<ToastRef>(null);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const activeTab = useSelector(selectActiveTab);
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedDashboardViewed = useRef(false);
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const seasonId = useSelector(selectSeasonId);
  const seasonEndDate = useSelector(selectSeasonEndDate);
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
  const insets = useSafeAreaInsets();

  // Ref for TabsList to control active tab programmatically
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

  // Set navigation title
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('rewards.main_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);

  const tabOptions = useMemo(
    () => [
      {
        value: 'overview' as const,
        label: strings('rewards.tab_overview_title'),
      },
      {
        value: 'levels' as const,
        label: strings('rewards.tab_levels_title'),
      },
      {
        value: 'activity' as const,
        label: strings('rewards.tab_activity_title'),
      },
    ],
    [],
  );

  const getActiveIndex = useCallback(
    () => tabOptions.findIndex((tab) => tab.value === activeTab),
    [tabOptions, activeTab],
  );

  // Sync TabsList with Redux state changes
  useEffect(() => {
    const activeIndex = tabOptions.findIndex((tab) => tab.value === activeTab);
    if (tabsListRef.current && activeIndex !== -1) {
      // Use setTimeout to avoid race conditions with TabsList internal state
      if (tabsListRef.current) {
        tabsListRef.current.goToTabIndex(activeIndex);
      }
    }
  }, [activeTab, tabOptions]);

  const handleTabChange = useCallback(
    ({ i }: { i: number }) => {
      const newTab = tabOptions[i]?.value as RewardsTab;
      // Only dispatch if the tab is actually different to prevent loops
      if (newTab && newTab !== activeTab) {
        dispatch(setActiveTab(newTab));
      }
    },
    [dispatch, tabOptions, activeTab],
  );

  const tabsListProps = useMemo(
    () => ({
      ref: tabsListRef,
      initialActiveIndex: getActiveIndex(),
      onChangeTab: handleTabChange,
      testID: REWARDS_VIEW_SELECTORS.TAB_CONTROL,
      tabsBarProps: {
        twClassName: 'px-4',
      },
      tabsListContentTwClassName: 'px-0',
    }),
    [getActiveIndex, handleTabChange],
  );

  const [showPreviousSeasonSummary, setShowPreviousSeasonSummary] = useState<
    boolean | null
  >(null);

  // Evaluate showPreviousSeasonSummary when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const shouldShow = Boolean(
        seasonId &&
          seasonEndDate &&
          new Date(seasonEndDate).getTime() < Date.now(),
      );
      setShowPreviousSeasonSummary(shouldShow);
    }, [seasonId, seasonEndDate]),
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
      <Box
        twClassName="flex-1 bg-default gap-4 relative"
        style={{ marginTop: insets.top }}
      >
        {/* Header row */}
        <Box twClassName="flex-row justify-between px-4">
          <Text variant={TextVariant.HeadingLg} twClassName="text-default">
            {strings('rewards.main_title')}
          </Text>

          <Box flexDirection={BoxFlexDirection.Row}>
            {showPreviousSeasonSummary === false && (
              <ButtonIcon
                iconName={IconNameDS.UserCircleAdd}
                size={ButtonIconSize.Lg}
                disabled={!subscriptionId}
                testID={REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON}
                onPress={() => {
                  navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
                }}
              />
            )}

            <ButtonIcon
              iconName={IconNameDS.Setting}
              size={ButtonIconSize.Lg}
              disabled={!subscriptionId}
              testID={REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON}
              onPress={() => {
                navigation.navigate(Routes.REWARDS_SETTINGS_VIEW);
              }}
            />
          </Box>
        </Box>

        {showPreviousSeasonSummary ? (
          <PreviousSeasonSummary />
        ) : (
          <>
            <SeasonStatus />

            {/* Tab View */}
            <TabsList {...tabsListProps}>
              <RewardsOverview
                key="overview"
                tabLabel={strings('rewards.tab_overview_title')}
              />
              <RewardsLevels
                key="levels"
                tabLabel={strings('rewards.tab_levels_title')}
              />
              <RewardsActivity
                key="activity"
                tabLabel={strings('rewards.tab_activity_title')}
              />
            </TabsList>
          </>
        )}
      </Box>
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
