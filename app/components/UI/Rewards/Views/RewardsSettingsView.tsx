import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { Box } from '@metamask/design-system-react-native';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import RewardSettingsAccountGroupList from '../components/Settings/RewardSettingsAccountGroupList';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';

const RewardsSettingsHeaderTitle = () => (
  <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
    {strings('rewards.settings.title')}
  </Text>
);

const RewardsSettingsView: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedSettingsViewed = useRef(false);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.settings.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
      headerTitle: RewardsSettingsHeaderTitle,
    });
  }, [colors, navigation]);

  useEffect(() => {
    if (!hasTrackedSettingsViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_SETTINGS_VIEWED).build(),
      );
      hasTrackedSettingsViewed.current = true;
    }
  }, [trackEvent, createEventBuilder]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsSettingsView">
      <Box twClassName="py-4 flex-1 gap-4">
        <RewardSettingsAccountGroupList />
      </Box>
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
