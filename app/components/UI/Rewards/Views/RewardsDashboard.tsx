import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
  useContext,
} from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Text,
  TextVariant,
  IconName as IconNameDS,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { selectActiveTab } from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import {
  selectRewardsSubscriptionId,
  selectHideUnlinkedAccountsBanner,
} from '../../../../selectors/rewards';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import RewardsOverview from '../components/Tabs/RewardsOverview';
import RewardsLevels from '../components/Tabs/RewardsLevels';
import RewardsActivity from '../components/Tabs/RewardsActivity';
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import { TabsListRef } from '../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import { useUnlockedRewards } from '../hooks/useUnlockedRewards';
import Toast, {
  ToastContext,
} from '../../../../component-library/components/Toast';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import BannerAlert from '../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { useRewardsAccountGroupModal } from '../context/RewardsModalProvider';

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const { toastRef } = useContext(ToastContext);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const activeTab = useSelector(selectActiveTab);
  const dispatch = useDispatch();
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const { showAccountGroupModal } = useRewardsAccountGroupModal();

  // Ref for TabsList to control active tab programmatically
  const tabsListRef = useRef<TabsListRef>(null);

  // Force TabsList remount after navigation to ensure fresh state
  const [remountTrigger, setRemountTrigger] = useState(false);

  // Use the opt-in summary hook to check for unlinked accounts
  const {
    byWallet: optInByWallet,
    bySelectedAccountGroup: optInBySelectedAccountGroup,
  } = useRewardOptinSummary();

  const totalOptedOutAccountsSelectedGroup = useMemo(
    () => optInBySelectedAccountGroup?.optedOutAccounts?.length ?? 0,
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

  // Sync rewards controller state with UI store
  useSeasonStatus();
  useUnlockedRewards();

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

  // Resync TabsList when screen comes into focus (navigation)
  useFocusEffect(
    useCallback(() => {
      // Force TabsList remount to ensure fresh state after navigation
      setRemountTrigger((prev) => !prev);
    }, []),
  );

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

  const handleHideUnlinkedAccountsBanner = useCallback(() => {
    dispatch(setHideUnlinkedAccountsBanner(true));
  }, [dispatch]);

  const handleLinkCurrentAccountGroup = useCallback(async () => {
    if (!optInBySelectedAccountGroup) return;
    showAccountGroupModal(optInBySelectedAccountGroup.id, true);
  }, [optInBySelectedAccountGroup, showAccountGroupModal]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 px-4 bg-default gap-4 relative">
          {/* Header row */}
          <Box twClassName="flex-row  justify-between">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.main_title')}
            </Text>

            <Box flexDirection={BoxFlexDirection.Row}>
              <ButtonIcon
                iconName={IconNameDS.UserCircle}
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

          {/* Current Account Not Opted In Banner */}
          {Boolean(totalOptedOutAccountsSelectedGroup) && (
            <Box twClassName="-mx-4">
              <BannerAlert
                severity={BannerAlertSeverity.Warning}
                title={strings('rewards.unlinked_account_info.title')}
                style={tw.style('px-6 py-4')}
                description={strings(
                  'rewards.unlinked_account_info.description',
                )}
              >
                <Box flexDirection={BoxFlexDirection.Row} twClassName="mt-4">
                  <Button
                    variant={ButtonVariants.Primary}
                    size={ButtonSize.Md}
                    label={strings('rewards.unlinked_account_info.confirm')}
                    onPress={handleLinkCurrentAccountGroup}
                  />
                </Box>
              </BannerAlert>
            </Box>
          )}

          {/* Unlinked Accounts Banner */}
          {subscriptionId &&
            !totalOptedOutAccountsSelectedGroup &&
            totalAccountGroupsWithOptedOutAccounts > 0 &&
            !hideUnlinkedAccountsBanner && (
              <BannerAlert
                severity={BannerAlertSeverity.Info}
                title={strings('rewards.unlinked_accounts_info.title')}
                description={strings(
                  'rewards.unlinked_accounts_info.description',
                )}
                // Don't use closeButtonProps - put buttons in children instead
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="gap-3 mt-4"
                >
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={ButtonSize.Md}
                    label={strings('rewards.unlinked_accounts_info.dismiss')}
                    onPress={() => {
                      handleHideUnlinkedAccountsBanner();
                    }}
                  />

                  <Button
                    variant={ButtonVariants.Primary}
                    isInverse
                    size={ButtonSize.Md}
                    label={strings('rewards.unlinked_accounts_info.confirm')}
                    onPress={() => {
                      handleHideUnlinkedAccountsBanner();
                      navigation.navigate(Routes.REWARDS_SETTINGS_VIEW);
                    }}
                  />
                </Box>
              </BannerAlert>
            )}

          <SeasonStatus />

          {/* Tab View */}
          <TabsList
            key={`tabs-${remountTrigger}`}
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
      </SafeAreaView>
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
