import Engine from '../Engine';
import ReduxService, { ReduxStore } from '../redux';
import {
  applySeedlessUnlockRecovery,
  completeSeedlessPasswordChangeKeySync,
  hasPasswordChangeLifecycleApi,
  isPasswordSyncStatusOutdated,
  PASSWORD_SYNC_STATUS,
  asSeedlessPasswordChangeController,
} from './seedlessPasswordChangeCoordinator';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      exportEncryptionKey: jest.fn(),
      verifyPassword: jest.fn(),
      submitEncryptionKey: jest.fn(),
      changePassword: jest.fn(),
    },
    SeedlessOnboardingController: {},
  },
}));

const mockEngine = jest.mocked(Engine);

const mockSeedlessState = (vault: string | undefined) => ({
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault,
        socialBackupsMetadata: [],
      },
    },
  },
});

/**
 * Install a partial Seedless controller on the Engine and return it for
 * assertions. The cast is required while the installed controller version
 * predates the password-change lifecycle methods.
 */
const setSeedlessController = <T extends Record<string, jest.Mock>>(
  controller: T,
): T => {
  mockEngine.context.SeedlessOnboardingController =
    controller as unknown as typeof mockEngine.context.SeedlessOnboardingController;
  return controller;
};

describe('seedlessPasswordChangeCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.context.KeyringController.exportEncryptionKey = jest
      .fn()
      .mockResolvedValue('enc-key');
    mockEngine.context.KeyringController.verifyPassword = jest
      .fn()
      .mockResolvedValue(undefined);
    mockEngine.context.KeyringController.submitEncryptionKey = jest
      .fn()
      .mockResolvedValue(undefined);
    mockEngine.context.KeyringController.changePassword = jest
      .fn()
      .mockResolvedValue(undefined);

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      dispatch: jest.fn(),
      getState: jest.fn(() => mockSeedlessState('vault')),
    } as unknown as ReduxStore);
  });

  describe('hasPasswordChangeLifecycleApi', () => {
    it('returns true when resolvePasswordSyncState is a function', () => {
      const controller = asSeedlessPasswordChangeController({
        resolvePasswordSyncState: jest.fn(),
      });

      expect(hasPasswordChangeLifecycleApi(controller)).toBe(true);
    });

    it('returns false when resolvePasswordSyncState is missing', () => {
      const controller = asSeedlessPasswordChangeController({});

      expect(hasPasswordChangeLifecycleApi(controller)).toBe(false);
    });
  });

  describe('isPasswordSyncStatusOutdated', () => {
    it('returns false for in-sync', () => {
      expect(isPasswordSyncStatusOutdated(PASSWORD_SYNC_STATUS.InSync)).toBe(
        false,
      );
    });

    it('returns true for unknown so the wallet stays locked', () => {
      expect(isPasswordSyncStatusOutdated(PASSWORD_SYNC_STATUS.Unknown)).toBe(
        true,
      );
    });
  });

  describe('completeSeedlessPasswordChangeKeySync', () => {
    it('stores the keyring encryption key when lifecycle methods are absent', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
      });

      await completeSeedlessPasswordChangeKeySync();

      expect(
        mockEngine.context.KeyringController.exportEncryptionKey,
      ).toHaveBeenCalledTimes(1);
      expect(controller.storeKeyringEncryptionKey).toHaveBeenCalledWith(
        'enc-key',
      );
    });

    it('marks KEY_SYNC_PENDING then clears the phase when lifecycle methods exist', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        clearPasswordChangePhase: jest.fn().mockResolvedValue(undefined),
      });

      await completeSeedlessPasswordChangeKeySync();

      expect(controller.storeKeyringEncryptionKey).toHaveBeenNthCalledWith(
        1,
        'enc-key',
      );
      expect(controller.markPasswordChangeKeySyncPending).toHaveBeenCalledTimes(
        1,
      );
      expect(controller.storeKeyringEncryptionKey).toHaveBeenNthCalledWith(
        2,
        'enc-key',
      );
      expect(controller.clearPasswordChangePhase).toHaveBeenCalledTimes(1);
    });
  });

  describe('applySeedlessUnlockRecovery', () => {
    it('returns false when the user is not in the seedless login flow', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockSeedlessState(undefined)),
      } as unknown as ReduxStore);

      const recovered = await applySeedlessUnlockRecovery('password');

      expect(recovered).toBe(false);
    });

    it('returns false when the lifecycle API is absent', async () => {
      setSeedlessController({
        storeKeyringEncryptionKey: jest.fn(),
      });

      const recovered = await applySeedlessUnlockRecovery('password');

      expect(recovered).toBe(false);
    });

    it('returns false when resolvePasswordSyncState reports in-sync', async () => {
      setSeedlessController({
        storeKeyringEncryptionKey: jest.fn(),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_STATUS.InSync),
      });

      const recovered = await applySeedlessUnlockRecovery('password');

      expect(recovered).toBe(false);
      expect(
        mockEngine.context.KeyringController.changePassword,
      ).not.toHaveBeenCalled();
    });

    it('reconciles then finishes key sync when status is password-outdated', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('old-enc'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_STATUS.PasswordOutdated),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_STATUS.ReconcileKeyring),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        clearPasswordChangePhase: jest.fn().mockResolvedValue(undefined),
      });

      const recovered = await applySeedlessUnlockRecovery('new-password');

      expect(recovered).toBe(true);
      expect(controller.reconcilePassword).toHaveBeenCalledWith({
        globalPassword: 'new-password',
      });
      expect(controller.clearPasswordChangePhase).toHaveBeenCalledTimes(1);
    });

    it('loads the stored keyring key when verifyPassword rejects', async () => {
      mockEngine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValue(new Error('wrong password'));
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('wrapped-key'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_STATUS.ReconcileKeyring),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        clearPasswordChangePhase: jest.fn().mockResolvedValue(undefined),
      });

      await applySeedlessUnlockRecovery('new-password');

      expect(controller.loadKeyringEncryptionKey).toHaveBeenCalledTimes(1);
      expect(
        mockEngine.context.KeyringController.submitEncryptionKey,
      ).toHaveBeenCalledWith('wrapped-key');
      expect(
        mockEngine.context.KeyringController.changePassword,
      ).toHaveBeenCalledWith('new-password');
    });

    it('throws when resolvePasswordSyncState reports unknown', async () => {
      setSeedlessController({
        storeKeyringEncryptionKey: jest.fn(),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_STATUS.Unknown),
      });

      await expect(applySeedlessUnlockRecovery('password')).rejects.toThrow(
        'password sync state unknown',
      );
    });
  });
});
