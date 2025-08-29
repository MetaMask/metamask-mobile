import React, { useEffect, useCallback } from 'react';
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
import { useDispatch } from 'react-redux';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import SegmentedControl from '../../../../component-library/components-temp/SegmentedControl';
import { ButtonSize } from '../../../../component-library/components/Buttons/Button/Button.types';
import { setActiveTab } from '../../../../actions/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { Alert } from 'react-native';
import { useRewardsStore } from '../hooks';
import { RewardsTab } from '../../../../reducers/rewards/types';

const RewardsDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { activeTab, subscriptionId } = useRewardsStore();

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

  const tabOptions = [
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
  ];

  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as RewardsTab;
      dispatch(setActiveTab(newTab));
    },
    [dispatch],
  );

  // Initialize active tab in UI store
  useEffect(() => {
    dispatch(setActiveTab('overview'));
  }, [dispatch]);

  const renderTabContent = () => {
    switch (activeTab) {
      default:
        return (
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.not_implemented')}
          </Text>
        );
    }
  };

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 px-4 py-4 bg-default gap-8 relative">
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

          {/* TODO: Add general season summary in follow-up PR */}
          <Box
            twClassName="flex items-center justify-center border-dashed border-default border-2 rounded-md h-[115px]"
            testID={REWARDS_VIEW_SELECTORS.SEASON_SUMMARY_PLACEHOLDER}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {strings('rewards.not_implemented_season_summary')}
            </Text>
          </Box>

          {/* Segmented Control */}
          <SegmentedControl
            options={tabOptions}
            selectedValue={activeTab || 'overview'}
            onValueChange={handleTabChange}
            size={ButtonSize.Md}
            isButtonWidthFlexible={false}
            style={tw.style('px-4')}
            isDisabled={!subscriptionId}
            testID={REWARDS_VIEW_SELECTORS.SEGMENTED_CONTROL}
          />

          {/* Tab Content */}
          <Box
            twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md"
            testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {renderTabContent()}
            </Text>
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
