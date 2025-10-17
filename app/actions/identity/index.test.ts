import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import {
  performSignIn,
  performSignOut,
  setIsBackupAndSyncFeatureEnabled,
  syncContactsWithUserStorage,
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
      syncContactsWithUserStorage: jest.fn(),
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
