import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import TabBar from '../../../../component-library/components-temp/TabBar';
import { setActiveTab } from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { Alert } from 'react-native';
import { RewardsTab } from '../../../../reducers/rewards/types';

import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useSeasonStatus } from '../hooks/useSeasonStatus';

import RewardsOverview from '../components/Tabs/RewardsOverview';
import RewardsLevels from '../components/Tabs/RewardsLevels';
import RewardsActivity from '../components/Tabs/RewardsActivity';

// Tab wrapper components for TabsList

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();

  // Track current tab index for visibility optimization
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  // Sync rewards controller state with UI store
  useSeasonStatus();

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

  const renderTabBar = useCallback(
    (tabBarProps: Record<string, unknown>) => (
      <TabBar
        style={tw.style('relative w-60')}
        tabStyle={tw.style('border-none pb-0')}
        underlineStyle={[
          tw.style('w-20 bg-white '),
          { marginLeft: `-${currentTabIndex * 16}%` },
        ]}
        {...tabBarProps}
      />
    ),
    [tw, currentTabIndex],
  );

  const overviewTabProps = useMemo(
    () => ({
      key: 'overview-tab',
      tabLabel: strings('rewards.tab_overview_title'),
      navigation,
    }),
    [navigation],
  );

  const levelsTabProps = useMemo(
    () => ({
      key: 'levels-tab',
      tabLabel: strings('rewards.tab_levels_title'),
      navigation,
    }),
    [navigation],
  );

  const activityTabProps = useMemo(
    () => ({
      key: 'activity-tab',
      tabLabel: strings('rewards.tab_activity_title'),
      navigation,
    }),
    [navigation],
  );

  const handleTabChange = useCallback(
    (changeTabProperties: ChangeTabProperties) => {
      setCurrentTabIndex(changeTabProperties.i);
      const tabMap: Record<number, RewardsTab> = {
        0: 'overview',
        1: 'levels',
        2: 'activity',
      };
      const newTab = tabMap[changeTabProperties.i];
      if (newTab) {
        dispatch(setActiveTab(newTab));
      }
    },
    [dispatch],
  );

  // Calculate tab visibility for performance optimization
  const isOverviewVisible = currentTabIndex === 0;
  const isLevelsVisible = currentTabIndex === 1;
  const isActivityVisible = currentTabIndex === 2;

  // Store visibility update callbacks from tab components
  const overviewVisibilityCallback = useRef<
    ((visible: boolean) => void) | null
  >(null);
  const levelsVisibilityCallback = useRef<((visible: boolean) => void) | null>(
    null,
  );
  const activityVisibilityCallback = useRef<
    ((visible: boolean) => void) | null
  >(null);

  // Update tab visibility when tab changes
  useEffect(() => {
    if (overviewVisibilityCallback.current) {
      overviewVisibilityCallback.current(isOverviewVisible);
    }
    if (levelsVisibilityCallback.current) {
      levelsVisibilityCallback.current(isLevelsVisible);
    }
    if (activityVisibilityCallback.current) {
      activityVisibilityCallback.current(isActivityVisible);
    }
  }, [currentTabIndex, isOverviewVisible, isLevelsVisible, isActivityVisible]);

  // Initialize active tab in UI store
  useEffect(() => {
    dispatch(setActiveTab('overview'));
  }, [dispatch]);

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
                iconName={IconName.UserCircleAdd}
                size={ButtonIconSize.Lg}
                disabled={!subscriptionId}
                testID={REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON}
                onPress={() => {
                  navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
                }}
              />

              <ButtonIcon
                iconName={IconName.Setting}
                size={ButtonIconSize.Lg}
                disabled={!subscriptionId}
                testID={REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON}
                onPress={() => {
                  Alert.alert(strings('rewards.not_implemented'));
                }}
              />
            </Box>
          </Box>

          <SeasonStatus />

          {/* Tab View */}
          <Box twClassName="flex-1" testID={REWARDS_VIEW_SELECTORS.TAB_CONTROL}>
            <ScrollableTabView
              renderTabBar={renderTabBar}
              onChangeTab={handleTabChange}
              locked={!subscriptionId}
            >
              <RewardsOverview
                {...overviewTabProps}
                key={overviewTabProps.key}
                isVisible={isOverviewVisible}
                onVisibilityChange={(callback: (visible: boolean) => void) => {
                  overviewVisibilityCallback.current = callback;
                }}
              />
              <RewardsLevels
                {...levelsTabProps}
                key={levelsTabProps.key}
                isVisible={isLevelsVisible}
                onVisibilityChange={(callback: (visible: boolean) => void) => {
                  levelsVisibilityCallback.current = callback;
                }}
              />
              <RewardsActivity
                {...activityTabProps}
                key={activityTabProps.key}
                isVisible={isActivityVisible}
                onVisibilityChange={(callback: (visible: boolean) => void) => {
                  activityVisibilityCallback.current = callback;
                }}
              />
            </ScrollableTabView>
          </Box>
        </Box>

        {!subscriptionId && (
          <Box
            twClassName="absolute bg-default w-full h-full top-[100px] opacity-70 flex items-center justify-center"
            testID={REWARDS_VIEW_SELECTORS.NOT_OPTED_IN_OVERLAY}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-default bold">
              {strings('rewards.not_opted_in_to_rewards')}
            </Text>
          </Box>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsDashboard;
