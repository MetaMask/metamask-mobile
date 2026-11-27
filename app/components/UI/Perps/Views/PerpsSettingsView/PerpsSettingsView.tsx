import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsMoreSection from '../../components/PerpsMoreSection';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMoreItems } from '../../hooks/usePerpsMoreItems';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';

/**
 * TODO(TAT-4397): replace with the published settings screen type.
 * Kept local until the perps event catalog includes it.
 */
export const PERPS_SETTINGS_SCREEN_TYPE = 'perps_settings';

export const PERPS_SETTINGS_TEST_IDS = {
  SCREEN: 'perps-settings-screen',
  BACK: 'perps-settings-back',
  SUPPORT: 'perps-settings-support',
  FEEDBACK: 'perps-settings-feedback',
  LEARN_MORE: 'perps-settings-learn-more',
} as const;

/**
 * How long the route stays current when Lighter is off, so a navigation
 * observer can see the open before the screen leaves. Nothing renders in
 * that window. Nothing in the app opens this route until TAT-4516.
 */
export const FLAG_OFF_LEAVE_DELAY_MS = 1500;

/**
 * Perps settings shell: a back header and the shared More links.
 * The Preferences section (TAT-4388) inserts above More.
 * When the Lighter multi-provider flag is off the screen renders nothing
 * and leaves after a short beat so the route can be observed.
 */
const PerpsSettingsView = (): React.JSX.Element | null => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { isMultiProviderEnabled } = usePerpsProvider();
  const moreItems = usePerpsMoreItems({
    buttonLocation: PERPS_SETTINGS_SCREEN_TYPE,
    testIDs: {
      support: PERPS_SETTINGS_TEST_IDS.SUPPORT,
      feedback: PERPS_SETTINGS_TEST_IDS.FEEDBACK,
      learnMore: PERPS_SETTINGS_TEST_IDS.LEARN_MORE,
    },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [isMultiProviderEnabled],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_SETTINGS_SCREEN_TYPE,
    },
  });

  useEffect(() => {
    if (isMultiProviderEnabled) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      navigation.goBack();
    }, FLAG_OFF_LEAVE_DELAY_MS);
    return (): void => {
      clearTimeout(timeoutId);
    };
  }, [isMultiProviderEnabled, navigation]);

  if (!isMultiProviderEnabled) {
    return null;
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={PERPS_SETTINGS_TEST_IDS.SCREEN}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title={strings('perps.settings.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: PERPS_SETTINGS_TEST_IDS.BACK,
            accessibilityLabel: strings('navigation.back'),
          }}
        />
        {/* Preferences (default exchange) from TAT-4388 go here, above More. */}
        <PerpsMoreSection items={moreItems} />
      </Box>
    </SafeAreaView>
  );
};

export default PerpsSettingsView;
