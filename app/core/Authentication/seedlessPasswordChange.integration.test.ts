import {
  PasswordSyncInstruction,
  SeedlessOnboardingCheckpoint,
  type SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { recreateVaultsWithNewPassword } from '../Vault';
import { applySeedlessUnlockRecovery } from './seedlessPasswordChangeCoordinator';
import {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  setSeedlessPasswordChangeKillAfter,
  type SeedlessPasswordChangeKillAfter,
} from './seedlessPasswordChangeKillSwitch';
import {
  buildSeedlessPasswordChangeHarness,
  FakeKeyringController,
  persistedState,
  type ChangeEncKeyFault,
  type PasswordChangeHarness,
} from '../../../tests/integration/harnesses/seedless/seedlessPasswordChange';

const mockEngine = {
  context: {} as {
    SeedlessOnboardingController?: SeedlessOnboardingController;
    KeyringController?: FakeKeyringController;
  },
  setSelectedAddress: jest.fn(),
};

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngine.context;
    },
    setSelectedAddress: (address: string) =>
      mockEngine.setSelectedAddress(address),
  },
}));

jest.mock('../redux', () => ({
  __esModule: true,
  default: { store: { getState: () => ({}) } },
}));

jest.mock('../../selectors/seedlessOnboardingController', () => ({
  ...jest.requireActual('../../selectors/seedlessOnboardingController'),
  selectSeedlessOnboardingLoginFlow: () => true,
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const OLD_PASSWORD = 'old-password';
const NEW_PASSWORD = 'new-password';
const LATEST_PASSWORD = 'latest-password';
const PRIMARY_SRP = new Uint8Array(64).fill(1);

const useEngine = (
  controller: SeedlessOnboardingController,
  keyring: FakeKeyringController,
) => {
  mockEngine.context.SeedlessOnboardingController = controller;
  mockEngine.context.KeyringController = keyring;
};

const createWallet = async () => {
  const harness = buildSeedlessPasswordChangeHarness();
  const install = harness.newInstall();
  await install.signIn();
  await install.controller.createToprfKeyAndBackupSeedPhrase(
    OLD_PASSWORD,
    PRIMARY_SRP,
    'keyring-1',
  );
  const keyring = new FakeKeyringController(OLD_PASSWORD);
  await install.controller.storeKeyringEncryptionKey(
    await keyring.exportEncryptionKey(),
  );
  useEngine(install.controller, keyring);
  return { harness, controller: install.controller, keyring };
};

const changePassword = () =>
  recreateVaultsWithNewPassword(OLD_PASSWORD, NEW_PASSWORD, '0x1');

const restart = (
  harness: PasswordChangeHarness,
  controller: SeedlessOnboardingController,
  keyring: FakeKeyringController,
) => {
  const next = harness.newInstall(persistedState(controller)).controller;
  keyring.lock();
  useEngine(next, keyring);
  return next;
};

const unlock = async (keyring: FakeKeyringController, password: string) => {
  const recovered = await applySeedlessUnlockRecovery(password);
  await keyring.submitPassword(password);
  return recovered;
};

describe('seedless password change: fault, restart, unlock', () => {
  afterEach(() => {
    setSeedlessPasswordChangeKillAfter(undefined);
    jest.restoreAllMocks();
  });

  it('stays on the old password when the SSS store fails', async () => {
    const { harness, controller, keyring } = await createWallet();
    harness.backend.nextChangeEncKeyFault = 'sss_store_fails';

    await expect(changePassword()).rejects.toThrow();
    const restarted = restart(harness, controller, keyring);
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });
    const recovered = await unlock(keyring, OLD_PASSWORD);

    expect(instruction).toBe(PasswordSyncInstruction.InSync);
    expect(recovered).toBe(false);
    expect(keyring.isUnlocked).toBe(true);
    expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
  });

  describe.each<{ fault: ChangeEncKeyFault }>([
    { fault: 'metadata_set_fails_after_sss_ok' },
    { fault: 'change_enc_key_times_out' },
  ])('$fault', ({ fault }) => {
    it('recovers on the new password from REMOTE_PASSWORD_PENDING', async () => {
      const { harness, controller, keyring } = await createWallet();
      harness.backend.nextChangeEncKeyFault = fault;

      await expect(changePassword()).rejects.toThrow();
      const restarted = restart(harness, controller, keyring);
      const checkpoint = restarted.state.seedlessOperationLifecycle?.checkpoint;
      const instruction = await restarted.resolvePasswordSyncState({
        skipCache: true,
      });
      const recovered = await unlock(keyring, NEW_PASSWORD);

      expect(checkpoint).toBe(
        SeedlessOnboardingCheckpoint.RemotePasswordPending,
      );
      expect(instruction).toBe(PasswordSyncInstruction.PasswordOutdated);
      expect(recovered).toBe(true);
      expect(keyring.isUnlocked).toBe(true);
      expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
      expect(await restarted.loadKeyringEncryptionKey()).toBe(
        await keyring.exportEncryptionKey(),
      );
    });
  });

  it('recovers on the new password when the local Seedless vault rewrite fails', async () => {
    const { harness, controller, keyring } = await createWallet();
    harness.encryptor.encryptWithDetail.mockRejectedValueOnce(
      new Error('Vault rewrite failed'),
    );

    await expect(changePassword()).rejects.toThrow();
    const restarted = restart(harness, controller, keyring);
    const checkpoint = restarted.state.seedlessOperationLifecycle?.checkpoint;
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });
    const recovered = await unlock(keyring, NEW_PASSWORD);

    expect(checkpoint).toBe(SeedlessOnboardingCheckpoint.LocalStatePending);
    expect(instruction).toBe(PasswordSyncInstruction.PasswordOutdated);
    expect(recovered).toBe(true);
    expect(keyring.isUnlocked).toBe(true);
    expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
  });

  it('recovers on the new password when the Keyring change fails', async () => {
    const { harness, controller, keyring } = await createWallet();
    keyring.changePassword.mockRejectedValueOnce(
      new Error('Keyring change failed'),
    );

    await expect(changePassword()).rejects.toThrow();
    const restarted = restart(harness, controller, keyring);
    const checkpoint = restarted.state.seedlessOperationLifecycle?.checkpoint;
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });
    const recovered = await unlock(keyring, NEW_PASSWORD);

    expect(checkpoint).toBe(SeedlessOnboardingCheckpoint.LocalPasswordPending);
    expect(instruction).toBe(PasswordSyncInstruction.ReconcileKeyring);
    expect(recovered).toBe(true);
    expect(keyring.isUnlocked).toBe(true);
    expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
  });

  it('recovers on the new password when the Keyring key store fails', async () => {
    const { harness, controller, keyring } = await createWallet();
    jest
      .spyOn(controller, 'storeKeyringEncryptionKey')
      .mockRejectedValueOnce(new Error('Keyring key store failed'));

    await expect(changePassword()).rejects.toThrow();
    const restarted = restart(harness, controller, keyring);
    const checkpoint = restarted.state.seedlessOperationLifecycle?.checkpoint;
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });
    const recovered = await unlock(keyring, NEW_PASSWORD);

    expect(checkpoint).toBe(SeedlessOnboardingCheckpoint.KeySyncPending);
    expect(instruction).toBe(PasswordSyncInstruction.SyncKey);
    expect(recovered).toBe(true);
    expect(keyring.isUnlocked).toBe(true);
    expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
    expect(await restarted.loadKeyringEncryptionKey()).toBe(
      await keyring.exportEncryptionKey(),
    );
  });

  it('recovers on the latest password when another device changes it after the Keyring change fails', async () => {
    const { harness, controller, keyring } = await createWallet();
    keyring.changePassword.mockRejectedValueOnce(
      new Error('Keyring change failed'),
    );

    await expect(changePassword()).rejects.toThrow();
    harness.backend.changePasswordOnAnotherDevice(LATEST_PASSWORD);
    const restarted = restart(harness, controller, keyring);
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });
    const recovered = await unlock(keyring, LATEST_PASSWORD);

    expect(instruction).toBe(PasswordSyncInstruction.PasswordOutdated);
    expect(recovered).toBe(true);
    expect(keyring.isUnlocked).toBe(true);
    expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
  });

  it('requires a wallet reset when another device changes the password at KEY_SYNC_PENDING', async () => {
    const { harness, controller, keyring } = await createWallet();
    setSeedlessPasswordChangeKillAfter(
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
    );

    await expect(changePassword()).rejects.toThrow();
    setSeedlessPasswordChangeKillAfter(undefined);
    harness.backend.changePasswordOnAnotherDevice(LATEST_PASSWORD);
    const restarted = restart(harness, controller, keyring);
    const instruction = await restarted.resolvePasswordSyncState({
      skipCache: true,
    });

    expect(instruction).toBe(PasswordSyncInstruction.WalletResetRequired);
    await expect(applySeedlessUnlockRecovery(LATEST_PASSWORD)).rejects.toThrow(
      'SeedlessOnboardingController - wallet reset required to recover this device',
    );
    expect(keyring.isUnlocked).toBe(false);
    expect(restarted.state.seedlessOperationLifecycle?.checkpoint).toBe(
      SeedlessOnboardingCheckpoint.KeySyncPending,
    );
  });

  describe.each<{
    hop: SeedlessPasswordChangeKillAfter;
    checkpoint: SeedlessOnboardingCheckpoint;
    instruction: PasswordSyncInstruction;
  }>([
    {
      hop: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.SeedlessChangePassword,
      checkpoint: SeedlessOnboardingCheckpoint.LocalPasswordPending,
      instruction: PasswordSyncInstruction.ReconcileKeyring,
    },
    {
      hop: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
      checkpoint: SeedlessOnboardingCheckpoint.LocalPasswordPending,
      instruction: PasswordSyncInstruction.ReconcileKeyring,
    },
    {
      hop: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
      checkpoint: SeedlessOnboardingCheckpoint.KeySyncPending,
      instruction: PasswordSyncInstruction.SyncKey,
    },
  ])('app killed at $hop', ({ hop, checkpoint, instruction }) => {
    it('recovers on the new password after a restart', async () => {
      const { harness, controller, keyring } = await createWallet();
      setSeedlessPasswordChangeKillAfter(hop);

      await expect(changePassword()).rejects.toThrow(
        `SEEDLESS_E2E_KILL_HALT:${hop}`,
      );
      setSeedlessPasswordChangeKillAfter(undefined);
      const restarted = restart(harness, controller, keyring);
      const persisted = restarted.state.seedlessOperationLifecycle?.checkpoint;
      const resolved = await restarted.resolvePasswordSyncState({
        skipCache: true,
      });
      const recovered = await unlock(keyring, NEW_PASSWORD);

      expect(persisted).toBe(checkpoint);
      expect(resolved).toBe(instruction);
      expect(recovered).toBe(true);
      expect(keyring.isUnlocked).toBe(true);
      expect(restarted.state.seedlessOperationLifecycle).toBeUndefined();
      expect(await restarted.loadKeyringEncryptionKey()).toBe(
        await keyring.exportEncryptionKey(),
      );
    });
  });
});
