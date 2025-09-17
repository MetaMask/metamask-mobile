import React from 'react';

import BackupAndSyncToggle from './BackupAndSyncToggle';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../../components/hooks/useMetrics');

// Mock the remote feature flag module
jest.mock('../../../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: jest.fn(() => false),
}));

// Mock Engine for MultichainAccountService calls
jest.mock('../../../../core/Engine', () => ({
  default: {
    context: {
      MultichainAccountService: {
        setBasicFunctionality: jest.fn().mockResolvedValue(undefined),
      },
      RemoteFeatureFlagController: {
        state: {
          remoteFeatureFlags: {
            'multichain-accounts-state-2': false,
          },
        },
      },
    },
  },
}));

// Mock SwitchLoadingModal to prevent test pollution from loading/error states
jest.mock('../../Notification/SwitchLoadingModal', () => () => null);

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isBackupAndSyncEnabled: true,
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

const mockTrackEvent = jest.fn();
(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockSetIsBackupAndSyncFeatureEnabled = jest.fn();
jest.mock('../../../../util/identity/hooks/useBackupAndSync', () => ({
  useBackupAndSync: () => ({
    setIsBackupAndSyncFeatureEnabled: mockSetIsBackupAndSyncFeatureEnabled,
    error: null,
  }),
}));

const mockTrackEventOverride = jest.fn();

describe('BackupAndSyncToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEventOverride}
      />,
      {
        state: MOCK_STORE_STATE,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks the event when the toggle is changed', async () => {
    const { getByRole } = renderWithProvider(<BackupAndSyncToggle />, {
      state: MOCK_STORE_STATE,
    });

    const switchElement = getByRole('switch');

    act(() => {
      fireEvent(switchElement, 'onValueChange', true);
    });

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.SETTINGS_UPDATED,
    )
      .addProperties({
        settings_group: 'backup_and_sync',
        settings_type: 'main',
        old_value: true,
        new_value: false,
        was_notifications_on: false,
      })
      .build();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
    });
  });

  it('disables backup and sync when basic functionality is disabled', async () => {
    const { store } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEventOverride}
      />,
      {
        state: MOCK_STORE_STATE,
      },
    );

    act(() => {
      store.dispatch(toggleBasicFunctionality(false));
    });

    await waitFor(() => {
      expect(mockSetIsBackupAndSyncFeatureEnabled).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.main,
        false,
      );
    });
  });

  it('enables backup and sync when toggling the switch on', async () => {
    const { getByRole } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEventOverride}
      />,
      {
        state: {
          ...MOCK_STORE_STATE,
          engine: {
            backgroundState: {
              ...MOCK_STORE_STATE.engine.backgroundState,
              UserStorageController: {
                isBackupAndSyncEnabled: false,
              },
            },
          },
        },
      },
    );

    const switchElement = getByRole('switch');

    act(() => {
      fireEvent(switchElement, 'onValueChange', true);
    });

    await waitFor(() => {
      expect(mockSetIsBackupAndSyncFeatureEnabled).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.main,
        true,
      );
      expect(mockTrackEventOverride).toHaveBeenCalled();
    });
  });

  it('opens a modal when trying to enable backup and sync while basic functionality is off', () => {
    const { getByRole } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEventOverride}
      />,
      {
        state: {
          ...MOCK_STORE_STATE,
          engine: {
            backgroundState: {
              ...MOCK_STORE_STATE.engine.backgroundState,
              UserStorageController: {
                isBackupAndSyncEnabled: false,
              },
            },
          },
          settings: {
            ...MOCK_STORE_STATE.settings,
            basicFunctionalityEnabled: false,
          },
        },
      },
    );

    const switchElement = getByRole('switch');

    fireEvent(switchElement, 'onValueChange', true);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC,
      params: {
        enableBackupAndSync: expect.any(Function),
        trackEnableBackupAndSyncEvent: expect.any(Function),
      },
    });
  });
});
