import React from 'react';

import BackupAndSyncFeaturesToggles, {
  backupAndSyncFeaturesTogglesSections,
} from './BackupAndSyncFeaturesToggles';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import mockUseMetrics from '../../../../components/hooks/useMetrics/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../../components/hooks/useMetrics/useMetrics');

const { trackEvent } = mockUseMetrics();
const mockTrackEvent = jest.mocked(trackEvent);

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: false,
        isContactSyncingEnabled: false,
      },
      AuthenticationController: {
        isSignedIn: true,
      },
      KeyringController: {
        keyrings: [],
      },
    },
  },
  settings: {
    basicFunctionalityEnabled: true,
  },
};

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockSetIsBackupAndSyncFeatureEnabled = jest.fn();
jest.mock('../../../../util/identity/hooks/useBackupAndSync', () => ({
  useBackupAndSync: () => ({
    setIsBackupAndSyncFeatureEnabled: mockSetIsBackupAndSyncFeatureEnabled,
    error: null,
  }),
}));

describe('BackupAndSyncToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<BackupAndSyncFeaturesToggles />, {
      state: MOCK_STORE_STATE,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks toggle event when toggling the switch', async () => {
    const featureSection = backupAndSyncFeaturesTogglesSections[0];
    const { getByTestId } = renderWithProvider(
      <BackupAndSyncFeaturesToggles />,
      {
        state: MOCK_STORE_STATE,
      },
    );
    const switchElement = getByTestId(featureSection.testID);

    act(() => {
      fireEvent(switchElement, 'onValueChange', true);
    });

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.SETTINGS_UPDATED,
    )
      .addProperties({
        settings_group: 'backup_and_sync',
        settings_type: featureSection.id,
        old_value: false,
        new_value: true,
      })
      .build();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
    });
  });

  it('enables a feature when toggling the switch on', async () => {
    const featureSection = backupAndSyncFeaturesTogglesSections[0];

    const { getByTestId } = renderWithProvider(
      <BackupAndSyncFeaturesToggles />,
      {
        state: MOCK_STORE_STATE,
      },
    );

    const switchElement = getByTestId(featureSection.testID);

    act(() => {
      fireEvent(switchElement, 'onValueChange', true);
    });

    await waitFor(() => {
      expect(mockSetIsBackupAndSyncFeatureEnabled).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES[featureSection.backupAndSyncfeatureKey],
        true,
      );
    });
  });
});
