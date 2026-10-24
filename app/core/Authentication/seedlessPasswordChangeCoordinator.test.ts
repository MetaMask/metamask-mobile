import { PasswordSyncInstruction } from '@metamask/seedless-onboarding-controller';
import Engine from '../Engine';
import ReduxService, { ReduxStore } from '../redux';
import {
  applySeedlessUnlockRecovery,
  completeSeedlessPasswordChangeKeySync,
  isPasswordSyncInstructionOutdated,
} from './seedlessPasswordChangeCoordinator';
import {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  resetSeedlessPasswordChangeKillSwitchForTests,
  setSeedlessPasswordChangeKillAfter,
} from './seedlessPasswordChangeKillSwitch';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      exportEncryptionKey: jest.fn(),
      verifyPassword: jest.fn(),
      submitPassword: jest.fn(),
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
    resetSeedlessPasswordChangeKillSwitchForTests();
    mockEngine.context.KeyringController.exportEncryptionKey = jest
      .fn()
      .mockResolvedValue('enc-key');
    mockEngine.context.KeyringController.verifyPassword = jest
      .fn()
      .mockResolvedValue(undefined);
    mockEngine.context.KeyringController.submitPassword = jest
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

  describe('isPasswordSyncInstructionOutdated', () => {
    it('returns false for in-sync', () => {
      expect(
        isPasswordSyncInstructionOutdated(PasswordSyncInstruction.InSync),
      ).toBe(false);
    });

    it('returns true for password-outdated', () => {
      expect(
        isPasswordSyncInstructionOutdated(
          PasswordSyncInstruction.PasswordOutdated,
        ),
      ).toBe(true);
    });
  });

  describe('completeSeedlessPasswordChangeKeySync', () => {
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

    it('halts after KEY_SYNC_PENDING before storing the keyring key', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('enc-key'),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });
      setSeedlessPasswordChangeKillAfter(
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
      );

      await expect(completeSeedlessPasswordChangeKeySync()).rejects.toThrow(
        /SEEDLESS_E2E_KILL_HALT:after_key_sync_pending/,
      );

      expect(controller.markPasswordChangeKeySyncPending).toHaveBeenCalledTimes(
        1,
      );
      expect(controller.storeKeyringEncryptionKey).not.toHaveBeenCalled();
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

    it('returns false when resolvePasswordSyncState reports in-sync', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn(),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.InSync),
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
          .mockResolvedValue(PasswordSyncInstruction.PasswordOutdated),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.ReconcileKeyring),
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

    it('unlocks the keyring before exporting its key when instruction is sync-key', async () => {
      setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('enc-key'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.SyncKey),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.SyncKey),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });
      const { submitPassword, exportEncryptionKey } =
        mockEngine.context.KeyringController;

      await applySeedlessUnlockRecovery('new-password');

      expect(submitPassword).toHaveBeenCalledWith('new-password');
      expect(
        jest.mocked(submitPassword).mock.invocationCallOrder[0],
      ).toBeLessThan(
        jest.mocked(exportEncryptionKey).mock.invocationCallOrder[0],
      );
    });

    it('stores the keyring encryption key when instruction is sync-key', async () => {
      const controller = setSeedlessController({
        storeKeyringEncryptionKey: jest.fn().mockResolvedValue(undefined),
        loadKeyringEncryptionKey: jest.fn().mockResolvedValue('enc-key'),
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.SyncKey),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.SyncKey),
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
      expect(controller.markPasswordChangeKeySyncPending).toHaveBeenCalledTimes(
        1,
      );
      expect(controller.completePasswordChange).toHaveBeenCalledTimes(1);
    });

    it('throws without touching the keyring when instruction is wallet-reset-required', async () => {
      const controller = setSeedlessController({
        resolvePasswordSyncState: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.WalletResetRequired),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.WalletResetRequired),
        markPasswordChangeKeySyncPending: jest.fn(),
        completePasswordChange: jest.fn(),
      });

      await expect(applySeedlessUnlockRecovery('new-password')).rejects.toThrow(
        'SeedlessOnboardingController - wallet reset required to recover this device',
      );
      expect(
        mockEngine.context.KeyringController.submitPassword,
      ).not.toHaveBeenCalled();
      expect(controller.completePasswordChange).not.toHaveBeenCalled();
    });

    it('loads the stored keyring key when submitPassword rejects', async () => {
      mockEngine.context.KeyringController.submitPassword = jest
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
          .mockResolvedValue(PasswordSyncInstruction.ReconcileKeyring),
        reconcilePassword: jest
          .fn()
          .mockResolvedValue(PasswordSyncInstruction.ReconcileKeyring),
        markPasswordChangeKeySyncPending: jest
          .fn()
          .mockResolvedValue(undefined),
        completePasswordChange: jest.fn().mockResolvedValue(undefined),
      });

      await applySeedlessUnlockRecovery('new-password');

      const reconcileOrder =
        controller.reconcilePassword.mock.invocationCallOrder[0];
      const loadOrder =
        controller.loadKeyringEncryptionKey.mock.invocationCallOrder[0];
      expect(reconcileOrder).toBeLessThan(loadOrder);
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
