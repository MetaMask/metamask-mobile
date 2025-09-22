import React from 'react';

import TurnOnBackupAndSync, {
  turnOnBackupAndSyncTestIds,
} from './TurnOnBackupAndSync';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { useMetrics } from '../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import mockedDefaultUseMetrics from '../../../hooks/useMetrics/__mocks__/useMetrics';

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useMetrics');

const mockUseMetrics = jest.mocked(useMetrics);
mockUseMetrics.mockReturnValue({
  ...mockedDefaultUseMetrics(),
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
});

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isBackupAndSyncEnabled: true,
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
      goBack: jest.fn(),
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

describe('TurnOnBackupAndSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<TurnOnBackupAndSync />, {
      state: MOCK_STORE_STATE,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('sends a MetaMetrics event when the modal is dismissed', () => {
    const { getByTestId } = renderWithProvider(<TurnOnBackupAndSync />, {
      state: MOCK_STORE_STATE,
    });

    const cancelButton = getByTestId(turnOnBackupAndSyncTestIds.cancelButton);
    fireEvent.press(cancelButton);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Profile Activity Updated',
        properties: expect.objectContaining({
          feature_name: 'Backup And Sync Carousel Modal',
          action: 'Modal Dismissed',
        }),
      }),
    );
  });

  it('enables backup and sync when clicking on the cta if backup and sync is disabled, and navigates to backup and sync settings either way', async () => {
    const { getByTestId } = renderWithProvider(<TurnOnBackupAndSync />, {
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
    });

    const switchElement = getByTestId(turnOnBackupAndSyncTestIds.enableButton);
    fireEvent.press(switchElement);

    await waitFor(() => {
      expect(mockSetIsBackupAndSyncFeatureEnabled).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.main,
        true,
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.BACKUP_AND_SYNC,
      });
    });
  });

  it('opens a modal when clicking on the cta while basic functionality is off', () => {
    const { getByTestId } = renderWithProvider(<TurnOnBackupAndSync />, {
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
    });

    const switchElement = getByTestId(turnOnBackupAndSyncTestIds.enableButton);
    fireEvent.press(switchElement);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC,
      params: {
        enableBackupAndSync: expect.any(Function),
        trackEnableBackupAndSyncEvent: expect.any(Function),
      },
    });
  });

  it('sends a MetaMetrics event when enabling backup and sync', async () => {
    const { getByTestId } = renderWithProvider(<TurnOnBackupAndSync />, {
      state: MOCK_STORE_STATE,
    });

    const switchElement = getByTestId(turnOnBackupAndSyncTestIds.enableButton);
    fireEvent.press(switchElement);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Profile Activity Updated',
          properties: expect.objectContaining({
            feature_name: 'Backup And Sync Carousel Modal',
            action: 'Turned On',
          }),
        }),
      );
    });
  });
});
