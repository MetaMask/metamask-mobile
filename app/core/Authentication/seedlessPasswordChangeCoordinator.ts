import { PasswordSyncInstruction } from '@metamask/seedless-onboarding-controller';
import Engine from '../Engine';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import ReduxService from '../redux';
import {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  haltIfSeedlessPasswordChangeKillAfter,
} from './seedlessPasswordChangeKillSwitch';

export { PasswordSyncInstruction };

export const isPasswordSyncInstructionOutdated = (
  instruction: PasswordSyncInstruction,
): boolean => instruction !== PasswordSyncInstruction.InSync;

export const completeSeedlessPasswordChangeKeySync =
  async (): Promise<void> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    const keyringEncryptionKey = await KeyringController.exportEncryptionKey();

    await SeedlessOnboardingController.markPasswordChangeKeySyncPending();
    await haltIfSeedlessPasswordChangeKillAfter(
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
    );
    await SeedlessOnboardingController.storeKeyringEncryptionKey(
      keyringEncryptionKey,
    );
    const storedKey =
      await SeedlessOnboardingController.loadKeyringEncryptionKey();
    if (storedKey !== keyringEncryptionKey) {
      throw new Error(
        'SeedlessOnboardingController - stored keyring encryption key does not match export',
      );
    }
    await SeedlessOnboardingController.completePasswordChange();
  };

const reconcileLocalKeyring = async (password: string): Promise<void> => {
  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  // submitPassword, not verifyPassword: recovery runs at unlock with the
  // controller locked, and verifyPassword rejects on a locked controller
  // regardless of the password. Decrypting is what classifies the Keyring.
  const isNewPassword = await KeyringController.submitPassword(password)
    .then(() => true)
    .catch(() => false);

  if (!isNewPassword) {
    const keyringEncryptionKey =
      await SeedlessOnboardingController.loadKeyringEncryptionKey();
    await KeyringController.submitEncryptionKey(keyringEncryptionKey);
    await KeyringController.changePassword(password);
  }

  await completeSeedlessPasswordChangeKeySync();
};

export const applySeedlessUnlockRecovery = async (
  password: string,
): Promise<boolean> => {
  if (!selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    return false;
  }

  const instruction =
    await Engine.context.SeedlessOnboardingController.resolvePasswordSyncState({
      skipCache: true,
    });

  if (instruction === PasswordSyncInstruction.InSync) {
    return false;
  }

  // reconcilePassword must run before the Keyring branch: after a process
  // restart the local Seedless vault is locked, and this call (idempotent)
  // unlocks it so loadKeyringEncryptionKey/storeKeyringEncryptionKey work.
  const keyringInstruction =
    await Engine.context.SeedlessOnboardingController.reconcilePassword({
      globalPassword: password,
    });

  switch (keyringInstruction) {
    case PasswordSyncInstruction.InSync:
      break;
    case PasswordSyncInstruction.ReconcileKeyring:
      await reconcileLocalKeyring(password);
      break;
    case PasswordSyncInstruction.SyncKey:
      // The Keyring is still locked at unlock; exporting its key needs it unlocked.
      await Engine.context.KeyringController.submitPassword(password);
      await completeSeedlessPasswordChangeKeySync();
      break;
    case PasswordSyncInstruction.PasswordOutdated:
      throw new Error(
        'SeedlessOnboardingController - password still outdated after reconcile',
      );
    case PasswordSyncInstruction.WalletResetRequired:
      throw new Error(
        'SeedlessOnboardingController - wallet reset required to recover this device',
      );
    default: {
      const exhaustive: never = keyringInstruction;
      throw new Error(
        `SeedlessOnboardingController - unrecognized password sync instruction: ${exhaustive}`,
      );
    }
  }
  return true;
};
