import React, { useEffect, useCallback, useMemo } from 'react';
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
import { TabsList } from '../../../../component-library/components-temp/Tabs';
import { setActiveTab } from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { Alert } from 'react-native';
import { RewardsTab } from '../../../../reducers/rewards/types';
import { selectActiveTab } from '../../../../reducers/rewards/selectors';
import SeasonStatus from '../components/SeasonStatus/SeasonStatus';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { ActivityTab } from '../components/ActivityTab/ActivityTab';

// Tab wrapper components for TabsList
interface TabWrapperProps {
  tabLabel: string;
  isDisabled?: boolean;
}

const OverviewTab: React.FC<TabWrapperProps> = () => (
  <Box
    twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md my-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT}
  >
    <Text variant={TextVariant.BodyMd}>
      {strings('rewards.not_implemented')}
    </Text>
  </Box>
);

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

  // Sync rewards controller state with UI store
  useSeasonStatus({
    subscriptionId: subscriptionId || '',
    seasonId: 'current',
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

          <TabsList
            initialActiveIndex={getActiveIndex()}
            onChangeTab={handleTabChange}
            testID={REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL}
          >
            <OverviewTab
              key="overview"
              tabLabel={strings('rewards.tab_overview_title')}
              isDisabled={!subscriptionId}
            />
            <LevelsTab
              key="levels"
              tabLabel={strings('rewards.tab_levels_title')}
              isDisabled={!subscriptionId}
            />
            <ActivityTabWrapper
              key="activity"
              tabLabel={strings('rewards.tab_activity_title')}
              isDisabled={!subscriptionId}
            />
          </TabsList>
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
