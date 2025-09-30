import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import {
  selectRewardsSubscriptionId,
  selectHideUnlinkedAccountsBanner,
} from '../../../../selectors/rewards';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
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
import { convertInternalAccountToCaipAccountId } from '../utils';

const RewardsDashboard: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const toastRef = useRef<ToastRef>(null);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const activeTab = useSelector(selectActiveTab);
  const dispatch = useDispatch();
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const hideCurrentAccountNotOptedInBannerMap = useSelector(
    selectHideCurrentAccountNotOptedInBannerArray,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const hideCurrentAccountNotOptedInBanner = useMemo((): boolean => {
    if (
      selectedAccount &&
      hideCurrentAccountNotOptedInBannerMap &&
      selectedAccount.id
    ) {
      const caipAccountId =
        convertInternalAccountToCaipAccountId(selectedAccount);
      return (
        hideCurrentAccountNotOptedInBannerMap.find(
          (item) => item.caipAccountId === caipAccountId,
        )?.hide || false
      );
    }
    return false;
  }, [selectedAccount, hideCurrentAccountNotOptedInBannerMap]);
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
  const { unlinkedAccounts, currentAccountSupported, currentAccountOptedIn } =
    useRewardOptinSummary();

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

  // Auto-trigger dashboard modals based on account/rewards state (session-aware)
  // This effect runs whenever key dependencies change and determines which informational
  // modal should be shown to guide the user. Each modal type is only shown once per app session.
  useEffect(() => {
    if (
      (currentAccountOptedIn === false || currentAccountSupported === false) &&
      !hideCurrentAccountNotOptedInBanner &&
      selectedAccount
    ) {
      if (currentAccountSupported === false) {
        // Account type not supported (e.g., hardware wallets)
        if (!hasShownModal('not-supported' as RewardsDashboardModalType)) {
          showNotSupportedModal();
        }
      } else if (!hasShownModal('not-opted-in' as RewardsDashboardModalType)) {
        // Account can be opted in but hasn't been yet
        showNotOptedInModal();
      }
      return; // Don't check for unlinked accounts if current account has issues
    }

    // Priority 2: Check for unlinked accounts (only if current account is good)
    if (
      subscriptionId &&
      (currentAccountOptedIn === true || hideCurrentAccountNotOptedInBanner) &&
      unlinkedAccounts.length > 0 &&
      !hideUnlinkedAccountsBanner
    ) {
      // User has other accounts that could be earning rewards
      if (!hasShownModal('unlinked-accounts' as RewardsDashboardModalType)) {
        showUnlinkedAccountsModal();
      }
    }
  }, [
    currentAccountOptedIn,
    currentAccountSupported,
    hideCurrentAccountNotOptedInBanner,
    selectedAccount,
    subscriptionId,
    unlinkedAccounts.length,
    hideUnlinkedAccountsBanner,
    showNotOptedInModal,
    showUnlinkedAccountsModal,
    showNotSupportedModal,
    hasShownModal,
  ]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <Box
        twClassName="flex-1 px-4 bg-default gap-4 relative"
        style={{ marginTop: insets.top }}
      >
        {/* Header row */}
        <Box twClassName="flex-row  justify-between">
          <Text variant={TextVariant.HeadingLg} twClassName="text-default">
            {strings('rewards.main_title')}
          </Text>

          <Box flexDirection={BoxFlexDirection.Row}>
            <ButtonIcon
              iconName={IconNameDS.UserCircleAdd}
              size={ButtonIconSize.Lg}
              disabled={!subscriptionId}
              testID={REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON}
              onPress={() => {
                navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
              }}
            />

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

        <SeasonStatus />

        {/* Tab View */}
        <TabsList
          ref={tabsListRef}
          initialActiveIndex={getActiveIndex()}
          onChangeTab={handleTabChange}
          testID={REWARDS_VIEW_SELECTORS.TAB_CONTROL}
        >
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
      </Box>
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
