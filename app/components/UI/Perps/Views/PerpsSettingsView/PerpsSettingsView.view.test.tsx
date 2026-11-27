/**
 * Component view tests for PerpsSettingsView.
 * State-driven via Redux; no hook mocks. The flag-off leave delay is covered
 * in the unit test with fake timers.
 */
import '../../../../../../tests/component-view/mocks';

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, screen } from '@testing-library/react-native';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { analytics } from '../../../../../util/analytics/analytics';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import PerpsSettingsView, {
  PERPS_SETTINGS_SCREEN_TYPE,
  PERPS_SETTINGS_TEST_IDS,
} from './PerpsSettingsView';

const JOURNEY_START = 'PerpsSettingsJourneyStart';
const JOURNEY_START_ID = 'perps-settings-journey-start';

let hasOpenedSettings = false;

const JourneyStart = (): React.JSX.Element => {
  const navigation = useNavigation<AppNavigationProp>();
  useEffect(() => {
    if (hasOpenedSettings) {
      return;
    }
    hasOpenedSettings = true;
    navigation.navigate(Routes.PERPS.SETTINGS);
  }, [navigation]);
  return <Text testID={JOURNEY_START_ID} />;
};

const lighterFlags = (enabled: boolean): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsLighterProviderEnabled: {
            enabled,
            minimumVersion: '0.0.0',
          },
          perpsFeedbackEnabled: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
        },
      },
    },
  },
});

const renderSettingsJourney = (
  enabled: boolean,
): ReturnType<typeof renderPerpsView> => {
  hasOpenedSettings = false;
  return renderPerpsView(JourneyStart, JOURNEY_START, {
    overrides: lighterFlags(enabled),
    extraRoutes: [
      {
        name: Routes.PERPS.SETTINGS,
        Component: PerpsSettingsView,
      },
      { name: Routes.PERPS.TUTORIAL },
    ],
  });
};

describe('PerpsSettingsView', () => {
  const previousLighterFlag = process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'true';
    trackEventSpy = jest
      .spyOn(analytics, 'trackEvent')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
    if (previousLighterFlag === undefined) {
      delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
    } else {
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = previousLighterFlag;
    }
  });

  it('records a settings screen view and opens the perps tutorial', async () => {
    renderSettingsJourney(true);

    expect(
      await screen.findByText(strings('perps.settings.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PERPS_SETTINGS_TEST_IDS.SUPPORT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PERPS_SETTINGS_TEST_IDS.FEEDBACK),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PERPS_SETTINGS_TEST_IDS.LEARN_MORE));

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.TUTORIAL}`),
    ).toBeOnTheScreen();
    expect(trackEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Perp Screen Viewed',
        properties: expect.objectContaining({
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_SETTINGS_SCREEN_TYPE,
        }),
      }),
    );
  });

  it('goes back to the screen that opened settings', async () => {
    renderSettingsJourney(true);

    fireEvent.press(await screen.findByTestId(PERPS_SETTINGS_TEST_IDS.BACK));

    expect(await screen.findByTestId(JOURNEY_START_ID)).toBeOnTheScreen();
  });
});
