import {
  PasswordSyncInstruction,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import { setIsConnectionRemoved } from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import Logger from '../../util/Logger';
import { analytics } from '../../util/analytics/analytics';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import Engine from '../Engine';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import ReduxService from '../redux';
import { signOutCardAfterPasswordChange } from '../signOutCardAfterPasswordChange';
import {
  checkAndShowSeedlessPasswordOutdatedModal,
  checkIsSeedlessPasswordOutdated,
  resolveSeedlessPasswordSyncInstruction,
  syncAndCompleteKeyringEncryptionKey,
  syncKeyringEncryptionKey,
  syncPasswordAndUnlockWallet,
  type SyncPasswordAndUnlockWalletDependencies,
} from './seedlessPasswordSync';

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        verifyPassword: jest.fn(),
        submitPassword: jest.fn(),
        submitEncryptionKey: jest.fn(),
        changePassword: jest.fn(),
        exportEncryptionKey: jest.fn(),
      },
      SeedlessOnboardingController: {
        resolvePasswordSyncState: jest.fn(),
        reconcilePassword: jest.fn(),
        markPasswordChangeKeySyncPending: jest.fn(),
        completePasswordChange: jest.fn(),
        storeKeyringEncryptionKey: jest.fn(),
        loadKeyringEncryptionKey: jest.fn(),
        submitPassword: jest.fn(),
        refreshAuthTokens: jest.fn(),
      },
    },
  },
}));

jest.mock('../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(),
}));

jest.mock('../signOutCardAfterPasswordChange', () => ({
  signOutCardAfterPasswordChange: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]): unknown => mockNavigate(...args),
    },
  },
}));

const mockKeyringController = Engine.context.KeyringController as unknown as {
  verifyPassword: jest.Mock;
  submitPassword: jest.Mock;
  submitEncryptionKey: jest.Mock;
  changePassword: jest.Mock;
  exportEncryptionKey: jest.Mock;
};

const mockSeedlessController = Engine.context
  .SeedlessOnboardingController as unknown as {
  resolvePasswordSyncState: jest.Mock;
  reconcilePassword: jest.Mock;
  markPasswordChangeKeySyncPending: jest.Mock;
  completePasswordChange: jest.Mock;
  storeKeyringEncryptionKey: jest.Mock;
  loadKeyringEncryptionKey: jest.Mock;
  submitPassword: jest.Mock;
  refreshAuthTokens: jest.Mock;
};

const mockSelectSeedlessLoginFlow = jest.mocked(
  selectSeedlessOnboardingLoginFlow,
);
const mockSignOutCardAfterPasswordChange = jest.mocked(
  signOutCardAfterPasswordChange,
);

