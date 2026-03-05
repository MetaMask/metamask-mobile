import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import RewardSettingsAccountGroupList from '../components/Settings/RewardSettingsAccountGroupList';

export const REWARDS_SETTINGS_SAFE_AREA_TEST_ID = 'rewards-settings-safe-area';

const RewardsSettingsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedSettingsViewed = useRef(false);

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
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_SETTINGS_SAFE_AREA_TEST_ID}
      >
        <HeaderCompactStandard
          title={strings('rewards.settings.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <Box twClassName="py-4 flex-1 gap-4">
          <RewardSettingsAccountGroupList />
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
