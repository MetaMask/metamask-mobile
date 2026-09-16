import Engine from '../Engine';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import ReduxService from '../redux';

/**
 * Client-side copy of Core `PasswordSyncStatus` from
 * `@metamask/seedless-onboarding-controller` PR #10148.
 * Local until Mobile bumps past 10.1.1.
 */
export const PASSWORD_SYNC_STATUS = {
  InSync: 'in-sync',
  PasswordOutdated: 'password-outdated',
  EnterNewPassword: 'enter-new-password',
  ReconcileKeyring: 'reconcile-keyring',
  SyncKey: 'sync-key',
  Unknown: 'unknown',
} as const;

export type PasswordSyncStatus =
  (typeof PASSWORD_SYNC_STATUS)[keyof typeof PASSWORD_SYNC_STATUS];

/**
 * Duck-typed Seedless controller surface spanning 10.1.1 and the #10148
 * lifecycle APIs. Methods missing on the installed package are omitted at
 * runtime.
 */
export interface SeedlessPasswordChangeController {
  storeKeyringEncryptionKey: (keyringEncryptionKey: string) => Promise<void>;
  loadKeyringEncryptionKey: () => Promise<string>;
  checkIsPasswordOutdated?: (options?: {
    skipCache?: boolean;
  }) => Promise<boolean>;
  resolvePasswordSyncState?: (options?: {
    skipCache?: boolean;
  }) => Promise<PasswordSyncStatus>;
  reconcilePassword?: (params: {
    globalPassword: string;
  }) => Promise<PasswordSyncStatus>;
  markPasswordChangeKeySyncPending?: () => Promise<void>;
  clearPasswordChangePhase?: () => Promise<void>;
}

export const asSeedlessPasswordChangeController = (
  controller: object,
): SeedlessPasswordChangeController =>
  controller as SeedlessPasswordChangeController;

export const hasPasswordChangeLifecycleApi = (
  controller: SeedlessPasswordChangeController,
): boolean => typeof controller.resolvePasswordSyncState === 'function';

/**
 * Export, store, and (when the lifecycle API is present) mark + clear the
 * Keyring encryption-key sync boundary after a password change or recovery.
 */
export const completeSeedlessPasswordChangeKeySync =
  async (): Promise<void> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    const controller = asSeedlessPasswordChangeController(
      SeedlessOnboardingController,
    );
    const keyringEncryptionKey = await KeyringController.exportEncryptionKey();
    await controller.storeKeyringEncryptionKey(keyringEncryptionKey);

    if (typeof controller.markPasswordChangeKeySyncPending === 'function') {
      await controller.markPasswordChangeKeySyncPending();
      await controller.storeKeyringEncryptionKey(keyringEncryptionKey);
    }

    if (typeof controller.clearPasswordChangePhase === 'function') {
      await controller.clearPasswordChangePhase();
    }
  };

const reconcileLocalKeyring = async (
  password: string,
  controller: SeedlessPasswordChangeController,
): Promise<void> => {
  const { KeyringController } = Engine.context;
  const isNewPassword = await KeyringController.verifyPassword(password)
    .then(() => true)
    .catch(() => false);

  if (!isNewPassword) {
    const keyringEncryptionKey = await controller.loadKeyringEncryptionKey();
    await KeyringController.submitEncryptionKey(keyringEncryptionKey);
    await KeyringController.changePassword(password);
  }

  await completeSeedlessPasswordChangeKeySync();
};

const applyPasswordSyncStatus = async (
  status: PasswordSyncStatus,
  password: string,
  controller: SeedlessPasswordChangeController,
): Promise<void> => {
  switch (status) {
    case PASSWORD_SYNC_STATUS.InSync:
      return;
    case PASSWORD_SYNC_STATUS.PasswordOutdated:
    case PASSWORD_SYNC_STATUS.EnterNewPassword: {
      if (typeof controller.reconcilePassword !== 'function') {
        throw new Error(
          'SeedlessOnboardingController - reconcilePassword is required for password recovery',
        );
      }
      const nextStatus = await controller.reconcilePassword({
        globalPassword: password,
      });
      await applyPasswordSyncStatus(nextStatus, password, controller);
      return;
    }
    case PASSWORD_SYNC_STATUS.ReconcileKeyring:
      await reconcileLocalKeyring(password, controller);
      return;
    case PASSWORD_SYNC_STATUS.SyncKey:
      await completeSeedlessPasswordChangeKeySync();
      return;
    case PASSWORD_SYNC_STATUS.Unknown:
      throw new Error(
        'SeedlessOnboardingController - password sync state unknown',
      );
    default: {
      const exhaustive: never = status;
      throw new Error(
        `SeedlessOnboardingController - unrecognized password sync status: ${exhaustive}`,
      );
    }
  }
};

/**
 * Maps lifecycle status onto the boolean outdated check used by existing
 * call sites. `unknown` is treated as outdated so the wallet stays locked.
 */
export const isPasswordSyncStatusOutdated = (
  status: PasswordSyncStatus,
): boolean => status !== PASSWORD_SYNC_STATUS.InSync;

/**
 * When Core #10148 is present, resolve + recover before a normal unlock.
 * Returns true when recovery ran (biometric preference should be rebuilt).
 * No-ops and returns false when the lifecycle API is absent or the device
 * is already in-sync.
 */
export const applySeedlessUnlockRecovery = async (
  password: string,
): Promise<boolean> => {
  if (!selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    return false;
  }

  const controller = asSeedlessPasswordChangeController(
    Engine.context.SeedlessOnboardingController,
  );

  if (!hasPasswordChangeLifecycleApi(controller)) {
    return false;
  }

  const status = await controller.resolvePasswordSyncState?.({
    skipCache: false,
  });

  if (status === undefined || status === PASSWORD_SYNC_STATUS.InSync) {
    return false;
  }

  await applyPasswordSyncStatus(status, password, controller);
  return true;
};
