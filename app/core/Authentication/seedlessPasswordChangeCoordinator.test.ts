import Engine from '../Engine';
import ReduxService, { ReduxStore } from '../redux';
import {
  applySeedlessUnlockRecovery,
  completeSeedlessPasswordChangeKeySync,
  hasPasswordChangeLifecycleApi,
  isPasswordSyncInstructionOutdated,
  PASSWORD_SYNC_INSTRUCTION,
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

  describe('isPasswordSyncInstructionOutdated', () => {
    it('returns false for in-sync', () => {
      expect(
        isPasswordSyncInstructionOutdated(PASSWORD_SYNC_INSTRUCTION.InSync),
      ).toBe(false);
    });

    it('returns true for password-outdated', () => {
      expect(
        isPasswordSyncInstructionOutdated(
          PASSWORD_SYNC_INSTRUCTION.PasswordOutdated,
        ),
      ).toBe(true);
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

    it('marks KEY_SYNC_PENDING, stores, verifies, then completes the lifecycle', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('enc-key'),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });

      await completeSeedlessPasswordChangeKeySync();

      expect(controller.markPasswordChangeKeySyncPending).toHaveBeenCalledTimes(
        1,
      );
      expect(controller.storeKeyringEncryptionKey).toHaveBeenCalledTimes(1);
      expect(controller.storeKeyringEncryptionKey).toHaveBeenCalledWith(
        'enc-key',
      );
      expect(controller.loadKeyringEncryptionKey).toHaveBeenCalledTimes(1);
      expect(controller.completePasswordChange).toHaveBeenCalledTimes(1);
      const markOrder =
        controller.markPasswordChangeKeySyncPending.mock.invocationCallOrder[0];
      const storeOrder =
        controller.storeKeyringEncryptionKey.mock.invocationCallOrder[0];
      const completeOrder =
        controller.completePasswordChange.mock.invocationCallOrder[0];
      expect(markOrder).toBeLessThan(storeOrder);
      expect(storeOrder).toBeLessThan(completeOrder);
    });

    it('throws when the stored keyring encryption key does not match export', async () => {
      setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('other-key'),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });

      await expect(completeSeedlessPasswordChangeKeySync()).rejects.toThrow(
        'stored keyring encryption key does not match export',
      );
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
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn(),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_INSTRUCTION.InSync),
      });

      const recovered = await applySeedlessUnlockRecovery('password');

      expect(recovered).toBe(false);
      expect(controller.resolvePasswordSyncState).toHaveBeenCalledWith({
        skipCache: true,
      });
      expect(
        mockEngine.context.KeyringController.changePassword,
      ).not.toHaveBeenCalled();
    });

    it('reconciles then finishes key sync when instruction is password-outdated', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('enc-key'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_INSTRUCTION.PasswordOutdated),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_INSTRUCTION.ReconcileKeyring),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });

      const recovered = await applySeedlessUnlockRecovery('new-password');

      expect(recovered).toBe(true);
      expect(controller.reconcilePassword).toHaveBeenCalledWith({
        globalPassword: 'new-password',
      });
      expect(controller.completePasswordChange).toHaveBeenCalledTimes(1);
    });

    it('loads the stored keyring key when verifyPassword rejects', async () => {
      mockEngine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValue(new Error('wrong password'));
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest
          .fn()
          .mockResolvedValueOnce('wrapped-key')
          .mockResolvedValueOnce('enc-key'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PASSWORD_SYNC_INSTRUCTION.ReconcileKeyring),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });

      await applySeedlessUnlockRecovery('new-password');

      expect(controller.loadKeyringEncryptionKey).toHaveBeenCalled();
      expect(
        mockEngine.context.KeyringController.submitEncryptionKey,
      ).toHaveBeenCalledWith('wrapped-key');
      expect(
        mockEngine.context.KeyringController.changePassword,
      ).toHaveBeenCalledWith('new-password');
    });
  });
});
