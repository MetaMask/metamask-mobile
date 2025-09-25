import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import {
  performSignIn,
  performSignOut,
  setIsBackupAndSyncFeatureEnabled,
  syncInternalAccountsWithUserStorage,
  syncContactsWithUserStorage,
  setHasAccountSyncingSyncedAtLeastOnce,
  setIsAccountSyncingReadyToBeDispatched,
  lockAccountSyncing,
  unlockAccountSyncing,
} from '.';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      performSignOut: jest.fn(),
    },
    UserStorageController: {
      setIsBackupAndSyncFeatureEnabled: jest.fn(),
      syncInternalAccountsWithUserStorage: jest.fn(),
      syncContactsWithUserStorage: jest.fn(),
      setHasAccountSyncingSyncedAtLeastOnce: jest.fn(),
      setIsAccountSyncingReadyToBeDispatched: jest.fn(),
    },
  },
}));

describe('Identity actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in successfully', async () => {
    (
      Engine.context.AuthenticationController.performSignIn as jest.Mock
    ).mockResolvedValue('valid-access-token');

    await performSignIn();

    expect(
      Engine.context.AuthenticationController.performSignIn,
    ).toHaveBeenCalled();
  });

  it('signs out successfully', () => {
    (
      Engine.context.AuthenticationController.performSignOut as jest.Mock
    ).mockResolvedValue(undefined);

    const result = performSignOut();

    expect(
      Engine.context.AuthenticationController.performSignOut,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('enables backup and sync features successfuly', async () => {
    (
      Engine.context.UserStorageController
        .setIsBackupAndSyncFeatureEnabled as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await setIsBackupAndSyncFeatureEnabled(
      BACKUPANDSYNC_FEATURES.main,
      true,
    );

    expect(
      Engine.context.UserStorageController.setIsBackupAndSyncFeatureEnabled,
    ).toHaveBeenCalledWith(BACKUPANDSYNC_FEATURES.main, true);
    expect(result).toBeUndefined();
  });

  it('disables backup and sync features successfuly', async () => {
    (
      Engine.context.UserStorageController
        .setIsBackupAndSyncFeatureEnabled as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await setIsBackupAndSyncFeatureEnabled(
      BACKUPANDSYNC_FEATURES.main,
      false,
    );

    expect(
      Engine.context.UserStorageController.setIsBackupAndSyncFeatureEnabled,
    ).toHaveBeenCalledWith(BACKUPANDSYNC_FEATURES.main, false);
    expect(result).toBeUndefined();
  });

  it('syncs internal accounts with user storage', async () => {
    (
      Engine.context.UserStorageController
        .syncInternalAccountsWithUserStorage as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await syncInternalAccountsWithUserStorage();

    expect(
      Engine.context.UserStorageController.syncInternalAccountsWithUserStorage,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('sets hasAccountSyncingSyncedAtLeastOnce', async () => {
    (
      Engine.context.UserStorageController
        .setHasAccountSyncingSyncedAtLeastOnce as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await setHasAccountSyncingSyncedAtLeastOnce(true);

    expect(
      Engine.context.UserStorageController
        .setHasAccountSyncingSyncedAtLeastOnce,
    ).toHaveBeenCalledWith(true);
    expect(result).toBeUndefined();
  });

  it('sets isAccountSyncingReadyToBeDispatched', async () => {
    (
      Engine.context.UserStorageController
        .setIsAccountSyncingReadyToBeDispatched as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await setIsAccountSyncingReadyToBeDispatched(true);

    expect(
      Engine.context.UserStorageController
        .setIsAccountSyncingReadyToBeDispatched,
    ).toHaveBeenCalledWith(true);
    expect(result).toBeUndefined();
  });

  it('locks account syncing', async () => {
    const mockSetIsAccountSyncingReadyToBeDispatched = jest.spyOn(
      Engine.context.UserStorageController,
      'setIsAccountSyncingReadyToBeDispatched',
    );

    const mockSetHasAccountSyncingSyncedAtLeastOnce = jest.spyOn(
      Engine.context.UserStorageController,
      'setHasAccountSyncingSyncedAtLeastOnce',
    );

    await lockAccountSyncing();

    expect(mockSetIsAccountSyncingReadyToBeDispatched).toHaveBeenCalledWith(
      false,
    );
    expect(mockSetHasAccountSyncingSyncedAtLeastOnce).toHaveBeenCalledWith(
      false,
    );
  });

  it('unlocks account syncing', async () => {
    const mockSetIsAccountSyncingReadyToBeDispatched = jest.spyOn(
      Engine.context.UserStorageController,
      'setIsAccountSyncingReadyToBeDispatched',
    );

    const mockSetHasAccountSyncingSyncedAtLeastOnce = jest.spyOn(
      Engine.context.UserStorageController,
      'setHasAccountSyncingSyncedAtLeastOnce',
    );

    await unlockAccountSyncing();

    expect(mockSetIsAccountSyncingReadyToBeDispatched).toHaveBeenCalledWith(
      true,
    );
    expect(mockSetHasAccountSyncingSyncedAtLeastOnce).toHaveBeenCalledWith(
      true,
    );
  });

  it('syncs contacts with user storage', async () => {
    (
      Engine.context.UserStorageController
        .syncContactsWithUserStorage as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await syncContactsWithUserStorage();

    expect(
      Engine.context.UserStorageController.syncContactsWithUserStorage,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
