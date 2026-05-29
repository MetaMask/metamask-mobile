import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderBackupAndSyncSettings } from '../../../../../tests/component-view/renderers/identity';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS } from '../../../UI/Identity/BackupAndSyncFeaturesToggles/BackupAndSyncFeaturesToggles.testIds';

interface ImmediateInteractionManager {
  runAfterInteractions: (callback: () => void) => { cancel: () => void };
}

const immediateInteractionManager =
  InteractionManager as unknown as ImmediateInteractionManager;

describeForPlatforms('BackupAndSyncSettings identity sync toggles', () => {
  let runAfterInteractionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    runAfterInteractionsSpy = jest
      .spyOn(immediateInteractionManager, 'runAfterInteractions')
      .mockImplementation((callback: () => void) => {
        callback();
        return { cancel: jest.fn() };
      });
  });

  afterEach(() => {
    runAfterInteractionsSpy.mockRestore();
  });

  it('disables account sync through user storage', async () => {
    const setFeatureSpy = jest.spyOn(
      Engine.context.UserStorageController,
      'setIsBackupAndSyncFeatureEnabled',
    );
    const { getByTestId } = renderBackupAndSyncSettings({
      stateOptions: {
        isAccountSyncingEnabled: true,
      },
    });

    fireEvent(
      getByTestId(
        BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS.TOGGLE_ACCOUNT_SYNCING,
      ),
      'onValueChange',
      false,
    );

    await waitFor(() => {
      expect(setFeatureSpy).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.accountSyncing,
        false,
      );
    });

    setFeatureSpy.mockRestore();
  });

  it('disables contact sync through user storage', async () => {
    const setFeatureSpy = jest.spyOn(
      Engine.context.UserStorageController,
      'setIsBackupAndSyncFeatureEnabled',
    );
    const { getByTestId } = renderBackupAndSyncSettings({
      stateOptions: {
        isContactSyncingEnabled: true,
      },
    });

    fireEvent(
      getByTestId(
        BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS.TOGGLE_CONTACT_SYNCING,
      ),
      'onValueChange',
      false,
    );

    await waitFor(() => {
      expect(setFeatureSpy).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.contactSyncing,
        false,
      );
    });

    setFeatureSpy.mockRestore();
  });
});
