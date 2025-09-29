import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Text,
  TextVariant,
  IconName as IconNameDS,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import {
  setActiveTab,
  setHideUnlinkedAccountsBanner,
} from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { RewardsTab } from '../../../../reducers/rewards/types';
import {
  selectActiveTab,
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
  selectHideUnlinkedAccountsBanner,
} from '../../../../selectors/rewards';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useLinkAccount } from '../hooks/useLinkAccount';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import AccountDisplayItem from '../components/AccountDisplayItem/AccountDisplayItem';
import RewardsOverview from '../components/Tabs/RewardsOverview';
import RewardsLevels from '../components/Tabs/RewardsLevels';
import RewardsActivity from '../components/Tabs/RewardsActivity';
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import { TabsListRef } from '../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { CaipAccountId } from '@metamask/utils';
import { setHideCurrentAccountNotOptedInBanner } from '../../../../reducers/rewards';
import { convertInternalAccountToCaipAccountId } from '../utils';

const RewardsDashboard: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const toastRef = useRef<ToastRef>(null);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const activeTab = useSelector(selectActiveTab);
  const dispatch = useDispatch();
  const hasAccountedOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const hideCurrentAccountNotOptedInBannerMap = useSelector(
    selectHideCurrentAccountNotOptedInBannerArray,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const hideCurrentAccountNotOptedInBanner = useMemo((): boolean => {
    if (selectedAccount && hideCurrentAccountNotOptedInBannerMap) {
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

  // Track linking operation state
  const [isLinking, setIsLinking] = useState(false);

  // Ref for TabsList to control active tab programmatically
  const tabsListRef = useRef<TabsListRef>(null);

  // Use the link account hook
  const { linkAccount } = useLinkAccount();

  // Use the opt-in summary hook to check for unlinked accounts
  const { unlinkedAccounts, currentAccountSupported } = useRewardOptinSummary({
    enabled: !hideUnlinkedAccountsBanner,
  });

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

  const handleLinkCurrentAccount = useCallback(async () => {
    if (!selectedAccount || isLinking) return;

    setIsLinking(true);
    try {
      await linkAccount(selectedAccount);
    } finally {
      setIsLinking(false);
    }
  }, [selectedAccount, linkAccount, isLinking]);

  const handleDismissCurrentAccountBanner = useCallback(() => {
    if (selectedAccount) {
      const caipAccountId =
        convertInternalAccountToCaipAccountId(selectedAccount);
      if (caipAccountId) {
        dispatch(
          setHideCurrentAccountNotOptedInBanner({
            accountId: caipAccountId as CaipAccountId,
            hide: true,
          }),
        );
      }
    }
  }, [selectedAccount, dispatch]);

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

        {/* Current Account Not Opted In or Not Supported Banner */}
        {(hasAccountedOptedIn === false || currentAccountSupported === false) &&
          !hideCurrentAccountNotOptedInBanner &&
          selectedAccount && (
            <RewardsInfoBanner
              title={
                <Box twClassName="mb-3">
                  <AccountDisplayItem account={selectedAccount} />
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-default"
                  >
                    {currentAccountSupported === false
                      ? strings(
                          'rewards.unlinked_account_info.title_optin_not_supported',
                        )
                      : strings('rewards.unlinked_account_info.title')}
                  </Text>
                </Box>
              }
              description={
                currentAccountSupported === false
                  ? strings(
                      'rewards.unlinked_account_info.description_optin_not_supported',
                    )
                  : strings('rewards.unlinked_account_info.description')
              }
              confirmButtonLabel={
                currentAccountSupported !== false
                  ? isLinking
                    ? strings('rewards.linking_account')
                    : strings('rewards.link_account')
                  : undefined
              }
              showInfoIcon={false}
              onConfirm={
                currentAccountSupported !== false
                  ? handleLinkCurrentAccount
                  : undefined
              }
              onConfirmLoading={isLinking}
              onDismiss={handleDismissCurrentAccountBanner}
            />
          )}

        {/* Unlinked Accounts Banner */}
        {subscriptionId &&
          (hasAccountedOptedIn === true ||
            hideCurrentAccountNotOptedInBanner) &&
          unlinkedAccounts.length > 0 &&
          !hideUnlinkedAccountsBanner && (
            <RewardsInfoBanner
              title={strings('rewards.unlinked_accounts_info.title')}
              description={strings(
                'rewards.unlinked_accounts_info.description',
              )}
              onConfirm={() => {
                navigation.navigate(Routes.REWARDS_SETTINGS_VIEW, {
                  focusUnlinkedTab: true,
                });
              }}
              confirmButtonLabel={strings(
                'rewards.unlinked_accounts_info.go_to_settings',
              )}
              onDismiss={() => {
                dispatch(setHideUnlinkedAccountsBanner(true));
              }}
            />
          )}

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
