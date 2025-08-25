import React, { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
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
import SegmentedControl from '../../../../component-library/components-temp/SegmentedControl';
import { ButtonSize } from '../../../../component-library/components/Buttons/Button/Button.types';
import { useRewardsSyncWithEngine } from '../hooks/useRewardsSyncWithEngine';
import { setActiveTab } from '../../../../actions/rewards';
import { selectActiveTab } from '../../../../reducers/rewards/selectors';
import Routes from '../../../../constants/navigation/Routes';

type TabValue = 'overview' | 'activity' | 'levels';

const RewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const selectedTab = useSelector(selectActiveTab);

  // Sync rewards controller state with UI store
  useRewardsSyncWithEngine();

  // Set navigation title
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.rewards_title') || 'Rewards',
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);

  const tabOptions = [
    {
      value: 'overview' as const,
      label: strings('rewards.overview_tab_title'),
    },
    {
      value: 'activity' as const,
      label: strings('rewards.activity_tab_title'),
    },
    {
      value: 'levels' as const,
      label: strings('rewards.levels_tab_title'),
    },
  ];

  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as TabValue;
      dispatch(setActiveTab(newTab));
    },
    [dispatch],
  );

  // Initialize active tab in UI store
  useEffect(() => {
    dispatch(setActiveTab('overview'));
  }, [dispatch]);

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <Text variant={TextVariant.BodyMd} twClassName="text-muted">
            Overview coming soon.
          </Text>
        );
    }
  };

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 bg-default">
          {/* Header row */}
          <Box twClassName="flex-row px-4 py-4 justify-between">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.title')}
            </Text>

            <ButtonIcon
              iconName={IconName.Gift}
              size={ButtonIconSize.Md}
              onPress={() => {
                navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
              }}
            />
          </Box>

          {/* TODO: Add general season summary in follow-up PR */}

          {/* Segmented Control */}
          <Box twClassName="px-4 pb-4">
            <SegmentedControl
              options={tabOptions}
              selectedValue={selectedTab || 'referral'}
              onValueChange={handleTabChange}
              size={ButtonSize.Md}
              isButtonWidthFlexible={false}
            />
          </Box>

          {/* Tab Content */}
          <Box twClassName="flex-1 px-4">{renderTabContent()}</Box>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsView;
