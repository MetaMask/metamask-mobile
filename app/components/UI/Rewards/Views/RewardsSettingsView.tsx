import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import RewardSettingsTabs from '../components/Settings/RewardSettingsTabs';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

const RewardsSettingsView: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const toastRef = useRef<ToastRef>(null);
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
      <Box twClassName="px-4 py-4 flex-1 gap-4">
        {/* Section 1: Connect Multiple Accounts */}
        <Box twClassName="gap-4">
          <Box twClassName="gap-2">
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.settings.subtitle')}
            </Text>

            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('rewards.settings.description')}
            </Text>
          </Box>
        </Box>

        {/* Section 2: Account Tabs */}
        <Box twClassName="flex-1">
          <RewardSettingsTabs initialTabIndex={0} />
        </Box>
      </Box>

      {/* Toast for success feedback */}
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