describe('seedlessPasswordSync', () => {
  const mockGlobalPassword = 'newGlobalPassword123';
  const mockEncryptionKey = 'mock-keyring-encryption-key';
  let mockLockApp: jest.Mock<
    Promise<void>,
    [{ locked: boolean; reset?: boolean }]
  >;
  let deps: SyncPasswordAndUnlockWalletDependencies;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectSeedlessLoginFlow.mockReturnValue(true);
    mockSignOutCardAfterPasswordChange.mockResolvedValue(undefined);

    mockKeyringController.verifyPassword.mockRejectedValue(
      new Error('Incorrect password'),
    );
    mockKeyringController.submitPassword.mockResolvedValue(undefined);
    mockKeyringController.submitEncryptionKey.mockResolvedValue(undefined);
    mockKeyringController.changePassword.mockResolvedValue(undefined);
    mockKeyringController.exportEncryptionKey.mockResolvedValue(
      mockEncryptionKey,
    );

    mockSeedlessController.resolvePasswordSyncState.mockResolvedValue(
      PasswordSyncInstruction.InSync,
    );
    mockSeedlessController.reconcilePassword.mockResolvedValue(
      PasswordSyncInstruction.ReconcileKeyring,
    );
    mockSeedlessController.markPasswordChangeKeySyncPending.mockResolvedValue(
      undefined,
    );
    mockSeedlessController.completePasswordChange.mockResolvedValue(undefined);
    mockSeedlessController.storeKeyringEncryptionKey.mockResolvedValue(
      undefined,
    );
    mockSeedlessController.loadKeyringEncryptionKey.mockResolvedValue(
      mockEncryptionKey,
    );
    mockSeedlessController.submitPassword.mockResolvedValue(undefined);
    mockSeedlessController.refreshAuthTokens.mockResolvedValue(undefined);

    mockLockApp = jest.fn().mockResolvedValue(undefined);
    deps = {
      rehydrateSeedPhrase: jest.fn().mockResolvedValue(undefined),
      lockApp: mockLockApp,
      resetPassword: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('syncKeyringEncryptionKey', () => {
    it('exports the Keyring encryption key and stores it in SeedlessOnboardingController', async () => {
      await syncKeyringEncryptionKey();

      expect(mockKeyringController.exportEncryptionKey).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockSeedlessController.storeKeyringEncryptionKey,
      ).toHaveBeenCalledWith(mockEncryptionKey);
    });
  });

  describe('syncAndCompleteKeyringEncryptionKey', () => {
    it('marks key sync pending, stores and verifies the key, then completes the lifecycle', async () => {
      const callOrder: string[] = [];
      mockSeedlessController.markPasswordChangeKeySyncPending.mockImplementation(
        async () => {
          callOrder.push('markPasswordChangeKeySyncPending');
        },
      );
      mockSeedlessController.storeKeyringEncryptionKey.mockImplementation(
        async () => {
          callOrder.push('storeKeyringEncryptionKey');
        },
      );
      mockSeedlessController.loadKeyringEncryptionKey.mockImplementation(
        async () => {
          callOrder.push('loadKeyringEncryptionKey');
          return mockEncryptionKey;
        },
      );
      mockSeedlessController.completePasswordChange.mockImplementation(
        async () => {
          callOrder.push('completePasswordChange');
        },
      );

      await syncAndCompleteKeyringEncryptionKey();

      expect(callOrder).toStrictEqual([
        'markPasswordChangeKeySyncPending',
        'storeKeyringEncryptionKey',
        'loadKeyringEncryptionKey',
        'completePasswordChange',
      ]);
    });

    it('throws without completing the lifecycle when stored and current keys do not match', async () => {
      mockSeedlessController.loadKeyringEncryptionKey.mockResolvedValueOnce(
        'stale-encryption-key',
      );

      await expect(syncAndCompleteKeyringEncryptionKey()).rejects.toThrow(
        'Keyring encryption key synchronization failed',
      );
      expect(
        mockSeedlessController.completePasswordChange,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resolveSeedlessPasswordSyncInstruction', () => {
    it('returns InSync for non-seedless wallets without calling the controller', async () => {
      mockSelectSeedlessLoginFlow.mockReturnValue(false);

      const result = await resolveSeedlessPasswordSyncInstruction({
        skipCache: true,
      });

      expect(result).toBe(PasswordSyncInstruction.InSync);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).not.toHaveBeenCalled();
    });

    it('delegates to resolvePasswordSyncState for seedless wallets', async () => {
      mockSeedlessController.resolvePasswordSyncState.mockResolvedValueOnce(
        PasswordSyncInstruction.ReconcileKeyring,
      );

      const result = await resolveSeedlessPasswordSyncInstruction({
        skipCache: true,
      });

      expect(result).toBe(PasswordSyncInstruction.ReconcileKeyring);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('defaults skipCache to false when not provided', async () => {
      const result = await resolveSeedlessPasswordSyncInstruction();

      expect(result).toBe(PasswordSyncInstruction.InSync);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: false });
    });
  });

  describe('checkIsSeedlessPasswordOutdated', () => {
    it('returns false for non-seedless wallets without calling the controller', async () => {
      mockSelectSeedlessLoginFlow.mockReturnValue(false);

      const result = await checkIsSeedlessPasswordOutdated();

      expect(result).toBe(false);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).not.toHaveBeenCalled();
    });

    it('returns true when resolvePasswordSyncState returns a non-InSync instruction', async () => {
      mockSeedlessController.resolvePasswordSyncState.mockResolvedValueOnce(
        PasswordSyncInstruction.PasswordOutdated,
      );

      const result = await checkIsSeedlessPasswordOutdated({
        skipCache: true,
        captureSentryError: false,
      });

      expect(result).toBe(true);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('returns false and defaults skipCache to true when InSync', async () => {
      const result = await checkIsSeedlessPasswordOutdated();

      expect(result).toBe(false);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('reports errors via Logger.error when captureSentryError is true', async () => {
      const error = new Error('controller failed');
      mockSeedlessController.resolvePasswordSyncState.mockRejectedValueOnce(
        error,
      );

      const result = await checkIsSeedlessPasswordOutdated({
        skipCache: true,
        captureSentryError: true,
      });

      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error in checkIsSeedlessPasswordOutdated',
      );
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('logs errors via Logger.log when captureSentryError is false', async () => {
      const error = new Error('failed');
      mockSeedlessController.resolvePasswordSyncState.mockRejectedValueOnce(
        error,
      );

      const result = await checkIsSeedlessPasswordOutdated();

      expect(result).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(
        'checkIsSeedlessPasswordOutdated',
        error,
      );
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('syncPasswordAndUnlockWallet', () => {
    it('throws PasswordRecentlyUpdated when TOPRF sync rejects with IncorrectPassword and Keyring password is valid', async () => {
      mockKeyringController.verifyPassword.mockResolvedValueOnce('');
      mockSeedlessController.reconcilePassword.mockRejectedValueOnce(
        new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
      );

      await expect(
        syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
      ).rejects.toThrow(
        new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        ),
      );
    });

    it.each([
      ['plain Incorrect password', 'Incorrect password'],
      [
        'QuickCrypto Provider routines bad decrypt',
        'Cipher.final(...): Cipher final failed: error:1C800064:Provider routines::bad decrypt',
      ],
      [
        'legacy OpenSSL BAD_DECRYPT',
        'error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
      ],
      ['generic Decrypt failed', 'Decrypt failed'],
      ['Android DoCipher error', 'error in DoCipher, status: 2'],
    ])(
      'throws PasswordRecentlyUpdated when local vault decrypt rejects with %s and Keyring password is valid',
      async (_label, errorMessage) => {
        mockKeyringController.verifyPassword.mockResolvedValueOnce('');
        mockSeedlessController.reconcilePassword.mockRejectedValueOnce(
          new Error(errorMessage),
        );

        await expect(
          syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
        ).rejects.toThrow(
          new SeedlessOnboardingControllerError(
            SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
          ),
        );
        expect(Logger.error).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'Seedless IncorrectPassword',
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      ],
      [
        'QuickCrypto bad decrypt',
        'Cipher.final(...): Cipher final failed: error:1C800064:Provider routines::bad decrypt',
      ],
      ['generic Decrypt failed', 'Decrypt failed'],
      ['Android DoCipher error', 'error in DoCipher, status: 2'],
    ])(
      'rethrows %s without Logger.error when local Keyring password is also invalid',
      async (_label, errorMessage) => {
        mockSeedlessController.reconcilePassword.mockRejectedValueOnce(
          new Error(errorMessage),
        );

        await expect(
          syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
        ).rejects.toThrow(errorMessage);
        expect(Logger.error).not.toHaveBeenCalled();
      },
    );

    it('logs and rethrows Seedless VaultDataError even though its message contains "decrypted"', async () => {
      const error = new Error(
        SeedlessOnboardingControllerErrorMessage.VaultDataError,
      );
      mockKeyringController.verifyPassword.mockResolvedValueOnce('');
      mockSeedlessController.reconcilePassword.mockRejectedValueOnce(error);

      await expect(
        syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
      ).rejects.toThrow(error);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error in syncPasswordAndUnlockWallet',
      );
    });

    it('logs and rethrows unexpected reconcilePassword errors', async () => {
      const error = new Error(
        SeedlessOnboardingControllerErrorMessage.ExpiredCredentials,
      );
      mockSeedlessController.reconcilePassword.mockRejectedValueOnce(error);

      await expect(
        syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
      ).rejects.toThrow(error);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error in syncPasswordAndUnlockWallet',
      );
    });

    it('refreshes tokens, rehydrates, and marks connection removed on MaxKeyChainLengthExceeded', async () => {
      mockSeedlessController.reconcilePassword.mockRejectedValueOnce(
        new Error(
          SeedlessOnboardingControllerErrorMessage.MaxKeyChainLengthExceeded,
        ),
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(mockSeedlessController.refreshAuthTokens).toHaveBeenCalledTimes(1);
      expect(deps.rehydrateSeedPhrase).toHaveBeenCalledWith(mockGlobalPassword);
      expect(ReduxService.store.dispatch).toHaveBeenCalledWith(
        setIsConnectionRemoved(true),
      );
      expect(deps.resetPassword).not.toHaveBeenCalled();
    });

    it('still rehydrates when refreshAuthTokens fails during MaxKeyChainLengthExceeded recovery', async () => {
      const refreshError = new Error('refresh failed');
      mockSeedlessController.reconcilePassword.mockRejectedValueOnce(
        new Error(
          SeedlessOnboardingControllerErrorMessage.MaxKeyChainLengthExceeded,
        ),
      );
      mockSeedlessController.refreshAuthTokens.mockRejectedValueOnce(
        refreshError,
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(Logger.error).toHaveBeenCalledWith(
        refreshError,
        'Failed to refresh auth tokens during MaxKeyChainLength recovery, attempting rehydration anyway',
      );
      expect(deps.rehydrateSeedPhrase).toHaveBeenCalledWith(mockGlobalPassword);
    });

    it('reconciles Keyring, completes key sync, refreshes cache, signs out Card, and resets biometrics on ReconcileKeyring', async () => {
      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(mockSeedlessController.reconcilePassword).toHaveBeenCalledWith({
        globalPassword: mockGlobalPassword,
        maxKeyChainLength: 20,
      });
      expect(
        mockSeedlessController.loadKeyringEncryptionKey,
      ).toHaveBeenCalledTimes(2);
      expect(mockKeyringController.submitEncryptionKey).toHaveBeenCalledWith(
        mockEncryptionKey,
      );
      expect(mockKeyringController.changePassword).toHaveBeenCalledWith(
        mockGlobalPassword,
      );
      expect(
        mockSeedlessController.markPasswordChangeKeySyncPending,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSeedlessController.storeKeyringEncryptionKey,
      ).toHaveBeenCalledWith(mockEncryptionKey);
      expect(
        mockSeedlessController.completePasswordChange,
      ).toHaveBeenCalledTimes(1);
      expect(mockSignOutCardAfterPasswordChange).toHaveBeenCalledTimes(1);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: true });
      expect(deps.resetPassword).toHaveBeenCalledTimes(1);
      expect(deps.lockApp).not.toHaveBeenCalled();
    });

    it('resumes KEY_SYNC_PENDING recovery when reconcilePassword returns SyncKey', async () => {
      mockSeedlessController.reconcilePassword.mockResolvedValueOnce(
        PasswordSyncInstruction.SyncKey,
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(mockKeyringController.submitPassword).toHaveBeenCalledWith(
        mockGlobalPassword,
      );
      expect(mockKeyringController.changePassword).not.toHaveBeenCalled();
      expect(
        mockSeedlessController.markPasswordChangeKeySyncPending,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSeedlessController.completePasswordChange,
      ).toHaveBeenCalledTimes(1);
      expect(mockSignOutCardAfterPasswordChange).toHaveBeenCalledTimes(1);
      expect(
        mockSeedlessController.resolvePasswordSyncState,
      ).toHaveBeenCalledWith({ skipCache: true });
      expect(deps.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('unlocks normally without changing password when reconcilePassword returns InSync', async () => {
      mockSeedlessController.reconcilePassword.mockResolvedValueOnce(
        PasswordSyncInstruction.InSync,
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(mockKeyringController.submitPassword).toHaveBeenCalledWith(
        mockGlobalPassword,
      );
      expect(mockSeedlessController.submitPassword).toHaveBeenCalledWith(
        mockGlobalPassword,
      );
      expect(mockKeyringController.changePassword).not.toHaveBeenCalled();
      expect(
        mockSeedlessController.completePasswordChange,
      ).not.toHaveBeenCalled();
      expect(deps.resetPassword).not.toHaveBeenCalled();
    });

    it('locks the app and throws CouldNotRecoverPassword when reconcilePassword returns WalletResetRequired', async () => {
      mockSeedlessController.reconcilePassword.mockResolvedValueOnce(
        PasswordSyncInstruction.WalletResetRequired,
      );

      await expect(
        syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
      ).rejects.toThrow(
        SeedlessOnboardingControllerErrorMessage.CouldNotRecoverPassword,
      );
      expect(deps.lockApp).toHaveBeenCalledWith({
        locked: true,
        reset: false,
      });
      expect(deps.resetPassword).not.toHaveBeenCalled();
    });

    it('does not block completion when Card sign-out never resolves', async () => {
      mockSignOutCardAfterPasswordChange.mockImplementation(
        async () => new Promise<void>(() => undefined),
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(mockSignOutCardAfterPasswordChange).toHaveBeenCalledTimes(1);
      expect(deps.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('still completes when Card sign-out rejects', async () => {
      mockSignOutCardAfterPasswordChange.mockRejectedValueOnce(
        new Error('card logout failed'),
      );

      await syncPasswordAndUnlockWallet(mockGlobalPassword, deps);

      expect(deps.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('locks the app and rethrows when KeyringController.changePassword fails', async () => {
      mockKeyringController.changePassword.mockRejectedValueOnce(
        new Error('change password failed'),
      );

      await expect(
        syncPasswordAndUnlockWallet(mockGlobalPassword, deps),
      ).rejects.toThrow('change password failed');
      expect(deps.lockApp).toHaveBeenCalledWith({
        locked: true,
        reset: false,
      });
      expect(mockSignOutCardAfterPasswordChange).not.toHaveBeenCalled();
      expect(deps.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('checkAndShowSeedlessPasswordOutdatedModal', () => {
    it('returns early when isSeedlessPasswordOutdated is false', async () => {
      const checkOutdated = jest.fn().mockResolvedValue(true);

      await checkAndShowSeedlessPasswordOutdatedModal(false, {
        checkIsSeedlessPasswordOutdated: checkOutdated,
        lockApp: mockLockApp,
      });

      expect(checkOutdated).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });

    it('returns early when checkIsSeedlessPasswordOutdated returns false', async () => {
      const checkOutdated = jest.fn().mockResolvedValue(false);

      await checkAndShowSeedlessPasswordOutdatedModal(true, {
        checkIsSeedlessPasswordOutdated: checkOutdated,
        lockApp: mockLockApp,
      });

      expect(checkOutdated).toHaveBeenCalledWith({
        skipCache: false,
        captureSentryError: true,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });

    it('tracks analytics, navigates to the modal, and locks the app on confirm', async () => {
      mockSeedlessController.resolvePasswordSyncState.mockResolvedValueOnce(
        PasswordSyncInstruction.PasswordOutdated,
      );

      await checkAndShowSeedlessPasswordOutdatedModal(true, {
        lockApp: mockLockApp,
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.PASSWORD_OUTDATED_MODAL_VIEWED.category,
          properties: { category: 'App' },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            type: 'error',
            isInteractable: false,
            closeOnPrimaryButtonPress: true,
          }),
        }),
      );

      const { params } = mockNavigate.mock.calls[0][1] as {
        params: { onPrimaryButtonPress: () => Promise<void> };
      };
      await params.onPrimaryButtonPress();

      expect(mockLockApp).toHaveBeenCalledWith({ locked: true });
    });
  });
});
