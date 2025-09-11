import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import { ActivityIndicator, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import {
  setActiveTab,
  setHideUnlinkedAccountsBanner,
} from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { RewardsTab } from '../../../../reducers/rewards/types';
import { selectActiveTab } from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
  selectHideUnlinkedAccountsBanner,
} from '../../../../selectors/rewards';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { OverviewTab } from '../components/Overview/OverviewTab';
import { ActivityTab } from '../components/ActivityTab/ActivityTab';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useLinkAccount } from '../hooks/useLinkAccount';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../component-library/components/Banners/Banner';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import AccountDisplayItem from '../components/AccountDisplayItem/AccountDisplayItem';

// Tab wrapper components for TabsList
interface TabWrapperProps {
  tabLabel: string;
  isDisabled?: boolean;
}

const LevelsTab: React.FC<TabWrapperProps> = () => (
  <Box
    twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md my-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT}
  >
    <Text variant={TextVariant.BodyMd}>
      {strings('rewards.not_implemented')}
    </Text>
  </Box>
);

const ActivityTabWrapper: React.FC<TabWrapperProps> = () => <ActivityTab />;

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const activeTab = useSelector(selectActiveTab);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();
  const hasAccountedOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const hideUnlinkedAccountsBanner = useSelector(
    selectHideUnlinkedAccountsBanner,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // Track linking operation state
  const [isLinking, setIsLinking] = useState(false);

  // Use the link account hook
  const { linkAccount } = useLinkAccount();

  // Use the opt-in summary hook to check for unlinked accounts
  const { unlinkedAccounts } = useRewardOptinSummary({
    enabled: !hideUnlinkedAccountsBanner,
  });

  // Sync rewards controller state with UI store
  useSeasonStatus({
    subscriptionId: subscriptionId || '',
    seasonId: CURRENT_SEASON_ID,
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

  const getActiveIndex = () =>
    tabOptions.findIndex((tab) => tab.value === activeTab);

  const handleTabChange = useCallback(
    ({ i }: { i: number }) => {
      const newTab = tabOptions[i]?.value as RewardsTab;
      if (newTab) {
        dispatch(setActiveTab(newTab));
      }
    },
    [dispatch, tabOptions],
  );

  const handleHideUnlinkedAccountsBanner = useCallback(() => {
    dispatch(setHideUnlinkedAccountsBanner(true));
  }, [dispatch]);

  const handleLinkCurrentAccount = useCallback(async () => {
    if (!selectedAccount || isLinking) return;

    setIsLinking(true);
    try {
      await linkAccount(selectedAccount);
    } finally {
      setIsLinking(false);
    }
  }, [selectedAccount, linkAccount, isLinking]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 px-4 bg-default gap-8 relative">
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

          <SeasonStatus />

          {/* Current Account Not Opted In Banner */}
          {hasAccountedOptedIn === false && selectedAccount && (
            <Box twClassName="-mx-4">
              <Banner
                variant={BannerVariant.Alert}
                severity={BannerAlertSeverity.Info}
                startAccessory={null}
                title={
                  <Box twClassName="mb-3">
                    <AccountDisplayItem account={selectedAccount} />
                    {strings('rewards.unlinked_account_info.title')}
                  </Box>
                }
                description={
                  <Box twClassName="flex-row items-center gap-2 flex-wrap">
                    <Text variant={TextVariant.BodyMd}>
                      {strings('rewards.unlinked_account_info.description')}
                    </Text>
                    <Pressable
                      onPress={handleLinkCurrentAccount}
                      disabled={isLinking}
                      style={({ pressed }: { pressed: boolean }) =>
                        tw.style('flex-row', pressed && 'opacity-70')
                      }
                    >
                      {isLinking && (
                        <Box twClassName="mr-2">
                          <ActivityIndicator
                            size="small"
                            color={tw.color('primary-default')}
                            style={tw.style('mr-2')}
                          />
                        </Box>
                      )}

                      <Text
                        variant={TextVariant.BodyMd}
                        twClassName="text-primary-default underline"
                      >
                        {isLinking
                          ? strings('rewards.linking_account')
                          : strings('rewards.link_account')}
                      </Text>
                    </Pressable>
                  </Box>
                }
              ></Banner>
            </Box>
          )}

          {/* Unlinked Accounts Banner */}
          {subscriptionId &&
            hasAccountedOptedIn === true &&
            unlinkedAccounts.length > 0 &&
            !hideUnlinkedAccountsBanner && (
              <Box twClassName="-mx-4">
                <Banner
                  variant={BannerVariant.Alert}
                  severity={BannerAlertSeverity.Info}
                  startAccessory={null}
                  title={strings('rewards.unlinked_accounts_info.title')}
                  description={
                    <Box twClassName="flex-row items-center gap-2 flex-wrap">
                      <Text variant={TextVariant.BodyMd}>
                        {strings('rewards.unlinked_accounts_info.description')}
                      </Text>
                      <Pressable
                        onPress={() => {
                          navigation.navigate(Routes.REWARDS_SETTINGS_VIEW, {
                            focusUnlinkedTab: true,
                          });
                        }}
                        style={({ pressed }: { pressed: boolean }) =>
                          tw.style(pressed && 'opacity-70')
                        }
                      >
                        <Text
                          variant={TextVariant.BodyMd}
                          twClassName="text-primary-default underline"
                        >
                          {strings(
                            'rewards.unlinked_accounts_info.go_to_settings',
                          )}
                        </Text>
                      </Pressable>
                    </Box>
                  }
                  closeButtonProps={{
                    iconName: IconName.Close,
                    onPress: handleHideUnlinkedAccountsBanner,
                  }}
                />
              </Box>
            )}

          <TabsList
            initialActiveIndex={getActiveIndex()}
            onChangeTab={handleTabChange}
            testID={REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL}
          >
            <OverviewTab
              key="overview"
              tabLabel={strings('rewards.tab_overview_title')}
            />
            <OverviewTab key="overview" />
            <LevelsTab
              key="levels"
              tabLabel={strings('rewards.tab_levels_title')}
            />
            <ActivityTabWrapper
              key="activity"
              tabLabel={strings('rewards.tab_activity_title')}
            />
          </TabsList>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
