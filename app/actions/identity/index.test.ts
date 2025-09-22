import {
  performSignIn,
  performSignOut,
  setIsBackupAndSyncFeatureEnabled,
  syncContactsWithUserStorage,
  syncAccountTreeWithUserStorage,
} from '.';
import Engine from '../../core/Engine';
import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import { getErrorMessage } from '@metamask/utils';

const BACKUPANDSYNC_FEATURES = {
  main: 'main' as const,
  accountSyncing: 'accountSyncing' as const,
  contactSyncing: 'contactSyncing' as const,
};

jest.mock('../../core/Engine', () => ({
  resetState: jest.fn(),
  getSnapKeyring: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      performSignOut: jest.fn(),
    },
    UserStorageController: {
      setIsBackupAndSyncFeatureEnabled: jest.fn(),
      syncContactsWithUserStorage: jest.fn(),
    },
    AccountTreeController: {
      syncWithUserStorage: jest.fn(),
      syncWithUserStorageAtLeastOnce: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            metadata: {
              id: 'mock-entropy-source-id',
            },
          },
        ],
      },
    },
  },
}));

jest.mock('../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: jest.fn(),
}));

jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAccounts: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  getErrorMessage: jest.fn((error) => error.message || 'Unknown error'),
}));

jest.mock('@metamask/profile-sync-controller/user-storage', () => ({
  BACKUPANDSYNC_FEATURES: {
    main: 'main' as const,
    accountSyncing: 'accountSyncing' as const,
    contactSyncing: 'contactSyncing' as const,
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

  describe('syncAccountTreeWithUserStorage', () => {
    it('returns early when multichain accounts state 2 is disabled', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(false);

      const result = await syncAccountTreeWithUserStorage();

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).not.toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ discoveredAccountsCount: 0, error: '' });
    });

    it('syncs with user storage when multichain accounts state 2 is enabled', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController.syncWithUserStorage as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await syncAccountTreeWithUserStorage();

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce,
      ).not.toHaveBeenCalled();
      expect(discoverAccounts).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ discoveredAccountsCount: 0, error: '' });
    });

    it('syncs with user storage at least once when ensureDoneAtLeastOnce option is true', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController
          .syncWithUserStorageAtLeastOnce as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await syncAccountTreeWithUserStorage({
        ensureDoneAtLeastOnce: true,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce,
      ).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).not.toHaveBeenCalled();
      expect(discoverAccounts).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ discoveredAccountsCount: 0, error: '' });
    });

    it('discovers and creates accounts when alsoDiscoverAndCreateAccounts option is true', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController.syncWithUserStorage as jest.Mock
      ).mockResolvedValue(undefined);
      (discoverAccounts as jest.Mock).mockResolvedValue(5);

      const result = await syncAccountTreeWithUserStorage({
        alsoDiscoverAndCreateAccounts: true,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).toHaveBeenCalled();
      expect(discoverAccounts).toHaveBeenCalledWith('mock-entropy-source-id');
      expect(result).toStrictEqual({ discoveredAccountsCount: 5, error: '' });
    });

    it('uses custom entropy source ID when provided', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController.syncWithUserStorage as jest.Mock
      ).mockResolvedValue(undefined);
      (discoverAccounts as jest.Mock).mockResolvedValue(3);

      const customEntropySourceId = 'custom-entropy-source-id';
      const result = await syncAccountTreeWithUserStorage({
        alsoDiscoverAndCreateAccounts: true,
        entropySourceIdToDiscover: customEntropySourceId,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).toHaveBeenCalled();
      expect(discoverAccounts).toHaveBeenCalledWith(customEntropySourceId);
      expect(result).toStrictEqual({ discoveredAccountsCount: 3, error: '' });
    });

    it('handles all options together', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController
          .syncWithUserStorageAtLeastOnce as jest.Mock
      ).mockResolvedValue(undefined);
      (discoverAccounts as jest.Mock).mockResolvedValue(2);

      const customEntropySourceId = 'custom-entropy-source-id';
      const result = await syncAccountTreeWithUserStorage({
        ensureDoneAtLeastOnce: true,
        alsoDiscoverAndCreateAccounts: true,
        entropySourceIdToDiscover: customEntropySourceId,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce,
      ).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).not.toHaveBeenCalled();
      expect(discoverAccounts).toHaveBeenCalledWith(customEntropySourceId);
      expect(result).toStrictEqual({ discoveredAccountsCount: 2, error: '' });
    });

    it('returns error message when getSnapKeyring throws an error', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      const mockError = new Error('SnapKeyring initialization failed');
      (Engine.getSnapKeyring as jest.Mock).mockRejectedValue(mockError);
      (getErrorMessage as jest.Mock).mockReturnValue(
        'SnapKeyring initialization failed',
      );

      const result = await syncAccountTreeWithUserStorage();

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).not.toHaveBeenCalled();
      expect(getErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result).toStrictEqual({
        discoveredAccountsCount: 0,
        error: 'SnapKeyring initialization failed',
      });
    });

    it('returns error message when syncWithUserStorage throws an error', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      const mockError = new Error('Sync failed');
      (
        Engine.context.AccountTreeController.syncWithUserStorage as jest.Mock
      ).mockRejectedValue(mockError);
      (getErrorMessage as jest.Mock).mockReturnValue('Sync failed');

      const result = await syncAccountTreeWithUserStorage();

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).toHaveBeenCalled();
      expect(getErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result).toStrictEqual({
        discoveredAccountsCount: 0,
        error: 'Sync failed',
      });
    });

    it('returns error message when syncWithUserStorageAtLeastOnce throws an error', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      const mockError = new Error('Sync at least once failed');
      (
        Engine.context.AccountTreeController
          .syncWithUserStorageAtLeastOnce as jest.Mock
      ).mockRejectedValue(mockError);
      (getErrorMessage as jest.Mock).mockReturnValue(
        'Sync at least once failed',
      );

      const result = await syncAccountTreeWithUserStorage({
        ensureDoneAtLeastOnce: true,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce,
      ).toHaveBeenCalled();
      expect(getErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result).toStrictEqual({
        discoveredAccountsCount: 0,
        error: 'Sync at least once failed',
      });
    });

    it('returns error message when discoverAccounts throws an error', async () => {
      (isMultichainAccountsState2Enabled as jest.Mock).mockReturnValue(true);
      (Engine.getSnapKeyring as jest.Mock).mockResolvedValue(undefined);
      (
        Engine.context.AccountTreeController.syncWithUserStorage as jest.Mock
      ).mockResolvedValue(undefined);
      const mockError = new Error('Account discovery failed');
      (discoverAccounts as jest.Mock).mockRejectedValue(mockError);
      (getErrorMessage as jest.Mock).mockReturnValue(
        'Account discovery failed',
      );

      const result = await syncAccountTreeWithUserStorage({
        alsoDiscoverAndCreateAccounts: true,
      });

      expect(isMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(Engine.getSnapKeyring).toHaveBeenCalled();
      expect(
        Engine.context.AccountTreeController.syncWithUserStorage,
      ).toHaveBeenCalled();
      expect(discoverAccounts).toHaveBeenCalledWith('mock-entropy-source-id');
      expect(getErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result).toStrictEqual({
        discoveredAccountsCount: 0,
        error: 'Account discovery failed',
      });
    });
  });
});
