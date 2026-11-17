import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  SecretMetadata,
  SecretType,
} from '@metamask/seedless-onboarding-controller';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import type { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import {
  PasswordlessRecoveryError,
  recoverWalletWithoutPassword,
} from './passwordlessSocialRecovery';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
  verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
};

const NEW_PASSWORD = 'new-password';

function recoveredSecrets(): SecretMetadata[] {
  return [
    new SecretMetadata(new Uint8Array([1, 2, 3]), {
      type: SecretType.Mnemonic,
    }),
  ];
}

function createService() {
  const calls: string[] = [];
  const secrets: { read?: Uint8Array; seen?: Uint8Array } = {};
  return {
    calls,
    secrets,
    findRecoveryIdentifier: jest.fn(async () => PASSKEY),
    readRecoverySecret: jest.fn(async (_identifier: Identifier) => {
      calls.push('readRecoverySecret');
      const recoverySecret = new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9);
      secrets.read = recoverySecret;
      return { epoch: 1, recoverySecret };
    }),
    openRecoverySession: jest.fn(async () => {
      calls.push('openRecoverySession');
    }),
    recoverWithRecoverySecret: jest.fn(async (recoverySecret: Uint8Array) => {
      calls.push('recoverWithRecoverySecret');
      secrets.seen = new Uint8Array(recoverySecret);
      return recoveredSecrets();
    }),
    setLocalPassword: jest.fn(async (_password: string) => {
      calls.push('setLocalPassword');
    }),
    resetGlobalPassword: jest.fn(async (_newPassword: string) => {
      calls.push('resetPasswordWithVaultKeys');
    }),
  };
}

const asService = (
  fake: ReturnType<typeof createService>,
): MfaRecoveryService => fake as unknown as MfaRecoveryService;

describe('recoverWalletWithoutPassword', () => {
  it('recovers the secrets, sets the new password, then restores the vault', async () => {
    const fake = createService();
    const restoreVault = jest.fn(async () => undefined);

    await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    });

    expect(fake.readRecoverySecret).toHaveBeenCalledWith(PASSKEY);
    expect(fake.openRecoverySession).toHaveBeenCalledTimes(1);
    expect(fake.secrets.seen).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
    );
    expect(fake.setLocalPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    expect(fake.resetGlobalPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    expect(restoreVault).toHaveBeenCalledWith(NEW_PASSWORD, [
      expect.objectContaining({ type: SecretType.Mnemonic }),
    ]);
    expect(fake.calls).toStrictEqual([
      'readRecoverySecret',
      'openRecoverySession',
      'recoverWithRecoverySecret',
      'setLocalPassword',
      'resetPasswordWithVaultKeys',
    ]);
  });

  it('zeroes the Recovery Secret it read once the vault is recovered', async () => {
    const fake = createService();

    await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault: jest.fn(async () => undefined),
    });

    expect(fake.secrets.read).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(0),
    );
  });

  it('uses a prefetched Recovery Secret without reading escrow, then zeroes it', async () => {
    const fake = createService();
    const restoreVault = jest.fn(async () => undefined);
    const prefetched = new Uint8Array(RECOVERY_SECRET_LENGTH).fill(3);

    await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
      recoverySecret: prefetched,
    });

    expect(fake.readRecoverySecret).not.toHaveBeenCalled();
    expect(fake.openRecoverySession).toHaveBeenCalledTimes(1);
    expect(fake.secrets.seen).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(3),
    );
    expect(prefetched).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(0),
    );
    expect(restoreVault).toHaveBeenCalled();
  });

  it('reports recovering_secrets at reading_secret when the escrow read fails', async () => {
    const fake = createService();
    fake.readRecoverySecret.mockRejectedValue(
      Object.assign(new Error('read failed'), { code: 'read_failed' }),
    );
    const restoreVault = jest.fn();

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PasswordlessRecoveryError);
    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      code: 'read_failed',
      detail: 'reading_secret; Error: read failed',
    });
    expect(fake.setLocalPassword).not.toHaveBeenCalled();
    expect(restoreVault).not.toHaveBeenCalled();
  });

  it('reports opening_session and zeroes the secret when the session fails', async () => {
    const fake = createService();
    fake.openRecoverySession.mockRejectedValue(new Error('session failed'));

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault: jest.fn(),
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      detail: 'opening_session; Error: session failed',
    });
    expect(fake.recoverWithRecoverySecret).not.toHaveBeenCalled();
    expect(fake.secrets.read).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(0),
    );
  });

  it('reports recovering_vault when the TOPRF recovery fails', async () => {
    const fake = createService();
    fake.recoverWithRecoverySecret.mockRejectedValue(
      new Error('recover failed'),
    );

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault: jest.fn(),
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      detail: 'recovering_vault; Error: recover failed',
    });
    expect(fake.secrets.read).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(0),
    );
  });

  it('reports setting_password at setting_local_password and skips the vault', async () => {
    const fake = createService();
    fake.setLocalPassword.mockRejectedValue(new Error('password rejected'));
    const restoreVault = jest.fn();

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'setting_password',
      detail: 'setting_local_password; Error: password rejected',
    });
    expect(fake.resetGlobalPassword).not.toHaveBeenCalled();
    expect(restoreVault).not.toHaveBeenCalled();
  });

  it('reports setting_password at resetting_global_password', async () => {
    const fake = createService();
    fake.resetGlobalPassword.mockRejectedValue(new Error('reset failed'));
    const restoreVault = jest.fn();

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'setting_password',
      detail: 'resetting_global_password; Error: reset failed',
    });
    expect(restoreVault).not.toHaveBeenCalled();
  });

  it('reports restoring_vault after the new password is already set', async () => {
    const fake = createService();
    const restoreVault = jest.fn().mockRejectedValue(new Error('vault failed'));

    const error = await recoverWalletWithoutPassword(asService(fake), {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'restoring_vault',
      detail: 'restoring_vault; Error: vault failed',
    });
    expect(fake.resetGlobalPassword).toHaveBeenCalled();
  });
});
