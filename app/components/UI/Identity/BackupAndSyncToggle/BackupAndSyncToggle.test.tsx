import React from 'react';

import BackupAndSyncToggle from './BackupAndSyncToggle';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: true,
      },
      AuthenticationController: {
        isSignedIn: true,
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

const mockTrackEvent = jest.fn();

describe('BackupAndSyncToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEvent}
      />,
      {
        state: MOCK_STORE_STATE,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('disables backup and sync when basic functionality is disabled', async () => {
    const { store } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEvent}
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
        trackBackupAndSyncToggleEventOverride={mockTrackEvent}
      />,
      {
        state: {
          ...MOCK_STORE_STATE,
          engine: {
            backgroundState: {
              ...MOCK_STORE_STATE.engine.backgroundState,
              UserStorageController: {
                isProfileSyncingEnabled: false,
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
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('opens a modal when trying to enable backup and sync while basic functionality is off', () => {
    const { getByRole } = renderWithProvider(
      <BackupAndSyncToggle
        trackBackupAndSyncToggleEventOverride={mockTrackEvent}
      />,
      {
        state: {
          ...MOCK_STORE_STATE,
          engine: {
            backgroundState: {
              ...MOCK_STORE_STATE.engine.backgroundState,
              UserStorageController: {
                isProfileSyncingEnabled: false,
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
