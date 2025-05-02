import React from 'react';

import BackupAndSyncFeaturesToggles, {
  backupAndSyncFeaturesTogglesSections,
} from './BackupAndSyncFeaturesToggles';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: true,
        isAccountSyncingEnabled: false,
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
