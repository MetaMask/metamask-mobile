import Engine from '../Engine';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import ReduxService from '../redux';

export const PASSWORD_SYNC_INSTRUCTION = {
  InSync: 'in-sync',
  PasswordOutdated: 'password-outdated',
  ReconcileKeyring: 'reconcile-keyring',
  SyncKey: 'sync-key',
} as const;

export type PasswordSyncInstruction =
  (typeof PASSWORD_SYNC_INSTRUCTION)[keyof typeof PASSWORD_SYNC_INSTRUCTION];

export interface SeedlessPasswordChangeController {
  storeKeyringEncryptionKey: (keyringEncryptionKey: string) => Promise<void>;
  loadKeyringEncryptionKey: () => Promise<string>;
  checkIsPasswordOutdated?: (options?: {
    skipCache?: boolean;
  }) => Promise<boolean>;
  resolvePasswordSyncState?: (options?: {
    skipCache?: boolean;
  }) => Promise<PasswordSyncInstruction>;
  reconcilePassword?: (params: {
    globalPassword: string;
  }) => Promise<PasswordSyncInstruction>;
  markPasswordChangeKeySyncPending?: () => Promise<void>;
  completePasswordChange?: () => Promise<void>;
}

export const asSeedlessPasswordChangeController = (
  controller: object,
): SeedlessPasswordChangeController =>
  controller as SeedlessPasswordChangeController;

export const hasPasswordChangeLifecycleApi = (
  controller: SeedlessPasswordChangeController,
): boolean => typeof controller.resolvePasswordSyncState === 'function';

const hasPasswordChangeKeySyncApi = (
  controller: SeedlessPasswordChangeController,
): boolean =>
  typeof controller.markPasswordChangeKeySyncPending === 'function' &&
  typeof controller.completePasswordChange === 'function';

export const completeSeedlessPasswordChangeKeySync =
  async (): Promise<void> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    const controller = asSeedlessPasswordChangeController(
      SeedlessOnboardingController,
    );
    const keyringEncryptionKey = await KeyringController.exportEncryptionKey();

    if (!hasPasswordChangeKeySyncApi(controller)) {
      await controller.storeKeyringEncryptionKey(keyringEncryptionKey);
      return;
    }

    await controller.markPasswordChangeKeySyncPending?.();
    await controller.storeKeyringEncryptionKey(keyringEncryptionKey);
    const storedKey = await controller.loadKeyringEncryptionKey();
    if (storedKey !== keyringEncryptionKey) {
      throw new Error(
        'SeedlessOnboardingController - stored keyring encryption key does not match export',
      );
    }
    await controller.completePasswordChange?.();
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

const applyPasswordSyncInstruction = async (
  instruction: PasswordSyncInstruction,
  password: string,
  controller: SeedlessPasswordChangeController,
): Promise<void> => {
  switch (instruction) {
    case PASSWORD_SYNC_INSTRUCTION.InSync:
      return;
    case PASSWORD_SYNC_INSTRUCTION.PasswordOutdated: {
      if (typeof controller.reconcilePassword !== 'function') {
        throw new Error(
          'SeedlessOnboardingController - reconcilePassword is required for password recovery',
        );
      }
      const nextInstruction = await controller.reconcilePassword({
        globalPassword: password,
      });
      await applyPasswordSyncInstruction(nextInstruction, password, controller);
      return;
    }
    case PASSWORD_SYNC_INSTRUCTION.ReconcileKeyring:
      await reconcileLocalKeyring(password, controller);
      return;
    case PASSWORD_SYNC_INSTRUCTION.SyncKey:
      await completeSeedlessPasswordChangeKeySync();
      return;
    default: {
      const exhaustive: never = instruction;
      throw new Error(
        `SeedlessOnboardingController - unrecognized password sync instruction: ${exhaustive}`,
      );
    }
  }
};

export const isPasswordSyncInstructionOutdated = (
  instruction: PasswordSyncInstruction,
): boolean => instruction !== PASSWORD_SYNC_INSTRUCTION.InSync;

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

  const instruction = await controller.resolvePasswordSyncState?.({
    skipCache: true,
  });

  if (
    instruction === undefined ||
    instruction === PASSWORD_SYNC_INSTRUCTION.InSync
  ) {
    return false;
  }

  await applyPasswordSyncInstruction(instruction, password, controller);
  return true;
};
